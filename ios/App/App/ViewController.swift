import Capacitor

/// The bridge view controller, subclassed only to register the app's own
/// plugins. `SceneDelegate` builds the root controller by hand, so this is what
/// it has to build — `Main.storyboard` is not consulted for it.
///
/// Capacitor 8 loads exactly the classes named in the generated
/// `capacitor.config.json`, and `cap sync` rebuilds that list from the installed
/// npm packages. A plugin that lives in this target is never in it, so it is
/// absent from the bridge with no error on the native side — the webview's call
/// just rejects as unimplemented. Registering the instance here is the only
/// place that survives a sync.
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StratosLiveActivityPlugin())
    }
}
