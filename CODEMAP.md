# STRATOS Codemap

This file is the fast operational map for agents and future sessions. It is not a product vision doc. Read this before making structural changes.

## Current Baseline

- Architecture rename is complete: use `ui / hooks / data`, not `view / controller / model`.
- `npm run build` passes.
- `npm run lint` currently reports 8 warnings and 0 errors.
- There is no test script in `package.json`.
- Do not run `npm run build` and `npm run lint` at the same time. Vite can create transient `vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`.
- Protected app routes and heavy quick-action dialogs are lazy-loaded from `MainAppLayout` to keep non-active screens out of the initial protected-shell bundle.

## Read Order

1. `CODEMAP.md` for the current operational layout.
2. `docs/overview.md` for intended architecture and guardrails.
3. `docs/plan.md` for migration history and remaining roadmap items.
4. `git status --short` before editing, because the repo may be intentionally dirty during refactors.

## Database Workflow

- For tasks that depend on actual remote data, inspect the linked Supabase project before making assumptions.
- Prefer the Supabase CLI first for remote database inspection and management.
- If the CLI path is blocked by local environment limits, fall back to direct database inspection with the linked project credentials instead of inferring remote state from migrations or local code.
- This is required for exercise catalog cleanup, variation/equipment normalization, foreign-key cleanup, RLS-sensitive checks, and mesocycle/session-template repairs.

## Runtime Entrypoints

- `src/main.tsx`
  - Creates the React app.
  - Wraps the app in `QueryClientProvider` and `AuthProvider`.
- `src/App.tsx`
  - Owns the provider stack for Redux, persistence, theme, toasts, router.
  - Splits public routes (`/login`, legacy `/waitlist` redirect) from protected app routes.
- `src/components/layout/ProtectedRoute.tsx`
  - Gates protected routes on Supabase session state from `AuthProvider`.
- `src/components/layout/MainAppLayout.tsx`
  - Protected app shell.
  - Defines in-app routes.
  - Owns the global FAB and quick-action dialogs.
  - Mounts the fitness offline-workout sync hook for protected sessions.
- `api/coach.ts`
  - Vercel server function for Coach.
  - Validates requests with the guidance agent contracts and delegates to the agent runtime.
- `api/coach-credentials.ts`
  - Vercel server function for hosted Coach credential save/load/delete status.
  - Verifies the caller with Supabase auth, encrypts provider keys server-side, and stores only ciphertext plus metadata.

## Route Map

- `/login`
  - Page: `src/pages/LoginPage.tsx`
  - Screen: `src/domains/account/ui/AuthForm.tsx`
- `/waitlist`
  - Page: `src/pages/WaitlistPage.tsx`
  - Legacy alias that redirects to `/login`.
- `/`
  - Page: `src/pages/Home.tsx`
  - Screen: `src/domains/dashboard/ui/HomeDashboard.tsx`
  - Main hook: `src/domains/dashboard/hooks/useHomeDashboard.ts`
- `/workout`
  - Page: `src/pages/Workout.tsx`
  - Screen: `src/domains/fitness/ui/WorkoutScreen.tsx`
  - Main hook: `src/domains/fitness/hooks/useWorkoutScreen.ts`
- `/analytics`
  - Page: `src/pages/Analytics.tsx`
  - Screen: `src/domains/analytics/ui/AnalyticsScreen.tsx`
  - Main hook: `src/domains/analytics/hooks/useAnalyticsScreen.ts`
- `/coach`
  - Page: `src/pages/Coach.tsx`
  - Screen: `src/domains/guidance/ui/CoachScreen.tsx`
  - Main hook: `src/domains/guidance/hooks/useCoachScreen.ts`
- `/settings`
  - Page: `src/pages/Settings.tsx`
  - Screen: `src/domains/account/ui/SettingsScreen.tsx`
  - Main hook: `src/domains/account/hooks/useSettingsScreen.ts`
- `*`
  - Page: `src/pages/NotFound.tsx`

Pages should stay thin wrappers around domain screens.

## State Ownership

### Auth

- `src/state/auth/AuthProvider.tsx`
  - Single source of truth for `session`, `user`, `loading`, and onboarding trigger state.
  - Also owns onboarding completeness checks and renders `OnboardingDialog`.
- `src/domains/account/ui/AuthForm.tsx`
  - Still imports Supabase directly only for the Supabase Auth widget.
  - Exposes email self-signup by default for public account creation.
  - Should not create its own auth state source.

### Server State

- React Query is the canonical server-state layer.
- Query creation mostly lives in domain hooks.
- Repository functions in `src/domains/*/data` are the fetch/mutation layer.

### Client State

- Redux store: `src/state/store.ts`
- Slices:
  - `workout`: active in-progress workout, persisted with the owning user id so workouts can survive refreshes without leaking across accounts
  - `exercise`: persisted exercise metadata/helpers
  - `history`: persisted workout history, capped during serialization so local-storage hydration cost does not grow without bound

The workout flow is the main Redux-heavy area. Most other features should prefer React Query plus local component state.

## Domain Map

### `src/domains/account`

- Purpose: auth-adjacent profile flows, onboarding, settings.
- Data:
  - `data/accountRepository.ts`
- Hooks:
  - `hooks/useOnboarding.ts`
  - `hooks/useSettingsScreen.ts`
    - Owns profile preferences, coach provider preferences, and active training-period reset/create from Settings.
- UI:
  - `ui/AuthForm.tsx`
  - `ui/OnboardingDialog.tsx`
  - `ui/OnboardingForm.tsx`
  - `ui/SettingsScreen.tsx`

### `src/domains/dashboard`

- Purpose: home/dashboard composition.
- Main entry:
  - `ui/HomeDashboard.tsx`
  - `hooks/useHomeDashboard.ts`
- Pure dashboard derivations:
  - `data/homeDashboard.ts`
- Cross-domain coordinator:
  - pulls from account, analytics, habits, periodization, auth, and current workout state.

### `src/domains/habits`

- Purpose: triad habits and completion toggles.
- Data:
  - `data/repository.ts`
  - `data/types.ts`
- Hooks:
  - `hooks/useTriad.ts`
  - `hooks/useCompletions.ts`
- UI:
  - `ui/HabitButton.tsx`

### `src/domains/fitness`

- Purpose: workouts, exercise catalog, single logs, protein, sun exposure, workout persistence.
- Canonical data surface:
  - `data/fitnessRepository.ts`
  - This is the main Supabase repository for fitness-related data.
  - `data/recommendations.ts`
  - Pure placeholder/indicator recommendation logic for set progression.
- Screen/state entry:
  - `ui/WorkoutScreen.tsx`
  - `hooks/useWorkoutScreen.ts`
- Other important hooks:
- `hooks/useWorkout.ts` for save/discard persistence
  - `hooks/useOfflineWorkoutSync.ts` for replaying queued offline workout saves
  - `hooks/useWorkoutExercise.ts`
  - `hooks/useSet.ts`
  - `hooks/useExerciseSelector.ts`
  - `hooks/useSingleExerciseLog.ts`
  - `hooks/useQuickActions.ts`
- Persistence helpers:
  - `data/offlineQueue.ts` stores queued workout saves in local storage
  - `data/queryInvalidation.ts` scopes post-save cache invalidation to workout-dependent queries instead of invalidating the entire React Query cache
  - `data/workoutPersistence.ts` finalizes completed workout snapshots and history shaping
- Important UI:
  - `ui/AddSingleExerciseDialog.tsx`
  - `ui/WorkoutExerciseContainer.tsx`
  - `ui/WorkoutExerciseView.tsx`
  - `ui/ProteinLogging.tsx`
  - `ui/SunExposureLogging.tsx`

This is still the most complex domain and the main place where UI, Redux, and React Query intersect.

### `src/domains/analytics`

- Purpose: progress charts, benchmarks, recovery/wellness overview, recent workouts.
- Data:
  - `data/analyticsRepository.ts`
  - `data/analyticsScreen.ts` for screen-local persistence helpers and constants
- Screen/state entry:
  - `ui/AnalyticsScreen.tsx`
  - `hooks/useAnalyticsScreen.ts`
- Important sub-hooks:
  - `hooks/useBenchmarks.ts`
  - `hooks/useOneRepMax.ts`
  - `hooks/usePerformanceOverview.ts`
  - `hooks/useRecentWorkouts.ts`
  - `hooks/useVolumeChart.ts`

### `src/domains/guidance`

- Purpose: Coach and workout-generation guidance.
- Screen/state entry:
  - `ui/CoachScreen.tsx`
  - `hooks/useCoachScreen.ts`
- Agent/runtime layer:
  - `agent/contracts.ts` for typed message and tool contracts
  - `agent/transport.ts` for frontend request boundary
  - `agent/tools.ts` for tool definitions and client execution
  - `agent/runtime.ts` for server-side AI SDK tool loop
- Data:
  - `data/guidanceRepository.ts`
  - `data/llmPreferences.ts`

Current Coach architecture:
- Uses `/api/coach`.
- Uses `/api/coach-credentials` for hosted BYOK credential save/delete/status.
- Supports both server-executable and client-executable tools.
- Supports BYOK hosted providers through `data/llmPreferences.ts`: OpenRouter, OpenAI, Anthropic, and Google.
- Stores user-supplied provider keys encrypted server-side in Supabase via service-role access and a server-only master encryption key.
- The browser only sees provider preference, model preference, and saved-key status metadata such as `last4`.
- Current tools:
  - `generate_strength_workout` (client)
  - `get_user_profile_summary` (server)
  - `get_recent_workout_summary` (server)

### `src/domains/periodization`

- Purpose: mesocycles, session templates, progression blocks.
- Data:
  - `data/repository.ts`
    - Seeds default `Workout A/B/C` session templates for otherwise-empty custom mesocycles and keeps Occam templates synced.
  - `data/types.ts`
- Hooks:
  - `hooks/usePeriodization.ts`
    - Owns active program query plus create/reset mesocycle mutations.
- No dedicated `ui/` layer yet; consumed from dashboard and workout.

### Placeholder Domains

- `src/domains/goals`
- `src/domains/rpg`

These are scaffold placeholders only. They currently expose empty `data/hooks/ui` barrels and should not be treated as implemented domains.

## Shared Layout and Navigation

- `src/components/layout/NavBar.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/navigationItems.ts`
- `src/components/layout/MainAppLayout.tsx`

`MainAppLayout` is the protected shell and the only place that should own app-wide FAB actions and global dialogs.

## Data and Boundary Rules

- Use `src/domains/*/data` for I/O.
- Pages, layout components, and domain hooks must not import Supabase directly.
  - This is enforced in `eslint.config.js`.
- New code must not import `view`, `controller`, or `model` paths.
  - Only `ui`, `hooks`, and `data` are valid layer names.
- UI should move toward props-first/presentational components, but some container UI still exists during migration.

## Important Cross-Domain Seams

- Auth/session:
  - `src/state/auth/AuthProvider.tsx`
- Workout persistence:
  - `src/domains/fitness/hooks/useWorkout.ts`
  - `src/domains/fitness/data/fitnessRepository.ts`
  - `src/domains/fitness/hooks/useOfflineWorkoutSync.ts`
  - `src/domains/fitness/data/offlineQueue.ts`
- Home dashboard:
  - `src/domains/dashboard/hooks/useHomeDashboard.ts`
- Coach runtime:
  - `src/domains/guidance/agent/*`
  - `api/coach.ts`
- Periodization:
  - `src/domains/periodization/hooks/usePeriodization.ts`

If you touch any of those, read the full file first. They are coordination seams, not leaf components.

## Backend and Data Contract

- Supabase source of truth lives in `supabase/migrations`.
- Recent feature areas visible in migrations:
  - exercise muscle schema
  - protein and sun exposure
  - habits and goals
  - periodization mesocycles
- Legacy migration copies exist in `supabase/migrations_legacy`.

## Known Debt / Hotspots

- `goals` and `rpg` are still placeholders.
- The main browser bundle is large and build warns about chunk size.
- Some fitness UI is still more stateful than ideal.
- `README.md` and `docs/plan.md` may lag implementation details after large refactors.
- Only lint/build verification exists right now; there is no automated test suite.

## Verification Workflow

Run these sequentially, not in parallel:

1. `npm run build`
2. `npm run lint`

Current expected lint baseline:
- 8 warnings
- warnings are `react-refresh/only-export-components` in shared UI/provider files

## When To Update This File

Update `CODEMAP.md` whenever any of these change:

- route ownership
- domain entrypoints
- state ownership
- architecture guardrails
- agent/runtime boundaries
- verification baseline

If the change would affect how a new session should orient itself, this file should change in the same PR.
