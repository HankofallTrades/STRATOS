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
    /// `set-completed` or `set-adjusted`, per `StratosActivityJournalKind`.
    let kind: String
    /// How the set is performed, carried from the plan entry it was logged from.
    let setKind: String
    let setId: String
    let workoutExerciseId: String
    /// When the button was pressed, ISO-8601.
    let at: String
    /// What the lock screen was showing when the button was pressed.
    let target: StratosSetTarget

    init(completing set: StratosPlannedSet, target: StratosSetTarget, at date: Date = Date()) {
        self.init(kind: StratosActivityJournalKind.completed, set: set, target: target, at: date)
    }

    /// A stepper tap. It records where the numbers were left, not how far they
    /// moved: the user agreed to a target, and a delta would have to be applied
    /// to something on the far side to mean anything.
    init(adjusting set: StratosPlannedSet, to target: StratosSetTarget, at date: Date = Date()) {
        self.init(kind: StratosActivityJournalKind.adjusted, set: set, target: target, at: date)
    }

    private init(
        kind: String,
        set: StratosPlannedSet,
        target: StratosSetTarget,
        at date: Date
    ) {
        self.id = UUID().uuidString
        self.kind = kind
        self.setKind = set.kind
        self.setId = set.setId
        self.workoutExerciseId = set.workoutExerciseId
        self.at = ISO8601DateFormatter().string(from: date)
        self.target = target
    }

    /// Whether this entry says the set was logged, as opposed to merely
    /// re-numbered. Every "has this set been dealt with" question turns on it,
    /// and reading it as "the journal mentions this set" would make the first
    /// stepper tap spend the Done button.
    var isCompletion: Bool { kind == StratosActivityJournalKind.completed }
}

/// What a journal entry can be. Mirrors `ActivityJournalEntryKind` in
/// `src/domains/fitness/data/activityJournal.ts`.
enum StratosActivityJournalKind {
    static let completed = "set-completed"
    static let adjusted = "set-adjusted"
}

/// The keys carry the shape they were written in. Changing a stored type is
/// therefore a key bump, because the alternative is worse: a decode of the old
/// shape fails whole, the store reads as empty, and an un-replayed Done tap is
/// gone with nothing said. Bumping loses the same data but loses it on purpose,
/// on a build that knows why. There is one user and one device, so the cost is
/// at most the sets logged on a lock screen that was never reopened before the
/// update.
private enum StratosActivityStoredShape {
    /// v3: the plan entry gained an `adjustment` the Done button cannot do
    /// without, and the journal gained adjustment entries (I-20).
    static let plan = "stratos.liveActivity.setPlan.v3"
    static let journal = "stratos.liveActivity.journal.v3"
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
    private static let planKey = StratosActivityStoredShape.plan
    private static let journalKey = StratosActivityStoredShape.journal

    /// Serialises the journal's read-modify-write pairs.
    ///
    /// A `LiveActivityIntent` runs in the app's own process, but nothing
    /// promises the system runs two of them one after the other, and each
    /// append is a whole decode-append-encode cycle. Two that overlap both read
    /// the same journal and the second write wins, which loses a set the user
    /// watched the lock screen accept. Static because the store is a struct
    /// built wherever it is needed: a per-instance queue would serialise
    /// nothing.
    ///
    /// Plain reads stay off it. They cannot lose anything, and a `plan()` from
    /// the widget has no business waiting behind a Done tap.
    private static let writes = DispatchQueue(label: "com.stratos.activityStore.writes")

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
        Self.writes.sync {
            encode(journal() + [entry], forKey: Self.journalKey)
        }
    }

    /// Drops every entry up to and including `id`, and keeps the rest.
    ///
    /// The web names the last entry it replayed rather than clearing the lot,
    /// because a Done tap can land between the read and the clear. An `id` that
    /// is no longer here has already been cleared, so nothing happens.
    ///
    /// Adjustments go with the rest. A replayed adjustment is written into the
    /// set itself, and `buildSetPlan` targets the set's own numbers ahead of
    /// any suggestion, so the next sync carries them back here (I-44). Holding
    /// the entry past the clear would instead make the lock screen outrank an
    /// in-app edit to the same set.
    /// Runs on the write queue with the read, so an append that lands
    /// mid-clear is either wholly before it — and named by the replay, so
    /// dropped on purpose — or wholly after, and survives it. Read outside the
    /// queue, the clear would write back a journal that never saw the append.
    func clearJournal(throughId id: String) {
        Self.writes.sync {
            let entries = journal()
            guard let index = entries.firstIndex(where: { $0.id == id }) else { return }

            encode(Array(entries[entries.index(after: index)...]), forKey: Self.journalKey)
        }
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
        let logged = Set(journal.filter(\.isCompletion).map(\.setId))
        // The fallback can hand back a set that *is* logged. That is the point
        // — the lock screen holds on the last set rather than going blank — so
        // callers must not read "current" as "still open".
        return plan.first { !$0.completed && !logged.contains($0.setId) } ?? plan.last
    }

    /// The numbers the lock screen should be showing for a set: what the plan
    /// resolved, moved by whatever its steppers have been tapped to since.
    ///
    /// The last entry naming the set wins, because each one records where the
    /// numbers were left rather than how far they moved. A completion is read
    /// the same way as an adjustment here — it too is a record of what was on
    /// screen — so a logged set goes on showing what was logged.
    static func target(
        for set: StratosPlannedSet,
        journal: [StratosActivityJournalEntry]
    ) -> StratosSetTarget {
        journal.last { $0.setId == set.setId }?.target ?? set.target
    }

    static func contentState(
        plan: [StratosPlannedSet],
        journal: [StratosActivityJournalEntry]
    ) -> StratosSetActivityAttributes.ContentState? {
        guard let current = current(plan: plan, journal: journal) else { return nil }

        return .init(
            current: current,
            target: target(for: current, journal: journal),
            totalSets: plan.count,
            isLogged: current.completed
                || journal.contains { $0.setId == current.setId && $0.isCompletion }
        )
    }
}
