import Foundation

/// One thing the user did on the lock screen. Mirrors `ActivityJournalEntry` in
/// `src/domains/fitness/data/activityJournal.ts`.
///
/// It records that a button was pressed and what the lock screen was showing
/// when it was — nothing more. What that is worth as a logged set is decided on
/// the web side, by the same rule the checkbox goes through. The native side is
/// not a second workout state and must never start deciding.
struct StratosActivityJournalEntry: Codable, Hashable {
    let id: String
    /// `set-completed`. Adjusting reps and weight (I-20) joins this later.
    let kind: String
    /// How the set is performed, carried from the plan entry it was logged from.
    let setKind: String
    let setId: String
    let workoutExerciseId: String
    /// When the button was pressed, ISO-8601.
    let at: String
    /// What the lock screen was showing when the button was pressed.
    let target: StratosSetTarget

    init(completing set: StratosPlannedSet, at date: Date = Date()) {
        self.id = UUID().uuidString
        self.kind = "set-completed"
        self.setKind = set.kind
        self.setId = set.setId
        self.workoutExerciseId = set.workoutExerciseId
        self.at = ISO8601DateFormatter().string(from: date)
        self.target = set.target
    }
}

/// Where the Set Plan and the Activity Journal live between a locked phone and
/// the next time the webview is awake.
///
/// This is `UserDefaults.standard`, not an App Group, because it does not need
/// to be one: a `LiveActivityIntent` is run by the system **in the app's own
/// process**, so the Done button and the Capacitor plugin are already
/// neighbours. That also keeps the wrap signable by a free Personal Team, which
/// cannot provision an App Group at all (see docs/ios.md). If the button ever
/// stops seeing the plan, this assumption is the first thing to check.
struct StratosActivityStore {
    private static let planKey = "stratos.liveActivity.setPlan"
    private static let journalKey = "stratos.liveActivity.journal"

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func plan() -> [StratosPlannedSet] {
        decode(Self.planKey)
    }

    func save(plan: [StratosPlannedSet]) {
        encode(plan, forKey: Self.planKey)
    }

    func clearPlan() {
        defaults.removeObject(forKey: Self.planKey)
    }

    func journal() -> [StratosActivityJournalEntry] {
        decode(Self.journalKey)
    }

    func append(_ entry: StratosActivityJournalEntry) {
        encode(journal() + [entry], forKey: Self.journalKey)
    }

    /// Drops every entry up to and including `id`, and keeps the rest.
    ///
    /// The web names the last entry it replayed rather than clearing the lot,
    /// because a Done tap can land between the read and the clear. An `id` that
    /// is no longer here has already been cleared, so nothing happens.
    func clearJournal(throughId id: String) {
        let entries = journal()
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        encode(Array(entries[entries.index(after: index)...]), forKey: Self.journalKey)
    }

    private func decode<Value: Decodable>(_ key: String) -> [Value] {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([Value].self, from: data) else {
            return []
        }
        return decoded
    }

    private func encode<Value: Encodable>(_ values: [Value], forKey key: String) {
        guard let data = try? JSONEncoder().encode(values) else { return }
        defaults.set(data, forKey: key)
    }
}

/// Which set of the plan the lock screen is on.
///
/// This is the one thing the native side decides for itself, and it has to:
/// after a Done tap the webview is suspended and cannot be asked what comes
/// next. It is a walk over a plan whose every number was resolved before it
/// crossed the bridge, not a second opinion about any of them.
///
/// The rule is stated on the web too, in `currentLiveActivitySet`, which is what
/// the app shows while it is awake. The two must agree.
enum StratosActivityCursor {
    /// The first set still open. Sets can be logged out of order, so it is the
    /// first gap rather than one past the last completed. When every set is
    /// logged the last one stands: the activity's life is tied to the workout,
    /// not to the plan running out, and going blank mid-session would read as
    /// the app having lost the workout.
    static func current(
        plan: [StratosPlannedSet],
        journal: [StratosActivityJournalEntry]
    ) -> StratosPlannedSet? {
        guard !plan.isEmpty else { return nil }
        let logged = Set(journal.map(\.setId))
        // The fallback can hand back a set that *is* logged. That is the point
        // — the lock screen holds on the last set rather than going blank — so
        // callers must not read "current" as "still open".
        return plan.first { !$0.completed && !logged.contains($0.setId) } ?? plan.last
    }

    static func contentState(
        plan: [StratosPlannedSet],
        journal: [StratosActivityJournalEntry]
    ) -> StratosSetActivityAttributes.ContentState? {
        guard let current = current(plan: plan, journal: journal) else { return nil }

        return .init(
            current: current,
            totalSets: plan.count,
            isLogged: current.completed || journal.contains { $0.setId == current.setId }
        )
    }
}
