# STRATOS Codemap

This file is the fast operational map for agents and future sessions. It is not a product vision doc. Read this before making structural changes.

## Current Baseline

- Architecture rename is complete: use `ui / hooks / data`, not `view / controller / model`.
- `npm run build` passes.
- `npm run lint` currently reports warnings but no errors (react-refresh export warnings in shared providers/components).
- There is no test script in `package.json`.
- Do not run `npm run build` and `npm run lint` at the same time. Vite can create transient `vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`.
- Public routes do not load Redux persistence or the protected shell up front; `App.tsx` lazy-loads the protected app shell after route match.
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
  - Owns the theme, toast, and router providers.
  - Splits public routes (`/login`, legacy `/waitlist` redirect) from the lazy protected app shell.
- `src/components/layout/ProtectedAppShell.tsx`
  - Owns Redux provider + persistence gate for protected routes only.
  - Mounts `ProtectedRoute` and `MainAppLayout` after the protected shell chunk loads.
- `src/components/layout/ProtectedRoute.tsx`
  - Gates protected routes on Supabase session state from `AuthProvider`.
- `src/components/layout/MainAppLayout.tsx`
  - Protected app shell.
  - Defines in-app routes.
  - Mounts the global presence orb (`PresenceMark`) + summon surface (`SummonSurface`) and wraps the shell in `PresenceAgentProvider`.
  - Owns the quick-action dialogs (protein, sun, single-exercise). Quick actions are triggered from the summon-surface chips; the old global "+" FAB was removed.
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
  - Redirects to `/`. The Coach is no longer a route — it is the global presence orb + summon surface (`SummonSurface`) mounted in `MainAppLayout` and available on every protected screen.
- `/profile`
  - Page: `src/pages/Profile.tsx`
  - Screen: `src/domains/account/ui/ProfileScreen.tsx`
  - Main hook: `src/domains/account/hooks/useProfileModel.ts`
- `/profile/settings`
  - Page: `src/pages/Settings.tsx`
  - Screen: `src/domains/account/ui/SettingsScreen.tsx`
  - Main hook: `src/domains/account/hooks/useSettingsScreen.ts`
  - Note: legacy `/settings` redirects here.
- `*`
  - Page: `src/pages/NotFound.tsx`

Pages should stay thin wrappers around domain screens.

## State Ownership

### Auth

- `src/state/auth/AuthProvider.tsx`
  - Single source of truth for `session`, `user`, and auth identity readiness (`loading`).
  - Renders `OnboardingDialog`, while onboarding completeness checks are delegated to `src/state/auth/hooks/useOnboardingPrompt.ts`.
- `src/domains/account/ui/AuthForm.tsx`
  - Still imports Supabase directly only for the Supabase Auth widget.
  - Exposes email self-signup by default for public account creation.
  - Should not create its own auth state source.

### Server State

- React Query is the canonical server-state layer.
- QueryClient defaults are centralized in `src/lib/query/loadingPolicies.ts`.
- Domain hooks can use `createAppQueryOptions` from `src/lib/query/loadingPolicies.ts` to express loading intent (`static` / `session` / `background`).
- Query creation mostly lives in domain hooks.
- Repository functions in `src/domains/*/data` are the fetch/mutation layer.

### Client State

- Redux store: `src/state/store.ts`
- Slices:
  - `workout`: active in-progress workout, persisted with the owning user id so workouts can survive refreshes without leaking across accounts
  - `exercise`: persisted exercise metadata/helpers
  - `history`: persisted workout history, capped during serialization so local-storage hydration cost does not grow without bound

The workout flow is the main Redux-heavy area. Most other features should prefer React Query plus local component state.

### Coach Presence

- `src/domains/guidance/hooks/PresenceAgentProvider.tsx` owns the Coach conversation, send loop, and summon-surface open-state via React context (not Redux). It is mounted at the protected-shell root in `MainAppLayout`. State is ephemeral: it survives navigation but resets on reload (no persistence by design).

## Domain Map

### `src/domains/account`

- Purpose: auth-adjacent profile flows, onboarding, settings.
- Note: `/profile` is now the primary nav destination for the account domain; `/profile/settings` is nested under it.
- Data:
  - `data/accountRepository.ts`
  - `data/userFactsRepository.ts` — CRUD for the `user_facts` table (free-text facts the user teaches the Coach).
- Hooks:
  - `hooks/useOnboarding.ts`
  - `hooks/useProfileModel.ts`
    - Owns profile screen state: user facts, background fields (`experience_level`, `training_age_years`), and the fact/about dialogs.
  - `hooks/useSettingsScreen.ts`
  - `src/state/auth/hooks/useOnboardingPrompt.ts` (auth-adjacent onboarding completeness trigger)
    - Owns profile preferences, coach provider preferences, and active training-period reset/create from Settings.
- UI:
  - `ui/AuthForm.tsx`
  - `ui/OnboardingDialog.tsx`
  - `ui/OnboardingForm.tsx`
  - `ui/ProfileScreen.tsx` — top-level profile page; surfaces user facts and background fields.
  - `ui/ProfileFactDialog.tsx` — dialog for adding/editing individual user facts.
  - `ui/ProfileAboutDialog.tsx` — dialog for editing background fields (experience level, training age).
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
  - `ui/WorkoutComponent.tsx` batches workout-row variation/history/user-weight lookups at the screen level so each row does not spin up its own query lifecycle
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
  - `hooks/useVolumeChart.ts` (re-exports the pure helpers below)
- Pure (server-safe) helpers:
  - `data/volumeProgress.ts` — `getCurrentWeekRange` + `buildVolumeProgressDisplayData` and goal/archetype constants, extracted so the server Coach runtime can reuse them without importing React/react-query or the browser Supabase client.

### `src/domains/guidance`

- Purpose: Coach (presence/summon) and workout-generation guidance.
- Presence surface + state entry:
  - `hooks/PresenceAgentProvider.tsx` + `hooks/usePresenceAgent.ts` — app-root context owning the Coach conversation, send loop, and surface open-state.
  - `ui/SummonSurface.tsx` — the bottom-sheet command surface (opened by `PresenceMark`).
  - `ui/ArtifactRenderer.tsx` + `ui/artifacts/*` — inline artifact renderers (`VolumeChartArtifact`, `WorkoutDraftArtifact`).
- Agent/runtime layer:
  - `agent/contracts.ts` for typed message, tool, `ScreenContext`, and `CoachArtifact` contracts
  - `agent/screenContext.ts` for the read-only screen-context type + client assembler + prompt formatter
  - `agent/transport.ts` for frontend request boundary (sends `screenContext`)
  - `agent/tools.ts` for tool definitions and client execution
  - `agent/runtime.ts` for server-side AI SDK tool loop (injects `ScreenContext`, emits artifacts)
- Data:
  - `data/guidanceRepository.ts`
  - `data/llmPreferences.ts`

Current Coach architecture:
- Uses `/api/coach`.
- Uses `/api/coach-credentials` for hosted BYOK credential save/delete/status.
- Conversation state is ephemeral (lives in `PresenceAgentProvider`, persists across navigation, fresh each launch — no storage).
- Each turn sends a read-only `ScreenContext` (route + screen + small focus hints); the runtime injects it into the system prompt. It grants no write access.
- Tool results may carry a typed `CoachArtifact`; a client `ArtifactRenderer` registry renders them inline. Tool calls/results are surfaced in the summon surface (not dropped).
- Supports both server-executable and client-executable tools.
- Supports BYOK hosted providers through `data/llmPreferences.ts`: OpenRouter, OpenAI, Anthropic, and Google.
- Stores user-supplied provider keys encrypted server-side in Supabase via service-role access and a server-only master encryption key.
- The browser only sees provider preference, model preference, and saved-key status metadata such as `last4`.
- Current tools:
  - `propose_workout` (client) — builds a draft session honoring `ScreenContext` + constraints and returns a `workout_draft` artifact; does NOT save. The artifact's Apply commits via the existing create-workout flow (`buildWorkoutPlan` → `commitWorkoutPlan` in `useWorkoutGenerator.ts`). Editing existing programs is out of scope (sub-project 3).
  - `get_training_volume` (server) — current-week archetype volume via the `fetch_weekly_archetype_sets_v2` RPC; returns a `volume_chart` artifact.
  - `get_user_profile_summary` (server) — also returns active `user_facts` and the background fields (`experience_level`, `training_age_years`).
  - `get_recent_workout_summary` (server)

### `src/domains/periodization`

- Purpose: mesocycles, session templates, progression blocks.
- Data:
  - `data/repository.ts`
    - Seeds focus-aware `Workout A/B/C` session templates for custom mesocycles (hypertrophy + strength blueprints) and keeps Occam templates synced when present.
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

`MainAppLayout` is the protected shell and the only place that should own the app-wide presence orb/surface mount and global dialogs. The old global "+" FAB was removed; its quick actions now live as summon-surface chips.

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
  - `src/domains/guidance/agent/*` (typed message + tool + `ScreenContext` + `CoachArtifact` contracts; runtime injects read-only screen context and emits inline artifacts)
  - `src/domains/guidance/hooks/PresenceAgentProvider.tsx` (client conversation/send-loop owner)
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
  - living profile: `user_facts` table (free-text Coach context per user); `profiles` extended with `experience_level` and `training_age_years` background columns.
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
