import AppIntents

/// A +/- stepper on the lock screen.
///
/// Like the Done button it is a `LiveActivityIntent`, run by the system in the
/// **app's** process, which is what lets a tap on a locked phone reach the
/// Activity Journal at all. See `StratosCompleteSetIntent` for why that
/// matters and why the store is plain `UserDefaults`.
///
/// It carries which set, which field and which way — and nothing about how far.
/// The step is the app's rule about how weight and reps move, and it arrived
/// with the plan.
struct StratosAdjustSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Adjust Set"
    /// Never offered in Shortcuts or Spotlight: outside a running workout there
    /// is no set to adjust.
    static var isDiscoverable = false

    @Parameter(title: "Set")
    var setId: String

    /// `reps`, `weight` or `timeSeconds` — a `SetTarget` field name.
    @Parameter(title: "Field")
    var field: String

    /// `1` or `-1`.
    @Parameter(title: "Direction")
    var direction: Int

    init() {}

    init(setId: String, field: String, direction: Int) {
        self.setId = setId
        self.field = field
        self.direction = direction
    }

    func perform() async throws -> some IntentResult {
        await StratosSetActivityController.adjustSet(
            setId: setId,
            field: field,
            direction: direction
        )
        return .result()
    }
}
