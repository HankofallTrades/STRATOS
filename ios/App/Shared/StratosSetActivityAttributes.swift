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
/// What a lock-screen stepper may do to a target. Mirrors `SetAdjustment` in
/// `src/domains/fitness/data/setAdjustment.ts`.
///
/// Both halves arrive resolved. The step a tap produces is the app's rule about
/// how weight and reps move — the in-app stepper obeys the same one — and a
/// constant here would be a second answer to it. The floor is the loggability
/// rule seen from the other end: stepping a set down to zero reps would leave a
/// Done button that the replay refuses.
struct StratosSetAdjustment: Codable, Hashable {
    /// What one tap adds, or subtracts. `nil` means the field has no stepper.
    let step: StratosSetTarget
    /// The lowest value a field may be stepped down to.
    let floor: StratosSetTarget

    /// The target a stepper tap produces.
    ///
    /// This is the same arithmetic as `adjustSetTarget` in
    /// `src/domains/fitness/data/setAdjustment.ts`, which is where it is stated
    /// and tested. It has to exist here too because the tap lands on a locked
    /// phone, with the webview suspended and unable to answer what the new
    /// number is. The two must agree.
    ///
    /// A field with no step, or no target to step from, comes back untouched: a
    /// tap that cannot mean anything does nothing rather than starting a number
    /// from zero.
    func applied(
        to target: StratosSetTarget,
        field: String,
        direction: Int
    ) -> StratosSetTarget {
        StratosSetTarget(
            reps: field == StratosSetTargetField.reps
                ? stepped(target.reps, by: step.reps, floor: floor.reps, direction: direction)
                : target.reps,
            weight: field == StratosSetTargetField.weight
                ? stepped(target.weight, by: step.weight, floor: floor.weight, direction: direction)
                : target.weight,
            timeSeconds: field == StratosSetTargetField.timeSeconds
                ? stepped(target.timeSeconds, by: step.timeSeconds, floor: floor.timeSeconds, direction: direction)
                : target.timeSeconds,
            distanceKm: field == StratosSetTargetField.distanceKm
                ? stepped(target.distanceKm, by: step.distanceKm, floor: floor.distanceKm, direction: direction)
                : target.distanceKm
        )
    }
}

/// The field a stepper tap names, as it crosses from the button into the intent.
/// A raw string because that is what an `AppIntent` parameter carries, and
/// because these are `SetTarget`'s own field names on the other side.
enum StratosSetTargetField {
    static let reps = "reps"
    static let weight = "weight"
    static let timeSeconds = "timeSeconds"
    static let distanceKm = "distanceKm"
}

private func stepped(_ current: Int?, by step: Int?, floor: Int?, direction: Int) -> Int? {
    guard let current, let step else { return current }
    return max(floor ?? 0, current + step * direction)
}

private func stepped(_ current: Double?, by step: Double?, floor: Double?, direction: Int) -> Double? {
    guard let current, let step else { return current }
    // Rounded rather than left raw: the steps are halves and kilos, and
    // repeated taps must not drift an 82.5 into an 82.49999999999999.
    let next = ((current + step * Double(direction)) * 100).rounded() / 100
    return max(floor ?? 0, next)
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
    /// What the steppers may do to that target, resolved on the web too.
    let adjustment: StratosSetAdjustment
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
        /// What the lock screen is showing now: `current.target` as the plan
        /// resolved it, moved by whatever the steppers have been tapped to
        /// since. It is a separate field rather than an edited `current`
        /// because the plan's own number is what a re-sync overwrites, and
        /// losing track of which is which is how a user's adjustment reverts.
        var target: StratosSetTarget
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
