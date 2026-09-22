import ActivityKit
import Foundation

/// What logging a set right now would record. Mirrors `SetTarget` in
/// `src/domains/fitness/data/setTarget.ts`, and is the one place these four
/// numbers are named on this side of the bridge: the plan carries it in, the
/// journal carries it back out.
///
/// No compiler spans the two languages, so `setTargetContract.test.ts` reads
/// this declaration and fails when the field sets disagree. Keep the stored
/// properties one per line for it.
struct StratosSetTarget: Codable, Hashable {
    let reps: Int?
    let weight: Double?
    let timeSeconds: Int?
    let distanceKm: Double?

    /// Written out by hand so an absent target crosses as an explicit `null`
    /// rather than a missing key. The synthesised encoding uses
    /// `encodeIfPresent` and would drop it, and the replay's refusal rules turn
    /// on the difference between "no target" and "a target of zero" — a dropped
    /// key reads as the former on a field that held the latter.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeExplicit(reps, forKey: .reps)
        try container.encodeExplicit(weight, forKey: .weight)
        try container.encodeExplicit(timeSeconds, forKey: .timeSeconds)
        try container.encodeExplicit(distanceKm, forKey: .distanceKm)
    }
}
/// One set of the session as the lock screen sees it: what to show, and what a
/// Done button would log. Mirrors `LiveActivitySet` in
/// `src/domains/fitness/data/liveActivityState.ts`.
///
/// `kind` is a raw string rather than an enum on purpose. A running activity
/// outlives the app that started it, so a state encoded by one build can be
/// decoded by another; an unrecognised kind has to fall back to a plain reading
/// rather than fail the whole decode and blank the lock screen.
struct StratosPlannedSet: Codable, Hashable {
    let setId: String
    let workoutExerciseId: String
    let exerciseName: String
    /// `strength`, `time` or `cardio`.
    let kind: String
    /// 1-based index within the current exercise.
    let setNumber: Int
    /// 1-based index across the whole session — the "7" in "set 7 of 12".
    let position: Int
    /// What a Done tap would log, resolved on the web before it got here.
    let target: StratosSetTarget
    let completed: Bool
    /// Whether the set has enough of a target to be logged at all. Decided on
    /// the web, by the rule that would refuse it on reopen — a Done button the
    /// replay will throw away is worse than no button.
    let loggable: Bool
}

/// The shape of the running-workout Live Activity, compiled into both the app
/// and the widget extension so the two cannot drift.
///
/// Only the current set crosses into the activity, not the whole Set Plan: a
/// `ContentState` is pushed through the system on every update and has a hard
/// size limit, which a thirty-set session would run into. The plan itself lives
/// in `StratosActivityStore`, which the Done button reads from the app's own
/// process.
struct StratosSetActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var current: StratosPlannedSet
        var totalSets: Int
        /// Whether this set is already logged — in the workout, or in the
        /// Activity Journal since. It is what decides the Done button is spent,
        /// and the journal half cannot be read off `current.completed`, which
        /// is only as fresh as the last time the app was awake to sync.
        var isLogged: Bool
    }
}

private extension KeyedEncodingContainer {
    /// `encode`, but `nil` becomes a null rather than nothing at all.
    mutating func encodeExplicit<Value: Encodable>(_ value: Value?, forKey key: Key) throws {
        if let value {
            try encode(value, forKey: key)
        } else {
            try encodeNil(forKey: key)
        }
    }
}
