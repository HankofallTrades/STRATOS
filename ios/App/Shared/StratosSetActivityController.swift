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
private extension StratosActivityStore {
    /// The set a lock-screen button may still act on.
    ///
    /// The button names the set it was drawn for rather than meaning "whatever
    /// is current", so a tap landing on a render the activity has moved past
    /// does nothing instead of hitting the next set by accident.
    ///
    /// `current` holds on the last set once the plan is exhausted, so the last
    /// two checks are not redundant with the cursor's own filter: they are what
    /// stops a tap on a set that is already logged.
    ///
    /// The journal is passed in rather than read again: the caller needs the
    /// same one to resolve the target, and two reads could straddle a write.
    func openSet(
        setId: String,
        journal: [StratosActivityJournalEntry]
    ) -> StratosPlannedSet? {
        guard let current = StratosActivityCursor.current(plan: plan(), journal: journal),
              current.setId == setId,
              current.loggable,
              !current.completed,
              !journal.contains(where: { $0.setId == setId && $0.isCompletion }) else {
            return nil
        }
        return current
    }
}

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
        let journal = store.journal()

        guard let current = store.openSet(setId: setId, journal: journal) else {
            log.notice("Done pressed for a set that is no longer current; ignoring")
            return
        }

        // What was on screen when the finger landed, steppers included. Not the
        // plan's own target: that is the suggestion, and the whole point of the
        // steppers is that the set did not go that way.
        let target = StratosActivityCursor.target(for: current, journal: journal)

        store.append(StratosActivityJournalEntry(completing: current, target: target))
        await refresh()
    }

    /// Records a stepper tap and redraws the lock screen with the new number.
    ///
    /// The arithmetic is the plan's, not this file's: the step and the floor
    /// both crossed the bridge with the set. All that happens here is the
    /// journalling, so that a number the user changed survives the phone being
    /// put back in a pocket.
    static func adjustSet(setId: String, field: String, direction: Int) async {
        let store = StratosActivityStore()
        let journal = store.journal()

        guard let current = store.openSet(setId: setId, journal: journal) else {
            log.notice("a stepper was tapped for a set that is no longer current; ignoring")
            return
        }

        let target = StratosActivityCursor.target(for: current, journal: journal)
        let adjusted = current.adjustment.applied(
            to: target,
            field: field,
            direction: direction
        )

        // A tap at the floor, or on a field with no step. Nothing changed, so
        // there is nothing to record: journalling it would grow the journal for
        // as long as a finger stayed on the button and replay the same numbers.
        //
        // It is said out loud all the same. Reaching the floor is expected and
        // silent by design on screen, but a field name the plan has no step for
        // lands here too, and that one is a bug this is the only trace of.
        guard adjusted != target else {
            log.notice("\(field, privacy: .public) did not move; nothing to record")
            return
        }

        store.append(StratosActivityJournalEntry(adjusting: current, to: adjusted))
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
