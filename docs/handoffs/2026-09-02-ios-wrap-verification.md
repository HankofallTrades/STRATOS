# Handoff: finish verifying the iOS wrap (I-10)

Written 2026-09-02. Picks up from `docs/handoffs/2026-09-01-ios-migration-planning.md`,
which was the *planning* handoff. Planning is done: the spec is **I-9**, the tickets are
its children, and ADR-0001 records the Capacitor decision. This handoff is about
**implementation**, and it starts mid-ticket.

## Where things actually stand

Four commits on `main`, clean tree:

| commit | what |
|---|---|
| `a963687` | Set Plan (**I-11**) — Done in Linear |
| `4d7c60b` | Capacitor wrap (**I-10**) — In Progress |
| `2ee9797` | CODEMAP note on the Xcode SDK-stub trap |
| `0b87e38` | `Package.resolved` pin for `capacitor-swift-pm` |

**I-10 is written and committed but only partly verified.** Five of its eight acceptance
criteria are confirmed. The other three all require actually booting the app, and could
not run because the machine had no iOS platform installed:

- [ ] Fresh clone builds and runs from the documented steps alone
- [ ] Supabase login persists across an app kill and relaunch
- [ ] Home, workout, analytics and account routes load and navigate on device

Read the two comments on I-10 before doing anything — they carry the detail this file
summarises.

## Your job

Boot the app and close those three criteria. Then set I-10 to Done, comment what you saw,
and stop. Do not start I-13 to I-18 in the same session; each gets a fresh one.

If a criterion genuinely fails, that is a finding, not a failure of the ticket — record it
and decide whether it belongs in I-10 or in the ticket that owns that surface.

## Start here

Hank was installing the iOS platform (Xcode → Settings → Components) as this was written.
**Check it landed before anything else:**

```
xcrun simctl list runtimes      # empty means it is still not installed
```

`xcodebuild -showsdks` is a liar here — it lists `iphoneos26.5` / `iphonesimulator26.5`
from SDK stubs on a machine with no platform at all. `simctl list runtimes` is the honest
check. Do not retry `xcodebuild -downloadPlatform iOS`: it was tried twice, once with
`-verbose`, and stalled silently both times (no output, no network, ~2s CPU over 20
minutes). A VPN (Windscribe) and Tailscale are active on this machine and are the
plausible cause. The GUI path is the one that works.

Once a runtime exists:

```
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=<a device from simctl>' \
  -configuration Debug build
```

Note the destination form. `generic/platform=iOS Simulator` failed even with the SDK
present, because with no runtime installed the scheme has no eligible destinations at all.
Name a concrete simulator instead.

## Decisions I made that you may need to revisit

These were judgement calls, not requirements. They are cheap to change now and expensive
later.

- **Bundle id is `com.daimodus.stratos`**, set in `capacitor.config.ts` and
  `PRODUCT_BUNDLE_IDENTIFIER`. I picked it; nobody ratified it. **I-12** provisions the
  Apple Developer account, and if Hank registers a different App ID there, this must change
  to match in both places before TestFlight (**I-13**).
- **`STRATOS_TARGET=ios` is the only thing `vite.config.ts` branches on**, and it drops
  `VitePWA` alone. If a later ticket needs another web/native difference, extend that one
  flag rather than adding a second mechanism.
- **I deliberately did not set `ios.contentInset`** in `capacitor.config.ts`. Capacitor's
  default is `automatic`, and I had no way to see how the app's own safe-area CSS renders
  under it. **Expect this to be the first thing that looks wrong on boot** — content under
  the status bar or notch. If so, that is layout polish owned by **I-16**; fix it there
  deliberately rather than reflexively inside I-10.
- **`ios.backgroundColor` is `#000000`** because the manifest theme is black and a white
  flash before first paint reads as a bug. Safe, but it is still a guess about the design.

## Things that will look broken and are not yours to fix

- **The Coach will fail in the wrap.** It calls `/api/coach` relatively, which under
  `capacitor://localhost` resolves to the app's own scheme and never reaches the Vercel
  function. This is precisely what **I-14** exists for. Do not fix it in I-10.
- **Fonts fall back on a cold offline launch.** `index.html` pulls Montserrat/Open Sans
  from Google Fonts over the network. Cosmetic, unowned, recorded in CODEMAP.
- **Stock Capacitor app icon and splash.** Owned by **I-16**.

## Untested assumption worth confirming while you are in there

Supabase session persistence rests on `localStorage` surviving in WKWebView across an app
kill. That is the documented behaviour and the reason I did not add native storage, but it
is unverified. The relaunch criterion is the test — if the session does not survive, that
is a real finding for I-10, not a polish item, because every other ticket assumes a
logged-in app.

## Repo rules that bite

- `npm run build` then `npm run lint`, **sequentially, never in parallel** — Vite's
  transient timestamped config files make ESLint fail with `ENOENT`.
- Lint baseline is **8 warnings, 0 errors**. Tests are **125 passing**. Anything else is
  yours.
- Tracker is **Linear** (workspace `daimodus`, team `StratOS`, project `Stratos`), not
  GitHub Issues. See `docs/agents/issue-tracker.md`.
- Update `CODEMAP.md` in the same change if you alter the verification baseline or the
  iOS build steps. The **iOS Target** section is the one to keep current.

## What comes after I-10

I-10 blocks I-13, I-14, I-15, I-16, I-17 and I-18. **I-12** (Apple Developer account and
signing) is labelled `ready-for-human` and is Hank's to do — it gates TestFlight (I-13) but
nothing on the simulator, so it does not block the work above.
