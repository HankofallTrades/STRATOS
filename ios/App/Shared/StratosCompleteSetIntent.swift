import AppIntents

/// The Done button on the lock screen.
///
/// A `LiveActivityIntent` is run by the system in the **app's** process, not the
/// widget's, and it launches the app in the background to do it if it is not
/// already running. That is the whole reason a locked phone can log a set: the
/// webview stays suspended, but native code with access to the app's storage
/// gets to run for long enough to append to the Activity Journal.
///
/// It is compiled into both targets because the widget needs the type to build
/// the button; only the app ever runs `perform`.
struct StratosCompleteSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Complete Set"
    /// Never offered in Shortcuts or Spotlight: outside a running workout it
    /// has no set to complete.
    static var isDiscoverable = false

    @Parameter(title: "Set")
    var setId: String

    init() {}

    init(setId: String) {
        self.setId = setId
    }

    func perform() async throws -> some IntentResult {
        await StratosSetActivityController.completeSet(setId: setId)
        return .result()
    }
}
