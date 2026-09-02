# Capacitor wrap over React Native / native rewrite, single codebase

STRATOS ships to iOS by wrapping the existing React SPA in Capacitor with bundled web assets, keeping one codebase that serves both the web app (Vercel) and the iOS app (TestFlight). The entire UI layer is DOM-bound (shadcn/ui on 26 Radix packages, Tailwind, framer-motion, recharts), so a React Native or Swift rewrite would mean rebuilding all of `src/domains/*/ui` for native pulls (push, offline workouts, lock-screen set logging) that Capacitor plugins plus one native Live Activity extension can deliver. Web assets are bundled into the binary — not loaded from the live URL — because offline mid-workout behavior matters more than instant-update convenience; OTA bundle updates (e.g. Capgo) are a deliberate later option, not v1.

## Consequences

- Every web change reaching the iPhone requires an Xcode rebuild + TestFlight upload.
- The Live Activity is the one genuinely native (Swift/SwiftUI, iOS 17+) component; it cannot call into the suspended webview, which forces the Set Plan / Activity Journal reconcile-on-reopen model (see CONTEXT.md).
- A future native rewrite remains possible: `hooks` and `data` layers stay portable; only `ui` is DOM-locked.
