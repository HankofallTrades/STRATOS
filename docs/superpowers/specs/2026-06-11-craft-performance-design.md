# Craft & Performance Pass Design (Sub-project 5)

Status: detailed design for sub-project 5 (final) of the STRATOS AI-first vision
(`2026-05-31-stratos-ai-first-vision-design.md`). Builds on sub-projects 1–4 (all
shipped).

Date: 2026-06-11

## Goal

Take the flagship surfaces to portfolio finish: a small, token-based motion system
applied to the moments that matter; the Vite chunk-size warning resolved by real
bundle splitting; and loading states rationalized — no spinner for data the app
already knows, and the spinners that remain become unicode glyph animations.

## Scope decisions

- **Flagship surfaces:** summon surface + presence (orb/peek), Home dashboard,
  Workout screen, Analytics. Profile/Settings are explicitly not in this pass.
- **Motion: CSS-first tokens, framer-motion stays where it is.** A motion
  vocabulary lives as Tailwind theme tokens (durations, easings, keyframes) and is
  applied via utility classes. framer-motion remains in the workout interaction
  path where it already ships (`SwipeableIncrementer` chunk, ~120 kB) and is NOT
  imported into the shell, Home, or Analytics — interaction physics is its job;
  entrances are CSS's job. No new dependencies.
- **Bundle: split the 648 kB entry chunk; do not raise the warning limit.** Vendor
  `manualChunks` in `vite.config.ts` separate the long-lived libraries (React
  runtime + router, Supabase client, Radix primitives, state layer) so every chunk
  lands under Vite's 500 kB warning threshold and cache invalidation stops being
  all-or-nothing. Recharts is already split (349 kB, lazy) and stays as is.
- **Spinners: unicode glyph animation, vendored from `sindresorhus/cli-spinners`
  (MIT).** A `UnicodeSpinner` core component cycles vendored frame sets
  (`dots` braille default — `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` at 80 ms; `aesthetic` `▰▱…` and `moon`
  available as variants). Frames are copied into the component with attribution —
  no new dependency. It replaces the four existing `Loader2`/`animate-spin` sites.
- **Spinner policy:** a spinner may only represent genuinely unknown in-flight
  work (a mutation being saved, a lazy detail fetch). Known/cached data renders
  immediately or with the existing skeletons; the audit confirms the four current
  sites are genuine waits and converts them rather than removing them.

## Motion system

`tailwind.config.ts` theme extensions + a few keyframes:

- **Durations:** `motion-fast` 150 ms (feedback: presses, toggles), `motion-base`
  220 ms (entrances, reveals), `motion-slow` 320 ms (sheets, large surfaces).
- **Easings:** `motion-standard` `cubic-bezier(0.2, 0, 0, 1)` (decelerating
  entrance), `motion-exit` `cubic-bezier(0.4, 0, 1, 1)`.
- **Keyframes/utilities:** `fade-rise` (opacity 0→1, translateY 6px→0) and a
  stagger helper (per-index `animation-delay` inline style, capped).

Applied moments:

| Surface | Moment |
|---------|--------|
| Summon surface | conversation messages and artifacts enter with `fade-rise`; new-message stagger capped at ~3 items |
| Presence/peek | `PresencePeek` retokened from generic `animate-in` to `fade-rise` with `motion-base`/`motion-standard` |
| Home dashboard | top-level dashboard cards enter with a short `fade-rise` stagger on first mount only (no re-animation on navigation back) |
| Workout | set-completion feedback: completed-set row confirms with a `motion-fast` scale/settle pulse (CSS only, no framer) |
| Analytics | section cards (volume chart, benchmarks, recent workouts) enter with `fade-rise`; chart internals keep recharts' own animation defaults |

Restraint rules: nothing animates on data refetch; nothing loops except spinners;
`prefers-reduced-motion` disables `fade-rise`/pulse via a media-query guard in the
utilities.

## Bundle work

1. Record the before sizes from `npm run build` (entry `index` 647.94 kB,
   `ProtectedAppShell` 177 kB, `SwipeableIncrementer` 119 kB, recharts 349 kB).
2. Add `build.rollupOptions.output.manualChunks` in `vite.config.ts`:
   - `react-vendor`: `react`, `react-dom`, `react-router-dom`
   - `supabase`: `@supabase/supabase-js`
   - `radix`: `@radix-ui/*`
   - `state`: `@reduxjs/toolkit`, `react-redux`, `redux-persist`, `@tanstack/react-query`
3. Success = every emitted chunk below 500 kB with the warning gone and the
   public `/login` route not loading more than it does today (verify the chunk
   graph: vendor chunks referenced by the entry are expected; protected-only code
   must stay out of the public path).
4. If a single library still exceeds the limit on its own, stop and surface it
   rather than raising `chunkSizeWarningLimit` silently.
5. PWA: confirm `generateSW` precache entry count/size stays sane after the split.

## UnicodeSpinner

`src/components/core/UnicodeSpinner.tsx`:

```tsx
interface UnicodeSpinnerProps {
  variant?: "dots" | "aesthetic" | "moon"; // default "dots"
  className?: string;                        // sizing/color via text utilities
  label?: string;                            // a11y: aria-label, default "Loading"
}
```

- Cycles frames with `setInterval` at the vendored interval (80 ms); cleans up on
  unmount; renders a `<span role="status">` with tabular glyph width
  (`font-mono`), color inherited from `className`.
- Frames vendored from `sindresorhus/cli-spinners` (MIT) with a source comment.
- `prefers-reduced-motion`: holds a single static frame.

Replacement sites (all genuine waits, audited):

- `VariationSelector.tsx:44` — variation list loading (replaces `Loader2`)
- `AddSingleExerciseDialog.tsx:107` (exercise list) and `:303` (save submit)
- `RecentWorkouts.tsx:137` — lazy workout-detail fetch
- `WorkoutExerciseView.tsx:698` — variation save (replaces the border-spin div)

`Loader2` imports are removed where no longer used. The route-level
`AppScreenSkeleton` and existing `Skeleton` components are unchanged — skeletons
remain the right shape for known-layout loads.

## Error handling

- Motion utilities are presentation-only; failure mode is "no animation".
- `UnicodeSpinner` has no async behavior; interval cleanup on unmount is the only
  lifecycle concern.
- Chunk-split regressions are caught at build time (missing module = build error)
  and by the manual route checks below.

## Out of scope

- Profile/Settings polish; full-screen redesigns; scroll- or gesture-driven
  effects; shared element transitions.
- New dependencies (animation libraries, loading frameworks, bundle analyzers as
  deps — one-off analysis via `npx` is fine).
- Lighthouse/perf CI; service-worker strategy changes.
- Replacing skeletons with spinners or vice versa outside the audited sites.

## Verification

Sequential `npm run build` then `npm run lint` (baseline: 0 errors; 8 unique
warnings double-reported as 16). Bundle: before/after chunk table recorded in the
plan execution; the chunk-size warning must be gone without raising the limit.

Manual checks: app loads and navigates normally across all four flagship surfaces;
login (public path) still loads without protected chunks; summon surface messages
and artifacts animate in; peek chip uses the new tokens; dashboard cards stagger
on first mount only; completing a set pulses; spinners show the braille animation
in the four sites; OS reduced-motion setting stills all of it.

## CODEMAP maintenance

Update in the same change: baseline note (chunk-size warning resolved; vendor
chunk strategy in `vite.config.ts`), shared component note (`UnicodeSpinner` in
`components/core`), motion token location (`tailwind.config.ts`), and the craft
conventions (CSS-first motion, framer-motion confined to workout interactions).

## Success criteria

- `npm run build` emits no chunk-size warning; every chunk < 500 kB; `/login`
  payload unchanged or smaller.
- One motion vocabulary, defined once, drives the flagship moments listed above;
  `prefers-reduced-motion` disables it.
- The four spinner sites render the unicode animation; no spinner anywhere
  represents already-known data.
- No new dependencies; build and lint at baseline.
