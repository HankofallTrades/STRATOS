import ActivityKit
import Foundation

/// The shape of the running-workout Live Activity, compiled into both the app
/// and the widget extension so the two cannot drift.
///
/// Every field is handed over by the webview from the Set Plan. Nothing here is
/// derived natively: once the phone is locked the webview is suspended and
/// cannot be asked a question, so the activity can only ever show what it was
/// last told.
struct StratosSetActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Whether the set is performed for reps or for time, which decides
        /// which of the targets below means anything.
        enum Kind: String, Codable {
            case strength
            case time
            case cardio
        }

        var exerciseName: String
        var kind: Kind
        /// 1-based index within the current exercise.
        var setNumber: Int
        /// 1-based index across the whole session — the "7" in "set 7 of 12".
        var position: Int
        var totalSets: Int
        var suggestedReps: Int?
        var suggestedWeight: Double?
        var suggestedTimeSeconds: Int?
    }
}
