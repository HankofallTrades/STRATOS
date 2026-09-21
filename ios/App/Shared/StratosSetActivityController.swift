import ActivityKit
import Foundation
import OSLog

private let log = Logger(subsystem: "com.daimodus.stratos", category: "LiveActivity")

/// Starts, updates and ends the running-workout Live Activity, and records what
/// the Done button did.
///
/// Whether an activity already exists is native state, so the webview does not
/// get a start/update split to reason about: it syncs a Set Plan and this
/// decides. Beyond the cursor walk in `StratosActivityCursor` there is no logic
/// here — what the lock screen says was settled in the fitness domain before it
/// crossed the bridge.
enum StratosSetActivityController {
    /// Shows whatever the stored plan and journal currently add up to.
    static func refresh() async {
        let store = StratosActivityStore()
        guard let state = StratosActivityCursor.contentState(
            plan: store.plan(),
            journal: store.journal()
        ) else {
            await end()
            return
        }

        await present(state)
    }

    /// Records a Done tap and moves the lock screen to the next set.
    ///
    /// The tapped set is named by the button rather than taken as "whatever is
    /// current", so a second tap on a stale render — the activity has advanced
    /// but the button the finger landed on had not redrawn — logs nothing
    /// instead of logging the next set by accident.
    static func completeSet(setId: String) async {
        let store = StratosActivityStore()
        let plan = store.plan()
        let journal = store.journal()

        // `current` holds on the last set once the plan is exhausted, so the
        // last two checks are not redundant with the cursor's own filter: they
        // are what stops a Done tap on a set that is already logged.
        guard let current = StratosActivityCursor.current(plan: plan, journal: journal),
              current.setId == setId,
              current.loggable,
              !current.completed,
              !journal.contains(where: { $0.setId == setId }) else {
            log.notice("Done pressed for a set that is no longer current; ignoring")
            return
        }

        store.append(StratosActivityJournalEntry(completing: current))
        await refresh()
    }

    static func end() async {
        for activity in Activity<StratosSetActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    private static func present(_ state: StratosSetActivityAttributes.ContentState) async {
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
            log.error("could not start the activity — \(String(describing: error))")
        }
    }
}
