import Capacitor
import Foundation

/// The bridge between the webview and the running-workout Live Activity.
///
/// Marshalling only. The Set Plan arrives fully resolved, is stored for the Done
/// button to walk while the webview is suspended, and the Activity Journal goes
/// back the other way when the app wakes up. Deciding what any of it means
/// belongs to the fitness domain on the web side.
@objc(StratosLiveActivityPlugin)
public class StratosLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StratosLiveActivityPlugin"
    public let jsName = "StratosLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "journal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearJournal", returnType: CAPPluginReturnPromise)
    ]

    private let store = StratosActivityStore()

    override public func load() {
        // A Live Activity outlives the process that started it, and nothing
        // native knows whether the workout behind it still exists. A fresh
        // launch therefore clears the slate rather than risk the lock screen
        // showing a session that is over; a workout still in progress syncs a
        // new activity as soon as its screen mounts.
        //
        // Two things are deliberately *not* cleared. The journal, because
        // surviving a kill is the whole point of it: those entries are sets the
        // user logged and has not seen land yet. And the plan, because a Done
        // tap launches this app in the background to run the intent — clearing
        // the plan here would race that intent and leave it with nothing to log,
        // which is precisely the first tap after a kill.
        //
        // A non-empty journal is also what tells us this activity is not stale
        // at all: the user was pressing its button moments ago, so it stays up
        // and the foreground replay settles it.
        Task {
            guard StratosActivityStore().journal().isEmpty else { return }
            await StratosSetActivityController.end()
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let plan = decodePlan(call.options["plan"]) else {
            call.reject("StratosLiveActivity.sync needs a plan")
            return
        }

        store.save(plan: plan)
        Task {
            await StratosSetActivityController.refresh()
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        store.clearPlan()
        Task {
            await StratosSetActivityController.end()
            call.resolve()
        }
    }

    @objc func journal(_ call: CAPPluginCall) {
        call.resolve(["entries": store.journal().compactMap(\.bridgePayload)])
    }

    @objc func clearJournal(_ call: CAPPluginCall) {
        guard let throughId = call.getString("throughId") else {
            call.reject("StratosLiveActivity.clearJournal needs a throughId")
            return
        }

        store.clearJournal(throughId: throughId)
        call.resolve()
    }

    /// Reads the Set Plan off the bridge.
    ///
    /// Round-tripping through `JSONSerialization` rather than unpacking the
    /// fields by hand: the plan is plain JSON on both sides, and a hand-written
    /// guard here would be one more place to remember when a field is added. A
    /// plan that does not decode is a programming error on the web side, so it
    /// is refused rather than half-read into a lock screen that would then
    /// present the gaps as real.
    private func decodePlan(_ raw: Any?) -> [StratosPlannedSet]? {
        guard let raw, JSONSerialization.isValidJSONObject(raw),
              let data = try? JSONSerialization.data(withJSONObject: raw) else {
            return nil
        }
        return try? JSONDecoder().decode([StratosPlannedSet].self, from: data)
    }
}

private extension StratosActivityJournalEntry {
    /// The entry as the webview's `ActivityJournalEntry` expects it.
    ///
    /// The mirror of `decodePlan`: one encode rather than a field list, so
    /// adding a field to the entry cannot leave a hand-written line behind that
    /// silently drops it. Absent targets still cross as explicit nulls —
    /// `StratosSetTarget` encodes them that way, which is what the replay's
    /// refusal rules need.
    ///
    /// An entry that will not encode is dropped rather than half-sent: a
    /// partial entry would replay as a set logged with numbers the user never
    /// saw.
    var bridgePayload: [String: Any]? {
        guard let data = try? JSONEncoder().encode(self),
              let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return payload
    }
}
