# STRATOS Codemap

This file is the fast operational map for agents and future sessions. It is not a product vision doc. Read this before making structural changes.

## Current Baseline

- Architecture rename is complete: use `ui / hooks / data`, not `view / controller / model`.
- `npm run build` passes.
- `npm run lint` reports 8 warnings, no errors (`react-refresh/only-export-components` in shared providers/components — benign dev-HMR hints). The earlier 16 was this same set double-counted because `eslint .` was traversing the nested `.claude/worktrees/` checkout; `.claude` is now in the eslint `ignores`.
- Unit tests run via Vitest (`npm test`, config in `vitest.config.ts`, node environment). The suites cover domain logic without React or live Supabase: fitness `recommendations`, fitness `workoutCommit` (persist/queue/history settle), guidance `proactiveGates`, guidance `toolBuilders` (client Coach tool logic), guidance `coachMutations` (apply/revert payload round-trip, repo mocked), dashboard `homeModel` (home-screen derivation), dashboard `homeDashboard` loading orchestration (movement history + recent-workout reuse), periodization `repository` read-only loading, auth `protectedSessionGate`, analytics `volumeProgress`, breathwork `protocols` (step timeline/early-exit rule) and `logging` (workout-exercise build + catalog resolution), build `manualChunks`, and workout state `workoutSlice` (`lastFinishedWorkoutId` set on save/`workoutFinished`, untouched by discard's `clearWorkout`).
- Do not run `npm run build` and `npm run lint` at the same time. Vite can create transient `vite.config.ts.timestamp-*.mjs` files that make ESLint fail with `ENOENT`.
- Public routes do not load Redux persistence, app toasters/tooltips, or the protected shell up front; `App.tsx` routes protected paths through `ProtectedAppEntry`, which checks the stored Supabase session before importing the protected shell. The auth-check state renders a neutral dark shell, not a destination-shaped skeleton.
- Public auth routes are also lazy route chunks. `src/main.tsx` no longer mounts `AuthProvider` globally; auth boot now lives in the protected shell, so `/login` can render without pulling protected auth/state code into the entry bundle.
- Public auth bootstrap uses the async loader in `src/lib/integrations/supabase/browserClient.ts`; the login route no longer statically imports `@supabase/supabase-js`, so the browser Supabase vendor chunk is not preloaded from `dist/index.html`. The async auth loader and sync repository proxy share one browser-client cache to avoid duplicate GoTrue clients.
- Protected app routes and heavy quick-action dialogs are lazy-loaded from `MainAppLayout` to keep non-active screens out of the initial protected-shell bundle.
- Vendor `manualChunks` in `vite.config.ts` delegate to the tested `src/lib/build/manualChunks.ts` classifier and split the entry bundle (react-vendor / query / supabase / radix / state). Keep `@tanstack` separate from Redux/persist so public routes can use React Query without preloading protected persistence code. framer-motion and recharts are intentionally NOT in the manual list so they stay lazily chunked.
- Motion convention: CSS-first tokens in `tailwind.config.ts` (`motion-safe:animate-fade-rise` entrances, `motion-safe:animate-set-confirm` pulse); framer-motion is confined to workout interaction physics. `prefers-reduced-motion` is honored via the `motion-safe:` variant.
- Loading convention: skeletons for known-layout loads; genuine in-flight waits use `src/components/core/UnicodeSpinner.tsx` (frames vendored from sindresorhus/cli-spinners, MIT). Route-level fallbacks use the path-aware `src/components/loading/RouteSkeletons.tsx`; add route skeleton variants there rather than introducing generic app-card fallbacks. Exercise-selection waits should preserve list shape rather than blanking or showing text-only loading.
- Periodization reads must stay read-only. Template session seeding/repair belongs to create/reset/explicit mutation paths, not `getActiveMesocycleProgram`. Home startup uses `fetchActiveMesocycleSummary` for the visible workout card and fetches the full session template only when starting a program workout from Home.
- Redux persistence rehydrates after the protected shell mounts; it does not blank first protected paint behind `PersistGate`.
- The global Coach presence shell stays available on every protected route, while the heavier Coach runtime (send loop, client tools, proactive gates, mutation application) is lazy-loaded after first paint/first Coach use. Workout proposal planning still loads only when the `propose_workout` client tool runs.

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
  - Wraps the app in `QueryClientProvider`.
- `src/App.tsx`
  - Owns the theme, toast, and router providers.
  - Splits public routes (`/login`, legacy `/waitlist` redirect) from protected routes.
  - Lazy-loads the login/waitlist route chunks and delegates protected paths to `ProtectedAppEntry`.
- `src/components/layout/ProtectedAppEntry.tsx`
  - Performs the lightweight stored-session check before importing `ProtectedAppShell`.
  - Redirects unauthenticated users to `/login` without loading Redux persistence, protected toasters/tooltips, or protected route chunks.
- `src/components/layout/ProtectedAppShell.tsx`
  - Owns auth provider, Redux provider, and persistence gate for protected routes only.
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
  - Manages its own session redirect check (does not require `AuthProvider` on `/login`).
  - Renders a local configuration message instead of crashing when browser Supabase env vars are missing.
  - Loads the browser Supabase client asynchronously for the public auth surface.

### Server State

- React Query is the canonical server-state layer.
- QueryClient defaults are centralized in `src/lib/query/loadingPolicies.ts`.
- Domain hooks can use `createAppQueryOptions` from `src/lib/query/loadingPolicies.ts` to express loading intent (`static` / `session` / `background`).
- Query creation mostly lives in domain hooks.
- Repository functions in `src/domains/*/data` are the fetch/mutation layer.

### Client State

- Redux store: `src/state/store.ts`
- Slices:
  - `workout`: active in-progress workout, persisted with the owning user id so workouts can survive refreshes without leaking across accounts. Also tracks `lastFinishedWorkoutId`, set only by the `workoutFinished` action on a successful save (never on discard) — the proactive coach's "workout_finished" gate (`useProactiveEngine`) keys off this id instead of the generic active-workout edge, so discarding a session never fires the post-session "session logged" nudge.
  - `exercise`: persisted exercise metadata/helpers
  - `history`: persisted workout history, capped during serialization so local-storage hydration cost does not grow without bound

The workout flow is the main Redux-heavy area. Most other features should prefer React Query plus local component state.

### Coach Presence

- `src/domains/guidance/hooks/PresenceAgentProvider.tsx` owns the lightweight Coach presence controller and public context. `src/domains/guidance/hooks/PresenceAgentRuntime.tsx` lazy-loads the heavier send loop, client tools, proactive gates, and mutation application. It is mounted at the protected-shell root in `MainAppLayout`. State is ephemeral: it survives navigation but resets on reload (no persistence by design).

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
  - `hooks/useHomeDashboard.ts` — orchestration only: gathers the five sources (auth, redux workout, periodization, habits, snapshot query), feeds `buildHomeModel`, keeps effects + handlers.
- Pure home model:
  - `data/homeModel.ts` — `buildHomeModel(inputs) -> HomeModel` plus all label/streak/PR derivation helpers. No React/react-query/Redux/Supabase (repo imports are type-only); unit-tested in `homeModel.test.ts`. Mirrors the analytics `volumeProgress.ts` seam.
- I/O boundary:
  - `data/homeDashboard.ts` — `fetchHomeDashboardSnapshot` (batched profile/recent-workouts/PR-rows/completion-dates fetch) only.
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
  - `data/workoutCommit.ts` — the **workout commit** seam: `commitFinalizedWorkout(snapshot, deps)` → `saved | queued | failed`. Owns persist → offline-queue fallback → Redux history settle (incl. the server-id swap). Online save (`useWorkout.ts`) and offline replay (`useOfflineWorkoutSync.ts`) both cross this one interface; the hooks keep only what differs (toasts, navigation, invalidation timing). Unit-tested in `workoutCommit.test.ts` (repo + queue mocked).
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

### `src/domains/breathwork`

- Purpose: guided breathwork (box, 4-7-8, coherent, breath-rounds) that logs into the workout/session primitive rather than a parallel system.
- Pure logic (the unit-test surface):
  - `data/protocols.ts` — protocol data (`BREATHWORK_PROTOCOLS`) plus the step-timeline helpers `buildSteps`/`totalUnits`/`completedUnits`/`shouldSaveEarlyExit` and `protocolForExerciseName` (maps a catalogue exercise name to its protocol). No React/Supabase.
  - `data/logging.ts` — `findBreathworkExercise` (catalog lookup, prefers the global row over a user copy), `buildBreathworkWorkoutExercise` (one completed time-only `WorkoutExercise`, for the standalone path), and `applyBreathworkCompletion` (records a finished run onto an existing in-session exercise — fills its first open set or appends a completed one).
- Hooks:
  - `hooks/useBreathworkSession.ts` — the timer engine: a `Date.now()`-anchored state machine over `protocols.ts` steps (`idle / running / paused / retention / done`), tab-suspend-safe.
  - `hooks/useBreathworkLogging.ts` — routes a finished *standalone* session by context: dispatches `addExerciseToWorkout` when a workout is active, otherwise calls `saveSingleExerciseLog`. Neither the session hook nor the UI owns persistence directly.
- UI:
  - `ui/BreathworkRunner.tsx` — owns a running session (auto-start, pacer, pause/end) and calls `onDone` once when finished; shared by both entry points, each deciding what "done" means.
  - `ui/BreathworkExerciseCard.tsx` — in-session card for a breathwork exercise: protocol name/intent, completed runs as time chips, a "Breathe" button that launches the pacer overlay. Writes each run as a completed set via `applyBreathworkCompletion` + the generic `replaceWorkoutExercise` reducer. Rendered by `WorkoutComponent` in place of the standard exercise view when `exercise_category === 'breathwork'` and a protocol matches.
  - `ui/BreathworkDialog.tsx` — standalone full-screen picker → runner → summary flow (default export, lazy-loaded); the Summon chip's entry point.
  - `ui/BreathPacer.tsx`, `ui/ProtocolPicker.tsx`.
- Entry points: **the standard `ExerciseSelector`** (breathwork protocols are catalogue exercises under the Breathwork category — added to any session like any other exercise, then run via the in-session card) and the summon-surface `Breathe` chip (`SummonSurfaceQuickActions.onBreathwork`, wired in `MainAppLayout`) for breathing outside a planned session. No dedicated footer button — the in-session path is the shared add-exercise flow.
- Catalog dependency: relies on four seeded `exercise_category = 'breathwork'` rows (migration `20260703185237_add_breathwork_exercises.sql`, applied to the linked project). Without them the category filter is simply empty; there is no separate breathwork entry point to break.
- See `docs/superpowers/specs/2026-07-03-breathwork-module-design.md`.

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
    - Uses a saved range when present; otherwise defaults to `3M` only when the selected exercise history spans more than three calendar months, and keeps sparse histories on `ALL`.
  - `hooks/usePerformanceOverview.ts`
  - `hooks/useRecentWorkouts.ts`
  - `hooks/useVolumeChart.ts` (re-exports the pure helpers below)
- Pure (server-safe) helpers:
  - `data/volumeProgress.ts` — `getCurrentWeekRange` + `buildVolumeProgressDisplayData` and goal/archetype constants, extracted so the server Coach runtime can reuse them without importing React/react-query or the browser Supabase client.

### `src/domains/guidance`

- Purpose: Coach (presence/summon) and workout-generation guidance.
- Presence surface + state entry:
  - `hooks/PresenceAgentProvider.tsx` + `hooks/usePresenceAgent.ts` — app-root presence context owning open/input/conversation state plus runtime loading. `hooks/PresenceAgentRuntime.tsx` lazy-loads after first paint/first Coach use and owns the send loop, client tool dispatch, proactive gates, and artifact application.
  - `hooks/useProposeWorkout.ts` keeps the constrained workout-proposal tool registered while dynamically loading the planner only when it executes.
  - `ui/SummonSurface.tsx` — the bottom-sheet command surface (opened by `PresenceMark`).
  - `ui/ArtifactRenderer.tsx` + `ui/artifacts/*` — the **artifact registry** (`Record<CoachArtifact["type"], renderer>`, a missing renderer is a compile error) and inline artifact renderers (`VolumeChartArtifact`, `WorkoutDraftArtifact`). Artifact UI calls `applyArtifact(artifact)`; it never names an apply handler.
- Agent/runtime layer:
  - `agent/contracts.ts` for typed message, tool, `ScreenContext`, and `CoachArtifact` contracts
  - `agent/screenContext.ts` for the read-only screen-context type + client assembler + prompt formatter
  - `agent/transport.ts` for frontend request boundary (sends `screenContext`)
  - `agent/tools.ts` for the **Coach tool registry** (`coachToolRegistry`): the single env-free spine of `CoachToolDescriptor`s. `as const satisfies Record<CoachToolName, …>` makes a missing tool a compile error and single-sources the execution environment (no separate execution map). Also exports `ClientCoachToolName` / `CoachClientToolRunners`.
  - `agent/runtime.ts` for the server-side AI SDK tool loop: builds the tool set by iterating the registry, attaching `execute` only to server tools via the `coachServerExecutors` map (injects `ScreenContext`, emits artifacts).
  - Tool registry seam (see CONTEXT.md "Coach tool registry"): adding a Coach tool is one registry entry + one pure builder (client) or one `coachServerExecutors` entry (server) + (if it draws something) one artifact-registry entry; the compiler flags any omission.
- Data:
  - `data/guidanceRepository.ts`
  - `data/toolBuilders.ts` — pure client-tool builders (`buildProgramDraft`, `buildProgramEdit`, `buildActiveWorkoutEdit`, `buildProgramContextMessage`, `buildExerciseDraft`); validated input + injected catalog/program/workout deps → `CoachToolResultPayload` (or throws). The unit-test surface for client Coach tools (`toolBuilders.test.ts`). No React/Supabase.
  - `data/workoutCandidates.ts` — pure equipment/injury candidate filtering (`filterCandidateExercises`) + recovery mobility/stability selection (`selectRecoveryExercises`); unit-tested in `workoutCandidates.test.ts`. No React/Supabase.
  - `data/llmPreferences.ts`

Current Coach architecture:
- Uses `/api/coach`.
- Conversation state is ephemeral (owned by `PresenceAgentProvider`, used by lazy `PresenceAgentRuntime`, persists across navigation, fresh each launch — no storage).
- Each turn sends a read-only `ScreenContext` (route + screen + small focus hints); the runtime injects it into the system prompt. It grants no write access.
- Tool results may carry a typed `CoachArtifact`; a client `ArtifactRenderer` registry renders them inline. Tool calls/results are surfaced in the summon surface (not dropped).
- Supports both server-executable and client-executable tools.
- Supports BYOK hosted providers through `data/llmPreferences.ts`: OpenRouter, OpenAI, Anthropic, and Google.
- Provider API keys are stored client-side in localStorage via `data/providerKeyStore.ts` and sent in each Coach request body. The server uses the key per-turn and never persists it.
- Current tools:
  - `propose_workout` (client) — builds a draft session honoring `ScreenContext` plus model-supplied constraints (`focus`, `durationMinutes`, `targetArchetypes`, `avoidArchetypes`, `availableEquipment` for no-gym/home setups, `avoidMuscles` which excludes only PRIMARY-muscle matches so complementary work stays; `focus: recovery` builds a mobility/stability session; schema `proposeWorkoutInputSchema` in `agent/tools.ts`) and returns a `workout_draft` artifact; does NOT save. Constraints + a random tie-break in exercise selection mean identical asks vary instead of returning a fixed session. The artifact's Apply commits via the existing create-workout flow (`buildWorkoutPlan` → `commitWorkoutPlan` in `useWorkoutGenerator.ts`).
  - `get_training_volume` (server) — current-week archetype volume via the `fetch_weekly_archetype_sets_v2` RPC; returns a `volume_chart` artifact.
  - `get_user_profile_summary` (server) — also returns active `user_facts` and the background fields (`experience_level`, `training_age_years`).
  - `get_recent_workout_summary` (server)
  - `get_program_context` (client) — active program structure + exercise catalog grouped by archetype; the model must call it before drafting/editing so it uses exact catalog names.
  - `propose_program` (client) — the model authors a full mesocycle draft as tool input; client resolves exercise names (unresolved names bounce back as tool errors) and returns a `program_draft` artifact. Apply saves via `saveDraftedProgram` (protocol `coach`).
  - `propose_program_edit` (client) — replace/add/remove/update-targets ops against the active program; returns a `program_edit` before/after artifact. Apply persists via `applyProgramEdits`; editing an `occams`/`custom` program converts it to `coach`.
  - `propose_active_workout_edit` (client) — swap/add/remove against the in-progress Redux workout; returns a `workout_edit` artifact. Apply dispatches workout-slice actions.
- Proactive layer (sub-project 4): deterministic gates run on app open / workout finished (`hooks/useProactiveEngine.ts` + pure `data/proactiveGates.ts`); insights are template-composed in code (no LLM call until the user engages), tiered `pulse` (orb glow) or `peek` (one-line chip `ui/PresencePeek.tsx`, mounted in `MainAppLayout`); engagement summons the surface and sends a seeded prompt; dismiss/engage cooldowns persist in localStorage (`data/proactiveCooldowns.ts`). Propose-only — the engine never mutates anything. The orb's attention state is conversation attention ∪ pending proactive insights. Insights persist in the surface until engaged/dismissed/replaced (they are no longer cleared on open); the active insight is surfaced inside `SummonSurface` as a solid-green starter (empty state) or a pinned row above the input (mid-conversation). Dev tools (a `Dev` tab in the surface, gated by `useIsDeveloper`/`profiles.role`) can force any insight in regardless of gate/cooldown and reset cooldowns (`useProactiveEngine` `devTriggerInsight`/`devResetCooldowns`, samples in `data/proactiveDevSamples.ts`, `data/proactiveCooldowns.ts` `clearCooldowns`).
- Acting layer (sub-project 3): all mutations are confirm-only (explicit Apply) and recorded in `coach_change_log` with one-tap revert. Key seams:
  - `data/coachMutations.ts` — the **Coach mutation registry** (see CONTEXT.md): one command descriptor per `CoachChangeType` owning `apply`, `revert`, `canRevert`, and the zod payload schema both sides share (apply writes it, revert parses it — drift is a compile error, malformed legacy rows fail the parse cleanly). Unit-tested in `coachMutations.test.ts` (repo mocked).
  - `hooks/useCoachMutations.ts` — the one apply path: `applyMutation(changeType, input)` runs the command then the shared tail (change-log insert, declared invalidations, toast). `applyArtifact` in `PresenceAgentRuntime` routes program/workout artifacts here.
  - `hooks/useProgramActions.ts` — client propose/context tool implementations (I/O for the pure builders; no apply handlers anymore).
  - `hooks/useCoachChangeLog.ts` + `ui/ChangeLogPanel.tsx` — change list + revert (surface's "Changes" toggle); revert dispatches through the mutation registry.
  - `data/changeLogRepository.ts` — `coach_change_log` CRUD.
  - `data/workoutEditActions.ts` — typed Redux edit actions shared by apply and revert.
  - `ui/artifacts/ProgramDraftArtifact.tsx`, `ProgramEditArtifact.tsx`, `WorkoutEditArtifact.tsx`.

### `src/domains/periodization`

- Purpose: mesocycles, session templates, progression blocks.
- Protocols: `occams` and `custom` are template-managed (re-seeded/synced on load); `coach` is agent-authored and never re-seeded. Applying a Coach edit to a template-managed program converts it to `coach`.
- Data:
  - `data/repository.ts`
    - Seeds focus-aware `Workout A/B/C` session templates for custom mesocycles (hypertrophy + strength blueprints) and keeps Occam templates synced when present.
    - Coach acting boundaries: `saveDraftedProgram` (insert a drafted `coach` program + sessions/exercises), `applyProgramEdits` (snapshot-first ops on session exercises), `revertProgramCreation`, `revertProgramEdits`.
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
  - `src/domains/guidance/hooks/PresenceAgentProvider.tsx` (client presence/context owner)
  - `src/domains/guidance/hooks/PresenceAgentRuntime.tsx` (lazy client send-loop/tool/proactive owner)
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
  - coach acting layer: `mesocycles.protocol` CHECK extended with `coach`; `coach_change_log` table (RLS owner-only) for applied Coach mutations + revert payloads.
  - exercise taxonomy v2: muscle roles (`primary`/`secondary`/`stabilizer`) on `exercise_muscle_groups`, `exercises.compatible_equipment text[]` (OR-semantics; empty = unknown), `get_exercise_primary_muscle_map` RPC, ~70-movement global catalog incl. mobility/stability categories (archetype NULL by rule for cardio/mobility/stability).
  - access role: `profiles.role` (`user`/`developer`/`admin`, default `user`). A `profiles_guard_role` BEFORE UPDATE trigger silently reverts role changes made by the `authenticated` PostgREST role, so users cannot self-grant; only privileged connections (dashboard/service_role) set it. Gates dev-only UI via `useIsDeveloper` (`src/domains/account/hooks/useIsDeveloper.ts`).
  - breathwork: `exercises.exercise_category` CHECK extended with `breathwork`; migration `20260703185237_add_breathwork_exercises.sql` seeds four global exercise rows. Applied to the linked project via MCP `apply_migration` (recorded version `20260703185237`; local filename renamed to match to keep `db push` aligned).
- Migration history is reconciled: local `supabase/migrations` version prefixes now match the remote `schema_migrations` table exactly, and `user_provider_credentials` (dead since BYOK keys moved to localStorage) was dropped via migration `20260614065001`.
- Migrations applied via the Supabase MCP `apply_migration` get an MCP-assigned timestamp version, not the local filename's version. To keep history aligned, after applying via MCP, rename the local migration file to the version MCP recorded (check `schema_migrations`). Drift is what previously broke `db push`.
- Local `src/lib/integrations/supabase/types.ts` is hand-maintained and still lists the dropped `user_provider_credentials` table; regenerate it (e.g. `supabase gen types typescript --linked`) to remove the stale entry.

## Known Debt / Hotspots

- `goals` and `rpg` are still placeholders.
- Some fitness UI is still more stateful than ideal.
- `README.md` and `docs/plan.md` may lag implementation details after large refactors.
- Test coverage is an early foundation only: Vitest covers seven data seams (fitness recommendations, fitness workout commit, guidance proactive gates, guidance tool builders, guidance coach mutations, dashboard home model, analytics volume progress). Most domains, hooks, and UI have no tests.
- Accepted Dependabot advisories (do not re-chase): after `npm audit fix`, ~14 remain, all dev-only or non-exploitable in the shipped browser bundle, none fixable without a breaking change:
  - **`@vercel/node` chain** (`tar`, `undici`, `tsx`, `path-to-regexp`, `@vercel/nft`, `@mapbox/node-pre-gyp`, `ajv`, `@vercel/static-config`): a serverless-build toolchain pulled in solely for the two type imports in `api/coach.ts`. Even `@vercel/node@5` still ships these vulnerable transitives, so the only fix is dropping the package — deliberately kept for deploy stability / standard typing.
  - **`esbuild`/`vite`**: the esbuild advisory affects only the dev server (`npm run dev`); fix is a `vite` 5→7 major (PWA/swc-plugin compat risk), deferred to its own pass.
  - **`uuid`**: advisory is `v3/v5/v6`-only; this app imports `v4` exclusively.

## Verification Workflow

Run these sequentially, not in parallel:

1. `npm run build`
2. `npm run lint`
3. `npm test` (Vitest, safe to run independently of build/lint)

Current expected lint baseline:
- 8 warnings, 0 errors
- warnings are `react-refresh/only-export-components` in shared UI/provider files (6 vendored shadcn core components that co-locate `cva` variants, plus `ThemeProvider`/`AuthProvider` which export their hook alongside the provider). Left as-is: forking vendored shadcn fights upstream, and extracting the provider hooks would churn 20+ consumer imports for a benign dev-only HMR hint.

## When To Update This File

Update `CODEMAP.md` whenever any of these change:

- route ownership
- domain entrypoints
- state ownership
- architecture guardrails
- agent/runtime boundaries
- verification baseline

If the change would affect how a new session should orient itself, this file should change in the same PR.
