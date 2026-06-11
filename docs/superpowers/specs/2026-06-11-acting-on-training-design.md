# Acting on Training Design (Sub-project 3)

Status: detailed design for sub-project 3 of the STRATOS AI-first vision
(`2026-05-31-stratos-ai-first-vision-design.md`). Builds on sub-project 2
(`2026-06-04-presence-summon-design.md`, shipped). Supersedes the
`2026-05-26-coach-program-builder-design.md` spec, which predates the presence
surface; its draft-and-confirm discipline and catalog-resolution rules are retained,
its guided-intake form and `/coach`-screen UI are dropped.

Date: 2026-06-11

## Goal

Give the Coach the ability to **act on training structures** — create a full training
program, edit the active program, and edit the in-progress workout — with every
mutation behind an explicit confirm, recorded in a visible change log, and revertible
in one tap.

## Decisions

- **Confirm-only autonomy in v1.** Every mutation is proposed as an artifact with an
  Apply action. No auto-applied changes; the auto-tier arrives with sub-project 4.
- **Conversational program builder, no intake form.** Profile facts (goals,
  constraints, schedule, equipment — sub-project 1) plus chat questions replace the
  old structured intake. The model authors the program draft directly as validated
  tool input.
- **Mid-workout editing is in scope.** A client tool proposes swaps/adds/removals
  against the active Redux workout; Apply dispatches existing workout-slice actions.
- **The change log lives in the summon surface.** A "Changes" entry point opens the
  log; each entry shows what changed and a Revert control.
- **New `coach` mesocycle protocol.** Coach-drafted programs save with
  `protocol = 'coach'` (migration extends the CHECK constraint). This keeps them out
  of the `custom`-protocol template re-seeding path in `getActiveMesocycleProgram`,
  which would otherwise upsert fixed `Workout A/B/C` templates into a drafted
  program on every load. Existing `occams`/`custom` behavior is untouched.
- **Unresolved exercise names block, never invent.** Draft and edit tools resolve
  exercise names against the existing catalog (same normalized-name matching the
  periodization repository already uses). Unresolved names return as an error tool
  result listing the failures plus available alternatives; the model revises. Tools
  never create catalog exercises.
- **All proposal tools are client-executed.** They validate against client-side data
  (catalog cache, active program query, Redux workout) and return artifacts. This
  follows the `propose_workout` pattern; the server runtime needs no new Supabase
  logic.

## Assumptions

- The remote `mesocycles` / `mesocycle_sessions` / `mesocycle_session_exercises`
  schema matches `supabase/migrations/20260226000001` (+ `...000002/3`). Per the
  database workflow rules, verify against the linked project before applying the
  migration.
- `stepCountIs(6)` and the existing client-tool round-trip
  (`client_tool_required` → execute → resend) accommodate the two-step flows here
  (read context → propose). One client tool per turn remains the rule.
- The workout-slice actions `addExerciseToWorkout`, `replaceWorkoutExercise`, and
  `deleteWorkoutExercise` are sufficient for mid-workout edit ops.

## Capabilities

### 1. Create a program (`propose_program`)

Flow: the user asks for a program (or the Coach suggests one when none is active).
The model reads `get_program_context` (below), asks any missing questions in chat,
then calls `propose_program` whose **input is the full draft**:

```ts
interface ProgramDraftInput {
  name: string;
  goalFocus: SessionFocus;            // existing union
  durationWeeks: number;              // 4–12, validated
  notes?: string;
  rationale: string;                  // shown on the artifact
  sessions: Array<{
    name: string;
    sessionFocus?: SessionFocus | null;
    setsPerExercise?: number | null;
    repRange?: string | null;
    progressionRule?: string | null;
    exercises: Array<{
      exerciseName: string;           // resolved against catalog
      targetSets?: number | null;
      targetReps?: string | null;
      loadIncrementKg?: number | null;
      notes?: string | null;
    }>;
  }>;
}
```

Client execution validates with zod, resolves every `exerciseName`, and either:

- returns an **error tool result**: unresolved names + a compact list of catalog
  alternatives (the model retries), or
- returns a `program_draft` artifact carrying the resolved draft (exercise ids
  attached) for review.

**Apply** calls `saveDraftedProgram` (periodization), writes a change-log entry,
invalidates the `activeMesocycleProgram` query, and confirms in the surface.
`start_date` is set at save time (today), not model-authored.

### 2. Edit the active program (`propose_program_edit`)

Input is a list of operations against the active program:

```ts
type ProgramEditOp =
  | { op: "replace_exercise"; sessionName: string; exerciseName: string; newExerciseName: string }
  | { op: "add_exercise"; sessionName: string; exerciseName: string;
      targetSets?: number | null; targetReps?: string | null }
  | { op: "remove_exercise"; sessionName: string; exerciseName: string }
  | { op: "update_targets"; sessionName: string; exerciseName: string;
      targetSets?: number | null; targetReps?: string | null; loadIncrementKg?: number | null };
```

Client execution validates ops against the actual active program (session and
exercise must exist; new names must resolve) and returns a `program_edit` artifact
rendering each op as a before → after line. **Apply** calls `applyProgramEdits`,
which snapshots the affected sessions' exercise rows first, applies the ops, and
logs the change with the snapshot for revert.

**Editing a template-managed program converts it to `coach`.** `occams` and
`custom` programs are re-synced to their fixed templates on every load
(`ensureOccamsProtocolSessions` / `ensureCustomProtocolSessions`), which would
silently overwrite any edit. Applying a program edit to one of them therefore also
sets `protocol = 'coach'` (recorded in the change-log payload and restored on
revert), and the artifact states this plainly ("this takes the program off the
Occam template"). Template management ends when you customize; programs already on
`coach` just take the edit.

### 3. Edit the in-progress workout (`propose_active_workout_edit`)

Input ops: `swap_exercise`, `add_exercise`, `remove_exercise` (by exercise name,
resolved against catalog; swap targets an exercise currently in the active workout).
Client execution validates against the Redux `workout` slice state and returns a
`workout_edit` artifact. **Apply** dispatches the corresponding slice actions and
logs the change with the **inverse ops** so revert can re-dispatch them. Revert is
only offered while the same workout is still active; afterwards the entry shows as
no longer revertible.

### 4. Read tool: `get_program_context` (client)

Returns the active program summary (name, protocol, week, sessions with exercises
and targets, next session) plus the exercise catalog names grouped by movement
archetype. The model calls this before drafting or editing so it works from real
names and real structure. Reuses `getActiveMesocycleProgram` and the guidance
catalog fetchers through the React Query cache.

## Change log

### Storage

New table `coach_change_log` (one migration, together with the protocol CHECK
extension):

```sql
create table public.coach_change_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  change_type text not null check (change_type in ('program_created','program_edited','workout_edited')),
  summary text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  reverted_at timestamptz
);
-- RLS: owner-only select/insert/update.
```

`payload` per type:

- `program_created`: `{ mesocycleId, previousActiveMesocycleId, previousActiveStatusBefore }`
- `program_edited`: `{ mesocycleId, ops, snapshot, protocolBefore }` where
  `snapshot` is the affected sessions' exercise rows before the edit and
  `protocolBefore` records a template→`coach` conversion for revert
- `workout_edited`: `{ workoutClientId, ops, inverseOps }` (client-side only)

### Revert mechanics

- `program_created` → set the created mesocycle `status = 'cancelled'`; if a
  previous active program was displaced, restore its prior status to `'active'`.
- `program_edited` → delete the affected sessions' current exercise rows and
  reinsert the snapshot (same delete+insert pattern `syncSessionExercises` uses);
  restore `protocolBefore` if the edit converted the program to `coach`.
- `workout_edited` → dispatch the stored inverse ops; disabled when the workout is
  no longer the active one.

Reverting sets `reverted_at`; reverted entries render struck-through with a
"Reverted" badge. Revert is one level (no revert-of-revert).

### UI

- `ChangeLogPanel` (`domains/guidance/ui`) — list of entries (summary, relative
  time, Revert button / Reverted badge), opened from a "Changes" affordance in the
  summon surface header area next to the quick-action chips.
- Data via `changeLogRepository.ts` (`domains/guidance/data`) + a
  `useCoachChangeLog` hook (list query + revert mutation).

## Architecture changes

### `guidance` domain

- `agent/contracts.ts` — add tool names (`get_program_context`, `propose_program`,
  `propose_program_edit`, `propose_active_workout_edit`); add `CoachArtifact`
  variants `program_draft`, `program_edit`, `workout_edit`; extend zod schemas.
- `agent/tools.ts` — definitions (all client-executed) with the input schemas
  above; `CoachToolContext` gains `getProgramContext`, `proposeProgram`,
  `proposeProgramEdit`, `proposeActiveWorkoutEdit`.
- `agent/runtime.ts` — register the new tools as client tools (no `execute`);
  extend the instructions block with usage rules (read context first; never invent
  exercise names; drafts/edits are proposals the user applies; never claim a save
  happened).
- `hooks/useProgramActions.ts` (new) — client implementations: context read, draft
  validation/resolution, edit validation, apply/save handlers (the
  `useProposeWorkout` pattern).
- `hooks/PresenceAgentProvider.tsx` — wire new tool context entries + apply
  handlers (`applyProgramDraft`, `applyProgramEdits`, `applyWorkoutEdit`) exposed
  through `usePresenceAgent`.
- `ui/artifacts/ProgramDraftArtifact.tsx`, `ProgramEditArtifact.tsx`,
  `WorkoutEditArtifact.tsx` — renderers registered in `ArtifactRenderer`.
- `ui/ChangeLogPanel.tsx` + `data/changeLogRepository.ts` + `hooks/useCoachChangeLog.ts`.
- `ui/SummonSurface.tsx` — "Changes" entry point.

### `periodization` domain

- `data/repository.ts`:
  - `saveDraftedProgram(userId, resolvedDraft)` — deactivates the current active
    mesocycle (status `'completed'`), inserts the `coach`-protocol mesocycle, its
    sessions (ordered), and exercise rows; returns ids needed for the change-log
    payload. Reuses the existing insert patterns; no template seeding.
  - `applyProgramEdits(userId, mesocycleId, resolvedOps)` — applies ops to
    `mesocycle_session_exercises` (and snapshots first).
  - **Seeding guard:** `getActiveMesocycleProgram` runs template ensure-sync only
    for `occams`/`custom`, never `coach` (no change to existing protocols).
- `data/types.ts` — add `'coach'` to `MesocycleProtocol`; types for the drafted
  program input and edit ops.

### Migration

One file: extend `mesocycles_protocol_check` to `('occams','custom','coach')`;
create `coach_change_log` with RLS. Verify remote schema via the linked Supabase
project first, per the database workflow rules.

## Error handling

- Unresolved exercise names → error tool result with the names and nearby catalog
  options; Apply is never reachable with unresolved names.
- `durationWeeks` outside 4–12, empty sessions, or empty exercises → zod/validation
  error tool result.
- Program edit with no active program, or ops referencing missing
  sessions/exercises → error tool result naming the mismatch.
- Workout edit with no active workout → error tool result.
- Save/apply failure → artifact stays with a retryable error message; no
  change-log entry is written for a failed apply.
- Revert failure → toast with the error; entry stays unreverted.
- Change-log write failure after a successful apply → the apply stands; surface a
  non-blocking warning (the log is an audit aid, not a transaction participant).

## Out of scope

- Auto-applied (tiered-autonomy) changes, proactive triggers, pulse/peek surfacing
  (sub-project 4).
- Editing completed workout history or non-active mesocycles.
- Creating new catalog exercises from drafts.
- Server-side LLM drafting; multi-block periodization planning.
- Change-log retention/pruning policy.

## Verification

No test runner exists; do not claim test coverage. Sequentially:

1. `npm run build`
2. `npm run lint` (baseline: 8 react-refresh warnings, 0 errors)

Manual checks per milestone: draft a program conversationally (with an
intentionally bogus exercise name to see the model self-correct), apply it, confirm
`/workout` generation uses it; edit the program and revert from the change log;
swap an exercise mid-workout, undo it; confirm `occams`/`custom` programs still
load and re-seed as before.

## CODEMAP maintenance

Update in the same change: guidance tool list + artifact types, the new
`useProgramActions`/change-log seams, periodization repository entrypoints
(`saveDraftedProgram`, `applyProgramEdits`, the `coach` protocol), migration note,
and the summon-surface "Changes" entry point.

## Success criteria

- Asking "build me a program" yields a conversational intake (only for genuinely
  missing info), then a reviewable program draft; Apply activates it and the
  workout generator uses it for the next session.
- "Swap bench for something shoulder-friendly in my program" yields a before/after
  edit card; Apply persists it; the change appears in the log and Revert restores
  the prior state.
- Mid-workout, "swap overhead press, shoulder's cranky" yields a swap card; Apply
  updates the live workout; Revert (undo) restores it while the workout is active.
- Every applied change appears in the summon-surface change log with an accurate
  summary; no mutation happens without an explicit Apply.
- The model never saves invented exercise names; unresolved names visibly bounce
  back into the conversation.
- Build and lint pass at the expected baseline.
