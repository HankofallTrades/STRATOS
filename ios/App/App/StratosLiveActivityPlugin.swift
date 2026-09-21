import ActivityKit
import Capacitor
import Foundation

/// Starts, updates and ends the running-workout Live Activity.
///
/// Whether an activity already exists is native state, so the webview does not
/// get a start/update split to reason about: it syncs a state and this
/// decides. Beyond that decision there is no logic here — what the lock screen
/// says is settled in the fitness domain before it crosses the bridge.
@objc(StratosLiveActivityPlugin)
public class StratosLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StratosLiveActivityPlugin"
    public let jsName = "StratosLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        // A Live Activity outlives the process that started it, and nothing
        // native knows whether the workout behind it still exists. A fresh
        // launch therefore clears the slate rather than risk the lock screen
        // showing a session that is over; a workout still in progress syncs a
        // new activity as soon as its screen mounts.
        Task { await StratosSetActivityController.end() }
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let payload = call.getObject("state"),
              let state = StratosSetActivityAttributes.ContentState(payload: payload) else {
            call.reject("StratosLiveActivity.sync needs a state")
            return
        }

        Task {
            await StratosSetActivityController.sync(state)
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        Task {
            await StratosSetActivityController.end()
            call.resolve()
        }
    }
}

enum StratosSetActivityController {
    static func sync(_ state: StratosSetActivityAttributes.ContentState) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        if let activity = Activity<StratosSetActivityAttributes>.activities.first {
            await activity.update(ActivityContent(state: state, staleDate: nil))
            return
        }

        do {
            _ = try Activity.request(
                attributes: StratosSetActivityAttributes(),
                content: ActivityContent(state: state, staleDate: nil),
                pushType: nil
            )
        } catch {
            CAPLog.print("StratosLiveActivity: could not start the activity — \(error)")
        }
    }

    static func end() async {
        for activity in Activity<StratosSetActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}

private extension StratosSetActivityAttributes.ContentState {
    /// Marshals one `LiveActivityState` off the bridge. Its fields are restated in
    /// four places with no compiler link between them — the TypeScript type, its
    /// equality check, `ContentState` above, and this guard — so a new field means
    /// four edits. A missing required
    /// field is a programming error on the web side, so it fails rather than
    /// filling in a default the lock screen would then present as real.
    init?(payload: JSObject) {
        guard let exerciseName = payload["exerciseName"] as? String,
              let kind = (payload["kind"] as? String).flatMap(Kind.init(rawValue:)),
              let setNumber = (payload["setNumber"] as? NSNumber)?.intValue,
              let position = (payload["position"] as? NSNumber)?.intValue,
              let totalSets = (payload["totalSets"] as? NSNumber)?.intValue else {
            return nil
        }

        self.init(
            exerciseName: exerciseName,
            kind: kind,
            setNumber: setNumber,
            position: position,
            totalSets: totalSets,
            suggestedReps: (payload["suggestedReps"] as? NSNumber)?.intValue,
            suggestedWeight: (payload["suggestedWeight"] as? NSNumber)?.doubleValue,
            suggestedTimeSeconds: (payload["suggestedTimeSeconds"] as? NSNumber)?.intValue
        )
    }
}
