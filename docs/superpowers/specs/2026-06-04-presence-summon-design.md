# Presence Shell + Context-Aware Summon Design (Sub-project 2)

Status: detailed design for sub-project 2 of the STRATOS AI-first vision
(`2026-05-31-stratos-ai-first-vision-design.md`). Builds directly on sub-project 1
(`2026-05-31-living-profile-design.md`, shipped) and the existing Coach runtime.

Date: 2026-06-04

## Goal

Replace the `/coach` page with a single **presence mark** on every screen that opens a
**summon surface** — a context-aware, tool-equipped command surface that holds a
conversation, renders real artifacts inline (a chart, a workout draft), and can drive
the UI. The agent earns its place through synthesis and action, never lookup.

This is the chassis the later "act" (sub-project 3) and "proactive" (sub-project 4)
layers plug into. It is **read / synthesize / render / drive-UI only** — it does not
edit existing programs or workouts. Mutations, a change log, and undo are sub-project 3.

## Scope summary

v1 capability set is **"synthesis + adapt"**:

- Global presence mark + bottom-sheet summon surface, replacing `/coach`.
- A screen-context payload (where you are + a few safe hints) sent to the agent.
- Read tools: profile summary, recent workouts, **training volume** (new).
- Inline artifacts: **volume chart** and **workout draft** (new), via a typed artifact
  contract and a client renderer registry.
- Drive-UI: navigation via the existing tool-result `nextRoute` channel.
- The deprecated "+" quick-action FAB's functions move into the surface as one-tap
  chips (no LLM round-trip).

## Decisions

- **Replace `/coach`.** The presence mark + summon surface becomes the only coach
  surface. The `/coach` nav item, route, and `pages/Coach.tsx` are removed; the
  existing `Chat` body and message rendering are folded into the surface.
- **Presence mark = a floating orb, bottom-right**, above the bottom nav on mobile and
  bottom-right on desktop. Present on all protected routes. Tap toggles the surface.
  It is a presence, not a nav tab. Removing Coach leaves four tabs: Home · Workout ·
  Analytics · Profile.
- **Summon surface = a bottom sheet** (peek ↔ full drag height), using the app's
  existing drawer/sheet primitive. Layout: grip → quick-action chips → conversation +
  inline artifacts → pinned input. It is structured so it can swap to a full-screen
  presentation later **without rewiring logic** (fallback if the sheet feels clunky).
- **The deprecated "+" FAB is removed**; its actions (Start Workout, Log Single
  Exercise, Log Protein, Log Sun) become one-tap chips in the surface, wired to the
  existing `useQuickActions` handlers. These are deterministic and never go through the
  LLM.
- **Conversation is fresh each launch.** It lives in app state and persists across
  navigation (required for a global presence) but is **not** persisted across reload.
  No history storage, no schema. Saved/server threads are explicitly deferred.
- **State lifts to a `PresenceAgentProvider`** (React context at the protected-shell
  root), not a Redux slice. The conversation is ephemeral and not shared across
  domains; a context keeps the large message array out of Redux and matches the
  no-persistence decision. The send/client-tool loop currently in `useCoachScreen`
  moves here largely intact.
- **Screen context is read-only.** A typed `ScreenContext` (route + semantic screen +
  a small whitelist of focus hints) is sent each turn and injected into the system
  prompt. It never grants write access. `focus` is kept deliberately small in v1.
- **Artifacts ride the existing tool-result `data` channel.** `CoachToolResultPayload`
  gains an optional typed `artifact` (discriminated union). No separate "render" tool —
  data tools attach an artifact; a client `ArtifactRenderer` registry maps
  `artifact.type` to a component. The agent-state message handling, which today
  **drops** `tool_result` messages from the rendered view, changes to surface results
  that carry an artifact.
- **`propose_workout` renders a draft, it does not save.** It replaces the existing
  `generate_strength_workout` client tool, honoring `ScreenContext` + constraints (time
  available, sore area) and returning a `workout_draft` artifact. This requires
  splitting today's `generateStrengthWorkout` flow (which currently *builds and commits*
  in one step) into **build a draft plan** (the tool) and **commit the plan** (the
  Apply handler). The artifact's **Apply** button runs the commit step — the same
  create-workout behavior that exists today — and navigates to `/workout`. Generation =
  synthesis (a visible proposal); applying = the single create action that already
  exists. Editing existing programs stays in sub-project 3.
- **Client/server split follows the established pattern.** Data reads run server-side
  (Supabase + RLS via the user's access token). Artifact rendering, Apply, and
  navigation run client-side.
- **Ownership unchanged.** The `guidance` domain owns the agent, tools, runtime, and
  the summon surface UI. Only the *mount point* (orb + sheet inside the protected
  shell) is app-level layout. Route files stay thin.

## Assumptions

- The app's existing sheet/drawer primitive (shadcn/`vaul` or radix dialog-based) can
  back a draggable bottom sheet; if a true drag handle is not already available, v1 may
  ship fixed peek/full snap points rather than free-drag, without changing the contract.
- `useQuickActions` (today feeding the FAB in `MainAppLayout`) can be consumed from the
  surface; its handlers and the dialogs they open remain unchanged.
- The analytics volume/archetype repository functions already used by
  `useCoachScreen.generateWorkoutOnDemand` (`fetchWeeklyArchetypeSets`,
  `buildVolumeProgressDisplayData`, `getCurrentWeekRange`) are sufficient to back both
  `get_training_volume` and `propose_workout`.
- BYOK provider configuration and the credential-status flow are unchanged; the surface
  reuses the existing provider-config checks.
- Local Supabase (Docker) is running for any work that exercises the data tools.

## Architecture

### Components (UI)

- **`PresenceMark`** (`components/layout`) — floating orb, `fixed` bottom-right, z-index
  above the bottom nav. Idle state now; an animated "quiet pulse" state is present in
  the component API but only *driven* in sub-project 4. Consumes `PresenceAgentProvider`
  for open/toggle.
- **`SummonSurface`** (`domains/guidance/ui`) — bottom sheet. Sections: grip,
  quick-action chip row, conversation list (`Chat` body reused), pinned input bar.
  Renders artifacts via `ArtifactRenderer`. Built to allow a full-screen presentation
  swap without logic changes.
- **`ArtifactRenderer`** (`domains/guidance/ui`) — maps `artifact.type` to a renderer:
  - `artifacts/VolumeChartArtifact.tsx` — reuses existing analytics chart components.
  - `artifacts/WorkoutDraftArtifact.tsx` — reuses workout-card styling; renders the
    draft and an **Apply** action.

### State

- **`PresenceAgentProvider`** (`domains/guidance`, mounted in `ProtectedAppShell`):
  owns surface open/height, `conversation`, `isLoading`, `statusMessage`,
  provider-config status; exposes `summon`, `dismiss`, `send`, and quick-action
  passthroughs. The send loop, client-tool execution, and config checks move here from
  `useCoachScreen`. No persistence (fresh each launch).

### Agent contract changes (`domains/guidance/agent`)

- **`ScreenContext`** type + zod schema; added as an optional field on
  `CoachAgentRequest`. The provider assembles it from `useLocation` + Redux selectors
  at send time. The runtime injects it into the system prompt ("Current context: …").
- **`CoachArtifact`** discriminated union (v1):
  - `{ type: "volume_chart"; title; series; range }`
  - `{ type: "workout_draft"; title; exercises[]; rationale; apply }`
  - (`profile_readout` noted as a future add, out of v1.)
- **`CoachToolResultPayload`** gains optional `artifact: CoachArtifact`; schemas updated.

### Tools (v1)

| Tool | Exec | Status | Behavior |
|------|------|--------|----------|
| `get_user_profile_summary` | server | kept | reads facts + background (from SP1) |
| `get_recent_workout_summary` | server | kept | unchanged |
| `get_training_volume` | server | new | reuses analytics volume RPCs; returns data + `volume_chart` artifact |
| `propose_workout` | client | new (replaces `generate_strength_workout`) | builds a session honoring `ScreenContext` + constraints; returns a `workout_draft` artifact; does **not** save |

Drive-UI navigation is **not a discrete tool** — it rides the existing `nextRoute`
field on tool-result payloads (e.g. Apply navigates to `/workout`). `workout_draft`
**Apply** runs the commit step of the split generate flow (today's
`generate_strength_workout` behavior) and navigates to `/workout`.

## File Structure

**Create:**
- `src/components/layout/PresenceMark.tsx`
- `src/domains/guidance/ui/SummonSurface.tsx`
- `src/domains/guidance/ui/ArtifactRenderer.tsx`
- `src/domains/guidance/ui/artifacts/VolumeChartArtifact.tsx`
- `src/domains/guidance/ui/artifacts/WorkoutDraftArtifact.tsx`
- `src/domains/guidance/hooks/PresenceAgentProvider.tsx` (context + state; exact path
  finalized in the plan)
- `ScreenContext` type + assembler (in `domains/guidance/agent` + a small client
  assembler hook)

**Modify:**
- `src/domains/guidance/agent/contracts.ts` — `ScreenContext`, `CoachArtifact`, extend
  `CoachToolResultPayload` + request schema.
- `src/domains/guidance/agent/tools.ts` — add `get_training_volume`, `propose_workout`;
  reconcile with the existing `generate_strength_workout`.
- `src/domains/guidance/agent/runtime.ts` — new server tool(s), inject `ScreenContext`
  into instructions, emit artifacts.
- `src/domains/guidance/agent/transport.ts` — pass `screenContext`.
- the agent state hook (from `useCoachScreen`) — surface `tool_result` artifacts instead
  of dropping them; move logic into `PresenceAgentProvider`.
- `src/components/layout/navigationItems.ts` — remove the Coach item.
- `src/components/layout/MainAppLayout.tsx` — mount `PresenceMark` + `SummonSurface`,
  remove the `/coach` route and the `shouldShowGlobalFab` "+" FAB block.
- `src/components/layout/ProtectedAppShell.tsx` — wrap with `PresenceAgentProvider`.
- `CODEMAP.md`.

**Delete:**
- `src/pages/Coach.tsx` (and fold `CoachScreen` into the surface; keep `Chat` /
  `ChatPrimers` as reused building blocks).

## Verification

This repo has **no test runner**. Per `AGENTS.md`, verification is sequential:

1. `npm run build`
2. `npm run lint` (never in parallel — Vite's transient timestamped config breaks
   ESLint with `ENOENT`; expected baseline is 8 warnings, 0 errors)

Each task is verified with build + lint + an explicit **manual check**. Local Supabase
(Docker) must be running for data-tool work. Do not introduce a test framework and do
not claim test coverage.

## CODEMAP Maintenance

Update `CODEMAP.md` in the same change for: route map (remove `/coach`; note the
presence surface is global, not a route), state ownership (`PresenceAgentProvider`),
guidance domain entrypoints (summon surface + artifacts), the Coach agent/runtime
boundary (ScreenContext + artifact contract), and the removal of the global "+" FAB.

## Out of Scope (this sub-project)

- Editing existing workouts/programs/mesocycles; change log; undo (sub-project 3).
- The proactive engine and the pulse/peek/self-expand tiered surfacing behavior; the
  mark's pulse state exists in the API but is not driven here (sub-project 4).
- Conversation persistence across reload, server-side thread history, cross-device
  history.
- A `profile_readout` artifact and multi-signal recovery/overtraining readouts.
- Background/scheduled runs and push (deferred by the vision).

## Success Criteria

- The presence orb appears on every protected screen; tapping it opens the summon
  surface; the surface persists its conversation across navigation within a session.
- `/coach` (route, nav item, page) and the global "+" FAB are gone; the FAB's four
  actions work as one-tap chips in the surface.
- Asking a synthesis question (e.g. "why has my bench stalled?") can return a
  `volume_chart` rendered inline.
- Asking for an adapted session (e.g. "35 min, shoulder's cranky") returns a
  `workout_draft` rendered inline; **Apply** creates the workout and navigates to
  `/workout`; no existing program is edited.
- The agent receives current-screen context each turn.
- `npm run build` and `npm run lint` pass at the expected baseline.
