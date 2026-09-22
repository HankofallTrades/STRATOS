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
3. Signing — only needed for a physical device, and covered under "Installing
   on a physical device" below. The simulator does not require it.

Capacitor 8 uses Swift Package Manager, not CocoaPods: there is no Podfile and
nothing to `pod install`.

## Installing on a physical device

One command, no Xcode GUI, once the phone is set up:

```sh
npm run ios:device    # scripts/ios-device-install.sh
```

If it stops with an `ios:device:` message before syncing, the problem is the
setup below, not the build. It prints the date the free-signing build stops
launching; after that the app icon is there but will not open, and the fix is
to run the command again.

The one-time setup it cannot do for you, in order:

1. Xcode → Settings → Accounts → **+** → sign in with an Apple ID. A free one is
   enough: the Personal Team signs for a device fine, the build just expires
   after seven days and needs reinstalling. Check from the terminal rather than
   trusting the dialog: `security find-identity -v -p codesigning` must list an
   "Apple Development" identity.
2. Plug in the iPhone by USB, unlock it, tap **Trust This Computer**.
3. On the phone: Settings → Privacy & Security → **Developer Mode** on. It
   restarts. Check: `xcrun devicectl list devices` shows it `available (paired)`.
4. After the first install: Settings → General → VPN & Device Management → trust
   the developer certificate, or the app icon appears but will not open.
5. Optional: Xcode → Window → Devices and Simulators → **Connect via network**,
   after which the cable is only needed for step 2 again.

Team and device ids are never committed. `DEVELOPMENT_TEAM` goes on the
`xcodebuild` command line and is **not** set in `project.pbxproj`, because
hardcoding one team id there breaks every other signer. The script works both
out for you: the team from the `OU` field of your "Apple Development"
certificate, the device from the only paired one. Where that is ambiguous,
copy `.env.ios.example` to `.env.ios.local` (gitignored) and set
`IOS_DEVELOPMENT_TEAM` and/or `IOS_DEVICE_ID`. The team is the certificate's
`OU`, not the parenthesised suffix in its name; the script's step 2 comment
says how to read it.

The trap this exists to prevent: a device still running an older build looks
exactly like a fix that did not work. Reinstall before concluding anything from
a device test. That includes a newly added native plugin (anything in
`ios/App/CapApp-SPM/Package.swift`), which is not on the phone until the app
is reinstalled.

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
  Google" and starts Google sign-in mid-flow. "Sign In" sits above the
  keyboard, so the tap is unnecessary.
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

## Google sign-in

The native Google button opens OAuth in a Safari view inside the app, then
returns to the Capacitor shell through `com.daimodus.stratos://auth/callback`.
Add that exact URL to the linked Supabase project's Authentication → URL
Configuration → Redirect URLs. Google Cloud's authorized redirect URI remains
the Supabase `/auth/v1/callback` URL.

After changing the web code or URL scheme, run `npm run ios:sync` and reinstall
the app.

The callback half needs no device and no real Google account: feed the shell a
URL the way iOS would. The error branch is the useful one, because it proves
routing without needing live tokens.

```sh
xcrun simctl openurl booted \
  'com.daimodus.stratos://auth/callback#error_description=Routed+to+the+shell'
```

The message must appear under the Google button in the app. If Safari opens
instead, the scheme is not registered — check `CFBundleURLSchemes` in
`Info.plist` survived the last `cap sync`. Terminate the app first and the same
command covers the cold-start path, which arrives through `getLaunchUrl` rather
than the `appUrlOpen` listener. A non-auth link such as
`com.daimodus.stratos://share/workout/12` must leave the screen untouched.

Only a full sign-in still wants a device: that it returns to STRATOS, lands on
the home screen, and survives a process kill and relaunch. Verified on an
iPhone 12 Pro (iOS 26.6.2).

## The status bar overlays the webview

The wrap runs edge to edge, so nothing reserves room for the clock and the
Dynamic Island on the app's behalf. Three pieces have to stay in agreement:

- `index.html` sets `viewport-fit=cover` on the viewport meta. Without it every
  `env(safe-area-inset-*)` reads as `0px` and the rest is dead code.
- `capacitor.config.ts` sets `ios.contentInset: "never"`. This is what makes the
  webview edge to edge: under the default `automatic` it is laid out inside the
  safe area instead (`innerHeight` 778 against a 874pt screen), every inset
  reads as `0px`, and the app has no way to reserve the space itself.
- The CSS reserves it, through the `--app-safe-top` custom property so every
  surface agrees on one value. `.app-page` covers most screens; the ones that
  render their own full-height shell have to opt in by hand — the workout
  screen, the login screen, their route skeletons, and the toast viewport. The
  onboarding dialog is centred rather than top-anchored, so it is clamped to the
  safe area instead of padded.

- On native, `src/lib/native/safeTopLatch.ts` then overrides that property with
  the last inset the webview honestly reported. WebKit drops
  `env(safe-area-inset-top)` to `0px` for the rest of the session once the login
  keyboard has been raised, while the webview stays full height, which put the
  home greeting back under the clock until the next launch. A portrait zero is
  therefore ignored; a landscape zero is taken as read, because there the status
  bar really is gone. `env()` itself is untouched, so the hidden probe keeps
  reading the live value.

If you add another screen that does not use `.app-page`, add
`pt-[calc(<base>+var(--app-safe-top))]` to its shell. Forgetting puts the header
under the clock, and only the wrap shows it.

`src/lib/build/safeArea.test.ts` guards the viewport meta, the `contentInset`
value, the property definition, the shells that opt in, and that the latch
starts at boot. The web target is unaffected: the insets are `0px` everywhere
but a notched device.

## Native polish: what only the wrap does

Four bridges give the wrap a native feel, and none of them exists on the web
target. Every bridge in `src/lib/native/` checks `Capacitor.isNativePlatform()`
and is a silent no-op otherwise, so the PWA never sees a haptics, wake-lock or
Live Activity call it did not have before.

- **Haptics on set completion.** A Medium impact for a set, the Success
  notification pattern (a distinct double tap) for a PR. Whether a set is a PR
  is decided in `setCompletionFeedback.ts`, with the same rule as the home
  screen's "Recent PR": the set's e1RM beats the exercise's all-time best, and
  a first-ever exercise has nothing to beat, so it never rings PR. The baseline
  is folded client-side from the exercise's completed weighted sets with the
  app's own e1RM formula, not read from the e1RM RPC: that RPC uses Epley and
  the app uses Brzycki, and a PR measured one way and shown the other misses
  real ones. Cached for five minutes, invalidated when a workout saves.
- **Keep-awake.** The screen stays on while a workout is active (the workout
  screen holds it while `currentWorkout` is set) and while a breathwork session
  is running or paused (the runner holds it until `done`). Holds are refcounted
  by component instance, so a breathwork run inside a workout does not release
  the workout's hold when it ends, and every hold is released on unmount:
  leaving the route is enough, finish and discard are not special-cased.
- **Live Activity.** The running workout on the lock screen (next section).
- **Status bar text.** Follows the theme's background lightness: light text on
  the dark themes, dark text on the light "Stratos" theme. Applied from
  `ThemeProvider` whenever the theme changes. The bar stays an overlay; the
  space under it is still reserved by CSS (previous section).

The launch screen and icon are the app's own, not Capacitor's placeholders:
`LaunchScreen.storyboard` is painted black with the "S" mark, and the 1024px
icon has no alpha channel because App Store Connect rejects one.
`src/lib/build/launchScreen.test.ts` fails if the stock artwork comes back,
which `cap add ios` or a careless merge can do without any build error.

Checking on a device, since the simulator has no haptic engine and never
sleeps: complete a set (tap), beat a lift's best e1RM (double tap), leave a
workout open past the auto-lock interval (stays on), finish it (locks on
schedule), and switch to the Stratos theme in Settings (the clock turns black).

## The Live Activity and its widget extension

The lock screen shows the running workout: the current exercise, which set of
the session it is, and the target. `StratosWidget` is a WidgetKit app extension
target inside `ios/App/App.xcodeproj`, embedded into `App.app/PlugIns` by the
app target's *Embed App Extensions* phase. It builds with the normal
`npm run ios:sync` / `xcodebuild` path and needs no extra step, but note:

- The extension has its own bundle id, `com.daimodus.stratos.StratosWidget`,
  and so its own provisioning profile. `npm run ios:device` passes
  `DEVELOPMENT_TEAM` on the command line with `-allowProvisioningUpdates`,
  which covers both targets; a free Personal Team is enough.
- Everything in `ios/App/Shared/` is compiled into *both* targets, and must
  never be added to only one: the payload contract, the journal and its store,
  the activity controller, and the intents behind the Done button and the
  steppers. The widget needs an intent's *type* to build the button; only the
  app ever runs it. Add files with
  the `xcodeproj` Ruby gem rather than by hand — editing the pbxproj by hand
  corrupts it.
- `NSSupportsLiveActivities` in the app's `Info.plist` is what makes iOS accept
  `Activity.request`. Without it the request throws and the bridge only warns.
- The plugin is registered by hand in `ViewController.capacitorDidLoad`, which
  `SceneDelegate` builds as the root controller. Capacitor 8 loads only the
  classes in the generated `capacitor.config.json`, and `cap sync` rebuilds that
  list from the installed npm packages, so a plugin living in the app target is
  never in it — every call rejects `UNIMPLEMENTED` with nothing said natively.
  `registerPluginInstance` is the one path that ignores auto-registration.
  Another app-local plugin goes on the same line.

The webview owns every decision. `buildLiveActivityPlan` projects the whole Set
Plan — every set, with the target each would log — the bridge in
`src/lib/native/liveActivity.ts` marshals it, and the plugin stores it. No
number is computed in Swift, because once the phone is locked the webview is
suspended and cannot be asked. The one thing Swift decides for itself is which
entry of that plan is current, and it has to: a Done tap must advance with
nothing to call. That walk is `StratosActivityCursor`, and `currentLiveActivitySet`
states the same rule on the web, where it is what the app shows while awake.

Only the current set is put into the activity's `ContentState`, not the plan.
A `ContentState` crosses the system on every update and has a hard size limit
that a thirty-set session would exceed; the plan stays in `StratosActivityStore`.

## Logging a set from the lock screen

The Done button is a `LiveActivityIntent`, which the system runs **in the app's
own process**, launching the app in the background if it is not running. That is
the entire reason a locked phone can log a set: the webview stays suspended, but
native code with the app's storage gets to run. It is also why
`StratosActivityStore` is plain `UserDefaults.standard` and not an App Group —
it does not need to cross processes, and a free Personal Team cannot provision
an App Group at all. If the button ever stops seeing the plan, check that
assumption first.

The intent appends to the **Activity Journal** and refreshes the activity.
It logs nothing else: what a press is worth as a completed set is decided on the
next foreground by `replayActivityJournal`, through the same rule the checkbox
goes through. The button names the set it was drawn for, so a tap landing on a
render the activity has already moved past is refused rather than logging the
next set by accident, and it disappears once its set is logged.

Because the intent background-launches the app, the plugin's `load()` is a trap.
It must not clear the stored plan: that runs on the very launch the Done tap
caused, and would leave the intent with nothing to log — the first tap after a
kill, silently doing nothing. It also ends a stale activity only when the journal
is empty, because a journal with entries in it means the user was pressing that
button moments ago and the activity is not stale at all.

The lock screen never shows a Done button it cannot honour. Whether a set has
enough of a target to be logged is decided on the web (`loggable` in
`buildLiveActivityPlan`, mirroring the refusals in `setCompletion.ts`) and
carried across, because a tap that the replay then throws away would leave the
two surfaces disagreeing with nothing on screen to explain it.

`useWorkoutLiveActivity` replays on mount and on `visibilitychange`, dispatches
the completions, then clears the journal through the last entry it read. That
order is deliberate: a crash between the read and the clear replays an entry,
which replay is idempotent against, instead of losing a set the user logged.
The plugin's `load()` clears the stored plan but deliberately leaves the journal
alone — surviving a kill is the whole point of it.

Ending it is the part worth knowing. `useWorkoutLiveActivity` sits inside the
workout screen's active branch, so finishing or discarding unmounts it rather
than re-rendering it — clearing the workout is exactly what drops the screen to
its no-workout view. The end therefore runs on teardown and re-reads the store,
because navigating away mid-session unmounts the same way and must leave the
lock screen up. A `load()` call in the plugin clears any activity that outlived
a previous process, which is how an app kill stops leaving a stale session.

Checking on a device (the simulator can show Live Activities, but only a real
lock screen proves it): start a workout and lock the phone (the activity
appears on the current set), complete a set while unlocked (it advances), then
finish the workout and lock again (it is gone). Repeat the last step with
discard. Force-quit mid-workout and relaunch: no stale activity survives.

## Adjusting a set from the lock screen

The +/- steppers are the same mechanism as the Done button — a
`LiveActivityIntent` run in the app's process, appending to the journal — and
differ in two things. The entry is a `set-adjusted` rather than a
`set-completed`, which replay applies as a value edit that leaves the set open;
and the button carries only a field name and a direction, never a number. How
far a tap moves a value is the app's rule (`setAdjustmentForKind`), resolved
into the plan alongside the target, so the lock screen produces the same numbers
the in-app stepper would. The arithmetic itself is stated twice —
`adjustSetTarget` on the web, where it is tested, and
`StratosSetAdjustment.applied` in Swift, where it has to run with the webview
asleep. The two must agree.

Every "has this set been dealt with" check therefore filters on
`isCompletion`. Reading them as "the journal mentions this set" would make the
first stepper tap spend the Done button.

A stepper cannot walk a set into a state the replay would refuse: the floor for
the field that decides the kind is one step, so reps stop at 1 and a hold at a
second. A tap that would change nothing is not journalled at all, or a finger
resting on the minus button would fill the journal at the floor.

Adjustments are cleared with every other entry, and the plan is what carries
them afterwards: replay writes the adjusted numbers onto the set, and
`buildSetPlan` targets a set's own numbers ahead of any suggestion, so the next
sync sends those numbers back to the lock screen rather than the suggested ones.
Before I-44 the target was `recommendation ?? stored` and the entry had to be
held past the clear to stop a Done tap logging 10 over the user's 8 — which made
the lock screen the authority on that set and overwrote in-app edits to it on
every foreground. Neither holds now: whichever surface edited the set last is
what both of them show.

For the Done button, with the phone **actually locked** — not just the app
backgrounded, because a foregrounded webview hides the whole problem: tap Done
(the activity moves to the next set), tap it two or three more times, then open
the app. The sets you logged are ticked, with the numbers the lock screen was
showing, and nothing is double-logged. Then force-quit from the lock screen
before reopening: the activity goes, but the journal does not, and the sets
still land on the next launch.

Two things about how a stepper tap *feels*, both measured on the device rather
than guessed at. The work in `adjustSet` is about 10ms end to end — 3ms to write
the journal, 5-8ms for `activity.update` to return — so nothing in this codebase
is what makes a tap feel slow. What did make it feel slow was the implicit
animation: the system crossfades a Live Activity whose content changed, which on
a stepper reads as the number hesitating before committing. `SetLockScreenView`
carries `.transaction { $0.animation = nil }` to turn that off. If a tap ever
feels laggy again, measure before optimising anything here; the remaining wait is
iOS dispatching the intent into the app process, which is not ours to shorten.

To measure it: `Logger` output does **not** reach `devicectl --console`, which
only carries stdout, so temporary timing has to go through `print`. Attach with
`xcrun devicectl device process launch --device <id> --console --terminate-existing
com.daimodus.stratos`; `log stream` has no `--device` option on current macOS,
and zsh has its own `log` builtin that shadows `/usr/bin/log`.

For the steppers, also locked: tap minus on reps a few times (the number moves
on the activity straight away, and stops rather than going to zero), tap plus on
weight, then Done. Open the app: the set is ticked with the numbers you stepped
to, not the suggested ones. Repeat without pressing Done — the set is untouched
but carries the adjusted numbers. Then edit that same set in the app and lock
the phone again: the lock screen shows what you typed, which is what it would
log.

## Proactive insights behave differently in a wrap

`useProactiveEngine` treats a fresh mount as `app_open`, which is right for a
browser tab and wrong for a native shell: iOS suspends the webview rather than
tearing it down, so a user returning days later never remounts. The hook also
re-runs the `app_open` gate on foreground (`visibilitychange`), gated behind
`Capacitor.isNativePlatform()` so the web target keeps exactly the
mount-and-navigate behaviour it had. If foreground detection ever proves
unreliable, `@capacitor/app`'s `resume` event is the purpose-built replacement,
and Google sign-in has since made `@capacitor/app` a dependency anyway. It is
still not used here: `visibilitychange` has not misfired.

## Known gaps

Open, unticketed, and worth filing before the next wrap pass:

- `index.html` pulls Montserrat/Open Sans from Google Fonts over the network, so
  a cold offline first launch falls back to system fonts. Cosmetic.
- A cold launch straight to Home mid-workout leaves no Live Activity: the
  plugin clears the one that outlived the old process, and only the workout
  screen syncs a new one. Adopting a surviving activity belongs with I-22's
  reconcile-on-reopen, not here.
- WebKit drops the top inset for the rest of the session after signing in. The
  latch in `src/lib/native/safeTopLatch.ts` holds the last real measurement
  instead, so the symptom is gone, but the stale inset underneath is not: a
  screen that reads `env(safe-area-inset-top)` directly rather than
  `--app-safe-top` will still lose it. The latch also reads orientation from the
  window's aspect, so an iPad in a narrow Split View column counts as portrait.
  Irrelevant on the one phone this ships to, wrong the day it isn't.
