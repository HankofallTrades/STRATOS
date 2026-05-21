# Loading Audit & Unification Plan

## Why loading feels slow and inconsistent

1. **No shared loading policy at the data layer.**
   `QueryClient` is created with defaults, so each query decides loading/refetch behavior ad hoc. This leads to inconsistent `staleTime`, refetching, and spinner patterns across screens.

2. **Route-level suspense is broad and resets whole pages.**
   `MainAppLayout` wraps all protected routes in one `Suspense` fallback, so route chunk/data transitions can blank the whole page even when only one panel changes.

3. **Auth gate blocks protected shell with a hard loading screen.**
   `ProtectedRoute` shows a full-screen `Loading...` while auth initializes. Combined with async profile checks in `AuthProvider`, this creates startup stalls and abrupt transitions.

4. **Duplicated, nested loading boundaries in analytics and fitness.**
   Multiple local `Suspense` + per-widget `isLoading` checks trigger frequent skeleton/spinner swaps and visual jitter.

5. **Mixed responsibilities in auth lifecycle.**
   `AuthProvider` does session load + onboarding profile fetch + modal orchestration. This increases first-protected-render critical path and makes loading state harder to reason about.

6. **Inconsistent placeholder UX.**
   Some areas use polished skeleton cards, some plain text (`Loading...`), some null fallbacks, and some pulse blocks. Perceived performance suffers because transitions are not coherent.

## Unifying fix (single loading architecture)

### 1) Introduce a central loading contract

Create a shared loading strategy in app infrastructure:

- Standard query defaults via `QueryClient`:
  - `staleTime` baseline by data class (static catalog vs user activity vs realtime-ish).
  - `gcTime` and retry policy tuned for mobile.
  - disable unnecessary `refetchOnWindowFocus` for heavy queries.
- Shared helper for domain queries (`createAppQueryOptions`) so domains declare intent (`static`, `session`, `background`) instead of bespoke booleans.

### 2) Move from "blocking load" to "stale-while-revalidate"

- Keep previous data during query key changes where possible (`placeholderData`/keep-previous style behavior).
- Show lightweight inline refresh indicators for background fetches instead of replacing full sections with skeletons.
- Reserve full skeletons for first load only.

### 3) Re-scope suspense boundaries

- Keep route-code splitting, but move suspense boundaries closer to leaf modules.
- Do **not** wrap every protected route in one umbrella fallback; each screen should own its initial-load shell.
- Ensure dialog lazy-load fallbacks are visible and non-empty to avoid "nothing happened" UX.

### 4) Split auth initialization from profile onboarding checks

- `AuthProvider` should only own session identity readiness.
- Move onboarding profile completeness fetch into a dedicated hook with independent loading state.
- Render protected shell as soon as auth identity is known; defer onboarding prompt as non-blocking overlay.

### 5) Standardize loading UI primitives

Adopt one design vocabulary:

- `AppScreenSkeleton` (screen-level first paint)
- `CardSkeleton` (widget-level)
- `InlineSpinner` (small action/refresh)
- `NoFlashFallback` (for tiny lazy chunks)

Map every domain screen to these primitives and eliminate custom ad hoc placeholders.

### 6) Add observability for loading regressions

Instrument timing and transitions:

- route TTI-ish timing (`navigationStart -> first meaningful render`)
- query duration + cache hit ratio for top screens
- count of full-screen fallback renders per navigation

Use this to enforce a performance budget in PR review.

## Delivery plan

### Phase 0 — Baseline metrics (1 day)

- Add lightweight performance marks and logs.
- Capture current startup + route-switch timings.

### Phase 1 — Infrastructure (1–2 days)

- Implement `QueryClient` defaults.
- Add query-options helper and migrate 2 representative domains (dashboard + analytics).

### Phase 2 — Auth and route loading (1–2 days)

- Decouple onboarding checks from auth boot.
- Replace protected-route hard loading screen with app-shell skeleton.
- Re-scope suspense boundaries per screen.

### Phase 3 — Domain rollout (2–4 days)

- Migrate fitness and analytics widgets to first-load-only skeleton + background refresh indicators.
- Remove redundant nested loading branches.

### Phase 4 — Polish and guardrails (1 day)

- Create lint/docs rule-of-thumb for loading states.
- Add checklist item: "No full-screen fallback on background refetch."

## Definition of done

- No plain `Loading...` text in primary routes.
- Protected route startup has one coherent shell transition.
- Route changes do not blank the entire app frame.
- Returning to previously visited screens shows cached content immediately, then refreshes in background.
- Measured median route transition latency and perceived jitter both improve vs baseline.
