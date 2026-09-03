# iOS wrap — build and verify

STRATOS ships to iOS as a Capacitor wrap of the same React SPA that ships to
Vercel (ADR-0001). The network seam is ADR-0002. This file is the runbook: the
things that cost hours to rediscover, not the things you can read off the config.

## Build and run from a fresh clone

```
npm ci
npm run ios:sync    # build:ios + cap sync ios
npm run ios:open    # opens ios/App/App.xcodeproj in Xcode
```

Pick a simulator or device in Xcode and Run; `npm run ios:run` does sync plus
`cap run ios` if you would rather stay in the terminal. Re-run `npm run ios:sync`
after **every** web change — the binary carries its own copy of the bundle, so an
un-synced change simply is not in the app.

First-time machine setup, in order:

1. Xcode installed, and `sudo xcodebuild -license accept` run once.
2. **The iOS platform downloaded** — Xcode → Settings → Components → iOS → Get.
   Do not trust `xcodebuild -showsdks`: Xcode 26 lists `iphoneos26.5` and
   `iphonesimulator26.5` while shipping only SDK *stubs*, so it looks installed
   when it is not. `xcrun simctl list runtimes` is the honest check — empty means
   nothing can boot, and every iOS destination fails with "iOS <version> is not
   installed". The CLI equivalent (`xcodebuild -downloadPlatform iOS`) has been
   observed stalling silently here: no output, no network, no error. Use the GUI,
   and disable any VPN if it stalls there too.
3. Signing — a separate prerequisite, and only needed for a physical device. The
   simulator does not require it.

Capacitor 8 uses Swift Package Manager, not CocoaPods: there is no Podfile and
nothing to `pod install`.

## Driving the app in the simulator

UI verification is automated with **Maestro** (`e2e/ios-smoke.yaml`, run via
`scripts/ios-smoke.sh`). Use it rather than reaching for AppleScript: `osascript`
against System Events fails with `-1712` on this machine because the agent
process has no Accessibility permission, and `simctl` has no `tap` or `type`.

Maestro reads the WKWebView accessibility tree directly, so web selectors work:
tap by placeholder text (`you@domain.com`, `Your password`) and by button label.
`maestro hierarchy` dumps the current screen's selectors.

Two prerequisites, neither on `PATH` by default, both resolved inside
`scripts/ios-smoke.sh`: the CLI at `~/.maestro/bin/maestro`, and a JDK
(`brew install openjdk`, keg-only). Credentials come from `.env.e2e.local`
(gitignored); `.env.e2e.example` is the template.

The account in `.env.e2e.local` is a dedicated test user created through the
app's own signup screen. Its onboarding is already filled in, which is why a
`clearState` login lands on the home screen instead of the "Welcome to STRATOS"
modal. If that modal reappears the account was reset — fill it in once by hand
and the flow goes green again. Never point this at a real user's account.

Gotchas that will cost you a run:

- **Do not use Maestro's `hideKeyboard` on the login screen.** It dismisses the
  keyboard by tapping a supposedly empty area, which here lands on "Continue with
  Google" and sends the app out to the system browser mid-flow. "Sign In" sits
  above the keyboard, so the tap is unnecessary.
- Where a control genuinely sits behind the keyboard, as "Save" does in the
  onboarding modal, tap the keyboard accessory bar's own `Done` first. A
  `scrollUntilVisible` will report success there and still tap the keyboard
  rather than the button underneath it.
- `takeScreenshot` paths are sandboxed to the run's own output folder — use bare
  names (`01-after-login`), not repo-relative paths. Screenshots land under
  `~/.maestro/tests/<timestamp>/`.
- **The Supabase project must be ACTIVE.** A paused project loses its API
  hostname entirely: the URL returns NXDOMAIN from every resolver, not just
  behind a VPN. The app surfaces this only as a terse "Load failed" under the
  Sign In button, easy to misread as bad credentials or a broken wrap. Check
  project status before debugging a login failure.

## Proactive insights behave differently in a wrap

`useProactiveEngine` treats a fresh mount as `app_open`, which is right for a
browser tab and wrong for a native shell: iOS suspends the webview rather than
tearing it down, so a user returning days later never remounts. The hook also
re-runs the `app_open` gate on foreground (`visibilitychange`), gated behind
`Capacitor.isNativePlatform()` so the web target keeps exactly the
mount-and-navigate behaviour it had. If foreground detection ever proves
unreliable, `@capacitor/app`'s `resume` event is the heavier, purpose-built
replacement — not used here because it adds a native plugin and
`@capacitor/core` was already a dependency.

## Known gaps

Open, unticketed, and worth filing before the next wrap pass:

- `index.html` pulls Montserrat/Open Sans from Google Fonts over the network, so
  a cold offline first launch falls back to system fonts. Cosmetic.
- Top-of-screen content collides with the status bar. Confirmed on device: the
  home greeting and the onboarding modal's title both render underneath the clock
  and Dynamic Island. `ios.contentInset` is unset, so Capacitor's `automatic`
  applies and the app's own safe-area CSS does not reserve enough top padding.
