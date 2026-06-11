# Acting on Training (Sub-project 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Coach create a full training program, edit the active program, and edit the in-progress workout — every mutation behind an explicit Apply, recorded in `coach_change_log`, revertible in one tap from the summon surface.

**Architecture:** Four new client-executed Coach tools (`get_program_context`, `propose_program`, `propose_program_edit`, `propose_active_workout_edit`) follow the existing `propose_workout` pattern: the model authors validated tool input, the client resolves exercise names against the catalog and returns artifacts (`program_draft`, `program_edit`, `workout_edit`); Apply handlers run through new periodization save/edit boundaries and write change-log entries. A new `coach` mesocycle protocol keeps drafted programs out of the fixed-template re-seeding path.

**Tech Stack:** React 18 + TS, Redux Toolkit, React Query, zod, Supabase (RLS), Vercel AI SDK tool loop (unchanged).

**Spec:** `docs/superpowers/specs/2026-06-11-acting-on-training-design.md`

---

## Repo verification rules (apply to every task)

This repo has **no test runner** and AGENTS.md forbids adding one or claiming test coverage. Each task's verification is, **sequentially, never in parallel**:

1. `npm run build` — must pass
2. `npm run lint` — baseline: **8 warnings (react-refresh), 0 errors**

Supabase tables added after the generated types use the established `from('table' as never)` cast pattern (see `periodization/data/repository.ts`).

## File structure

**Create:**
- `supabase/migrations/20260611000001_add_coach_protocol_and_change_log.sql`
- `src/domains/guidance/data/changeLogRepository.ts` — change-log CRUD
- `src/domains/guidance/data/workoutEditActions.ts` — typed Redux edit actions + dispatcher (shared by apply + revert)
- `src/domains/guidance/hooks/useProgramActions.ts` — client tool implementations + Apply handlers
- `src/domains/guidance/hooks/useCoachChangeLog.ts` — change-log query + revert mutation
- `src/domains/guidance/ui/ChangeLogPanel.tsx`
- `src/domains/guidance/ui/artifacts/ProgramDraftArtifact.tsx`
- `src/domains/guidance/ui/artifacts/ProgramEditArtifact.tsx`
- `src/domains/guidance/ui/artifacts/WorkoutEditArtifact.tsx`

**Modify:**
- `src/domains/periodization/data/types.ts` — `'coach'` protocol; draft/edit/snapshot types
- `src/domains/periodization/data/repository.ts` — `saveDraftedProgram`, `applyProgramEdits`, `revertProgramCreation`, `revertProgramEdits`
- `src/lib/types/workout.ts:190` + `src/state/workout/workoutSlice.ts:20` — widen protocol literal
- `src/domains/guidance/agent/contracts.ts` — tool names, artifact variants, apply type aliases, zod
- `src/domains/guidance/agent/tools.ts` — schemas, definitions, `CoachToolContext`, dispatch
- `src/domains/guidance/agent/runtime.ts` — register client tools, instructions
- `src/domains/guidance/hooks/useWorkoutGenerator.ts` — export `buildExerciseDraft`
- `src/domains/guidance/hooks/usePresenceAgent.ts` + `PresenceAgentProvider.tsx` — wire tools + apply handlers
- `src/domains/guidance/ui/ArtifactRenderer.tsx` — register renderers
- `src/domains/guidance/ui/SummonSurface.tsx` — "Changes" entry point
- `CODEMAP.md`

---

### Task 1: Migration — `coach` protocol + `coach_change_log`

**Files:**
- Create: `supabase/migrations/20260611000001_add_coach_protocol_and_change_log.sql`

- [ ] **Step 1: Inspect remote schema before assuming anything** (database workflow rule)

Run: `npx supabase migration list --linked`
Expected: local and remote migration lists in sync through `20260605000001`. Also confirm the protocol constraint name:

Run: `npx supabase db dump --linked --schema public -f /tmp/stratos-schema-check.sql && grep -n "protocol" /tmp/stratos-schema-check.sql | head`
Expected: `CHECK ((protocol = ANY (ARRAY['occams'::text, 'custom'::text])))` under a constraint named `mesocycles_protocol_check`. If the CLI is blocked, use the linked-project credentials (Supabase MCP `execute_sql`) to run `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.mesocycles'::regclass;` instead. If the constraint name differs, use the real name in the SQL below.

- [ ] **Step 2: Write the migration**

```sql
-- Coach acting layer: 'coach' mesocycle protocol + coach_change_log audit table.

-- 1. Allow Coach-drafted programs. 'coach' programs are agent-authored and are
--    never re-seeded from fixed templates on load.
ALTER TABLE public.mesocycles DROP CONSTRAINT mesocycles_protocol_check;
ALTER TABLE public.mesocycles ADD CONSTRAINT mesocycles_protocol_check
  CHECK (protocol IN ('occams','custom','coach'));

-- 2. Change log: one row per applied Coach mutation, revertible.
CREATE TABLE public.coach_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('program_created','program_edited','workout_edited')),
  summary TEXT NOT NULL CHECK (length(trim(summary)) > 0),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  reverted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.coach_change_log IS 'Audit log of Coach-applied training mutations; payload carries what revert needs.';
COMMENT ON COLUMN public.coach_change_log.payload IS 'program_created: {mesocycleId, previousActiveMesocycleId}. program_edited: {mesocycleId, ops, snapshot, protocolBefore}. workout_edited: {workoutId, inverseActions}.';

ALTER TABLE public.coach_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach changes"
  ON public.coach_change_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own coach changes"
  ON public.coach_change_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own coach changes"
  ON public.coach_change_log FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coach_change_log_user_created
  ON public.coach_change_log(user_id, created_at DESC);
```

- [ ] **Step 3: Apply to the linked project**

Run: `npx supabase db push --linked`
Expected: `20260611000001` applied. If the CLI is blocked, apply the same SQL via Supabase MCP `apply_migration` (name: `add_coach_protocol_and_change_log`).

- [ ] **Step 4: Verify remotely**

Run (CLI or MCP `execute_sql`): `select pg_get_constraintdef(oid) from pg_constraint where conname = 'mesocycles_protocol_check'; select count(*) from public.coach_change_log;`
Expected: constraint includes `'coach'`; count returns `0`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260611000001_add_coach_protocol_and_change_log.sql
git commit -m "feat(db): add coach mesocycle protocol and coach_change_log"
```

---

### Task 2: Widen protocol types + add draft/edit types

**Files:**
- Modify: `src/domains/periodization/data/types.ts`
- Modify: `src/lib/types/workout.ts:190`
- Modify: `src/state/workout/workoutSlice.ts:20`

- [ ] **Step 1: Widen the protocol unions**

In `src/domains/periodization/data/types.ts`:
```ts
export type MesocycleProtocol = 'occams' | 'custom' | 'coach';
```

In `src/lib/types/workout.ts` (line 190):
```ts
  mesocycle_protocol?: 'occams' | 'custom' | 'coach';
```

In `src/state/workout/workoutSlice.ts` (line 20):
```ts
  mesocycleProtocol?: 'occams' | 'custom' | 'coach';
```

- [ ] **Step 2: Add draft/edit/snapshot types to `src/domains/periodization/data/types.ts`** (append)

```ts
export interface DraftedProgramExerciseInput {
  exerciseId: string;
  exerciseName: string;
  targetSets: number | null;
  targetReps: string | null;
  loadIncrementKg: number | null;
  notes: string | null;
}

export interface DraftedProgramSessionInput {
  name: string;
  sessionFocus: SessionFocus | null;
  setsPerExercise: number | null;
  repRange: string | null;
  progressionRule: string | null;
  exercises: DraftedProgramExerciseInput[];
}

export interface DraftedProgramInput {
  name: string;
  goalFocus: MesocycleGoalFocus;
  durationWeeks: number;
  notes: string | null;
  sessions: DraftedProgramSessionInput[];
}

export interface SaveDraftedProgramResult {
  mesocycle: Mesocycle;
  previousActiveMesocycleId: string | null;
}

export type ResolvedProgramEditOp =
  | { op: 'replace_exercise'; sessionId: string; rowId: string; newExerciseId: string }
  | { op: 'add_exercise'; sessionId: string; exerciseId: string; targetSets: number | null; targetReps: string | null }
  | { op: 'remove_exercise'; sessionId: string; rowId: string }
  | {
      op: 'update_targets';
      sessionId: string;
      rowId: string;
      targetSets?: number | null;
      targetReps?: string | null;
      loadIncrementKg?: number | null;
    };

export interface SessionExerciseSnapshotRow {
  id: string;
  mesocycle_session_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number | null;
  target_reps: string | null;
  load_increment_kg: number | null;
  notes: string | null;
}

export interface ProgramEditResult {
  snapshot: SessionExerciseSnapshotRow[];
  protocolBefore: MesocycleProtocol;
}
```

- [ ] **Step 3: Barrel check (no change expected)**

`src/domains/periodization/index.ts` is `export * from './data/types'`, so the new types are exported automatically. Do not modify it.

- [ ] **Step 4: Verify**

Run sequentially: `npm run build` then `npm run lint`. Expected: build passes; lint at 8-warning baseline.

- [ ] **Step 5: Commit**

```bash
git add src/domains/periodization/data/types.ts src/domains/periodization/index.ts src/lib/types/workout.ts src/state/workout/workoutSlice.ts
git commit -m "feat(periodization): coach protocol type + drafted-program/edit types"
```

---

### Task 3: Periodization save/edit/revert boundaries

**Files:**
- Modify: `src/domains/periodization/data/repository.ts` (append; also extend its type import list with `DraftedProgramInput`, `SaveDraftedProgramResult`, `ResolvedProgramEditOp`, `SessionExerciseSnapshotRow`, `ProgramEditResult`, `MesocycleProtocol`)

Note: `getActiveMesocycleProgram` already branches `if (protocol === 'occams') ... else if (protocol === 'custom')`, so `coach` programs skip template re-seeding with **no change needed** — do not touch that function.

- [ ] **Step 1: Append the snapshot helper and `saveDraftedProgram`**

```ts
const fetchSessionExerciseSnapshot = async (
  sessionIds: string[]
): Promise<SessionExerciseSnapshotRow[]> => {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('mesocycle_session_exercises' as never)
    .select('id, mesocycle_session_id, exercise_id, exercise_order, target_sets, target_reps, load_increment_kg, notes')
    .in('mesocycle_session_id', sessionIds)
    .order('exercise_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionExerciseSnapshotRow[];
};

export const saveDraftedProgram = async (
  userId: string,
  draft: DraftedProgramInput
): Promise<SaveDraftedProgramResult> => {
  if (draft.durationWeeks < 4 || draft.durationWeeks > 12) {
    throw new Error('Mesocycles must be between 4 and 12 weeks.');
  }
  if (draft.sessions.length === 0) {
    throw new Error('A drafted program needs at least one session.');
  }
  if (draft.sessions.some(session => session.exercises.length === 0)) {
    throw new Error('Every drafted session needs at least one exercise.');
  }

  const { data: currentActive, error: currentActiveError } = await supabase
    .from('mesocycles' as never)
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentActiveError && !isMissingPeriodizationTableError(currentActiveError)) {
    throw currentActiveError;
  }
  const previousActiveMesocycleId = (currentActive?.id as string | undefined) ?? null;

  const nowIso = new Date().toISOString();
  if (previousActiveMesocycleId) {
    const { error: deactivateError } = await supabase
      .from('mesocycles' as never)
      .update({ status: 'completed', updated_at: nowIso })
      .eq('id', previousActiveMesocycleId)
      .eq('user_id', userId);
    if (deactivateError) throw deactivateError;
  }

  const { data: insertedMesocycle, error: insertError } = await supabase
    .from('mesocycles' as never)
    .insert({
      user_id: userId,
      name: draft.name.trim(),
      goal_focus: draft.goalFocus,
      protocol: 'coach',
      start_date: nowIso.slice(0, 10),
      duration_weeks: draft.durationWeeks,
      status: 'active',
      notes: draft.notes?.trim() ? draft.notes.trim() : null,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (insertError || !insertedMesocycle) {
    throw insertError ?? new Error('Failed to create the drafted program.');
  }
  const mesocycle = insertedMesocycle as Mesocycle;

  for (let sessionIndex = 0; sessionIndex < draft.sessions.length; sessionIndex += 1) {
    const session = draft.sessions[sessionIndex];
    const { data: insertedSession, error: sessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .insert({
        mesocycle_id: mesocycle.id,
        name: session.name.trim(),
        session_order: sessionIndex + 1,
        session_focus: session.sessionFocus,
        sets_per_exercise: session.setsPerExercise,
        rep_range: session.repRange,
        progression_rule: session.progressionRule,
      })
      .select('id')
      .single();

    if (sessionError || !insertedSession) {
      throw sessionError ?? new Error(`Failed to create session "${session.name}".`);
    }

    const sessionId = (insertedSession as { id: string }).id;
    const exerciseRows = session.exercises.map((exercise, exerciseIndex) => ({
      mesocycle_session_id: sessionId,
      exercise_id: exercise.exerciseId,
      exercise_order: exerciseIndex + 1,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      load_increment_kg: exercise.loadIncrementKg,
      notes: exercise.notes,
    }));

    const { error: exercisesError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .insert(exerciseRows);
    if (exercisesError) throw exercisesError;
  }

  return { mesocycle, previousActiveMesocycleId };
};
```

- [ ] **Step 2: Append `applyProgramEdits`**

```ts
export const applyProgramEdits = async (
  userId: string,
  mesocycleId: string,
  ops: ResolvedProgramEditOp[]
): Promise<ProgramEditResult> => {
  if (ops.length === 0) throw new Error('No program edits to apply.');

  const { data: mesocycleRow, error: mesocycleError } = await supabase
    .from('mesocycles' as never)
    .select('id, protocol')
    .eq('id', mesocycleId)
    .eq('user_id', userId)
    .single();

  if (mesocycleError || !mesocycleRow) {
    throw mesocycleError ?? new Error('Program not found.');
  }
  const protocolBefore = (mesocycleRow as { protocol: MesocycleProtocol }).protocol;

  const sessionIds = Array.from(new Set(ops.map(op => op.sessionId)));
  const snapshot = await fetchSessionExerciseSnapshot(sessionIds);

  const nextOrderBySession = new Map<string, number>();
  for (const sessionId of sessionIds) {
    const maxOrder = snapshot
      .filter(row => row.mesocycle_session_id === sessionId)
      .reduce((max, row) => Math.max(max, row.exercise_order), 0);
    nextOrderBySession.set(sessionId, maxOrder + 1);
  }

  for (const op of ops) {
    if (op.op === 'replace_exercise') {
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .update({ exercise_id: op.newExerciseId })
        .eq('id', op.rowId);
      if (error) throw error;
    } else if (op.op === 'add_exercise') {
      const order = nextOrderBySession.get(op.sessionId) ?? 1;
      nextOrderBySession.set(op.sessionId, order + 1);
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .insert({
          mesocycle_session_id: op.sessionId,
          exercise_id: op.exerciseId,
          exercise_order: order,
          target_sets: op.targetSets,
          target_reps: op.targetReps,
          load_increment_kg: null,
          notes: null,
        });
      if (error) throw error;
    } else if (op.op === 'remove_exercise') {
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .delete()
        .eq('id', op.rowId);
      if (error) throw error;
    } else {
      const updates: Record<string, unknown> = {};
      if (typeof op.targetSets !== 'undefined') updates.target_sets = op.targetSets;
      if (typeof op.targetReps !== 'undefined') updates.target_reps = op.targetReps;
      if (typeof op.loadIncrementKg !== 'undefined') updates.load_increment_kg = op.loadIncrementKg;
      if (Object.keys(updates).length === 0) continue;
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .update(updates)
        .eq('id', op.rowId);
      if (error) throw error;
    }
  }

  if (protocolBefore !== 'coach') {
    const { error } = await supabase
      .from('mesocycles' as never)
      .update({ protocol: 'coach', updated_at: new Date().toISOString() })
      .eq('id', mesocycleId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  return { snapshot, protocolBefore };
};
```

- [ ] **Step 3: Append the revert boundaries**

```ts
export const revertProgramCreation = async (
  userId: string,
  payload: { mesocycleId: string; previousActiveMesocycleId: string | null }
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const { error: cancelError } = await supabase
    .from('mesocycles' as never)
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('id', payload.mesocycleId)
    .eq('user_id', userId);
  if (cancelError) throw cancelError;

  if (payload.previousActiveMesocycleId) {
    const { error: restoreError } = await supabase
      .from('mesocycles' as never)
      .update({ status: 'active', updated_at: nowIso })
      .eq('id', payload.previousActiveMesocycleId)
      .eq('user_id', userId);
    if (restoreError) throw restoreError;
  }
};

export const revertProgramEdits = async (
  userId: string,
  payload: {
    mesocycleId: string;
    snapshot: SessionExerciseSnapshotRow[];
    protocolBefore: MesocycleProtocol;
  }
): Promise<void> => {
  const { data: mesocycleRow, error: mesocycleError } = await supabase
    .from('mesocycles' as never)
    .select('id')
    .eq('id', payload.mesocycleId)
    .eq('user_id', userId)
    .single();
  if (mesocycleError || !mesocycleRow) {
    throw mesocycleError ?? new Error('Program not found.');
  }

  const sessionIds = Array.from(
    new Set(payload.snapshot.map(row => row.mesocycle_session_id))
  );

  for (const sessionId of sessionIds) {
    const { error: deleteError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .delete()
      .eq('mesocycle_session_id', sessionId);
    if (deleteError) throw deleteError;
  }

  if (payload.snapshot.length > 0) {
    const { error: insertError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .insert(payload.snapshot.map(row => ({ ...row })));
    if (insertError) throw insertError;
  }

  if (payload.protocolBefore !== 'coach') {
    const { error: protocolError } = await supabase
      .from('mesocycles' as never)
      .update({ protocol: payload.protocolBefore, updated_at: new Date().toISOString() })
      .eq('id', payload.mesocycleId)
      .eq('user_id', userId);
    if (protocolError) throw protocolError;
  }
};
```

- [ ] **Step 4: Verify** — `npm run build` then `npm run lint` (sequential; baseline expected). Note: the barrel does not re-export repository functions; consumers import them from `@/domains/periodization/data/repository` (Tasks 8 and 11 already do).

- [ ] **Step 5: Commit**

```bash
git add src/domains/periodization
git commit -m "feat(periodization): saveDraftedProgram, applyProgramEdits, revert boundaries"
```

---

### Task 4: Contracts — tool names, artifacts, schemas

**Files:**
- Modify: `src/domains/guidance/agent/contracts.ts`

- [ ] **Step 1: Extend tool names**

```ts
export const coachToolNames = [
  "propose_workout",
  "get_user_profile_summary",
  "get_recent_workout_summary",
  "get_training_volume",
  "get_program_context",
  "propose_program",
  "propose_program_edit",
  "propose_active_workout_edit",
] as const;
```

- [ ] **Step 2: Add apply type aliases and artifact variants** (insert above `CoachArtifact`; extend the union)

```ts
export interface ProgramDraftApply {
  draftedProgram: Record<string, unknown>;
}

export interface ProgramEditApply {
  mesocycleId: string;
  summary: string;
  resolvedOps: Array<Record<string, unknown>>;
}

export interface WorkoutEditApply {
  workoutId: string;
  summary: string;
  actions: Array<Record<string, unknown>>;
  inverseActions: Array<Record<string, unknown>>;
}
```

New `CoachArtifact` union members (after `workout_draft`):

```ts
  | {
      type: "program_draft";
      title: string;
      rationale: string;
      goalFocus: string;
      durationWeeks: number;
      sessions: Array<{
        name: string;
        exercises: Array<{
          name: string;
          targetSets: number | null;
          targetReps: string | null;
        }>;
      }>;
      apply: ProgramDraftApply;
    }
  | {
      type: "program_edit";
      title: string;
      rationale: string;
      convertsToCoachProtocol: boolean;
      changes: Array<{ label: string; before: string | null; after: string | null }>;
      apply: ProgramEditApply;
    }
  | {
      type: "workout_edit";
      title: string;
      rationale: string;
      changes: Array<{ label: string }>;
      apply: WorkoutEditApply;
    }
```

- [ ] **Step 3: Extend `coachArtifactSchema`** (same discriminated union, zod mirrors)

```ts
  z.object({
    type: z.literal("program_draft"),
    title: z.string(),
    rationale: z.string(),
    goalFocus: z.string(),
    durationWeeks: z.number(),
    sessions: z.array(
      z.object({
        name: z.string(),
        exercises: z.array(
          z.object({
            name: z.string(),
            targetSets: z.number().nullable(),
            targetReps: z.string().nullable(),
          })
        ),
      })
    ),
    apply: z.object({
      draftedProgram: z.record(z.string(), z.unknown()),
    }),
  }),
  z.object({
    type: z.literal("program_edit"),
    title: z.string(),
    rationale: z.string(),
    convertsToCoachProtocol: z.boolean(),
    changes: z.array(
      z.object({
        label: z.string(),
        before: z.string().nullable(),
        after: z.string().nullable(),
      })
    ),
    apply: z.object({
      mesocycleId: z.string(),
      summary: z.string(),
      resolvedOps: z.array(z.record(z.string(), z.unknown())),
    }),
  }),
  z.object({
    type: z.literal("workout_edit"),
    title: z.string(),
    rationale: z.string(),
    changes: z.array(z.object({ label: z.string() })),
    apply: z.object({
      workoutId: z.string(),
      summary: z.string(),
      actions: z.array(z.record(z.string(), z.unknown())),
      inverseActions: z.array(z.record(z.string(), z.unknown())),
    }),
  }),
```

- [ ] **Step 4: Verify** — `npm run build` then `npm run lint` (sequential). Build will fail until Task 5 adds the tool definitions (the `coachToolDefinitions` record must cover every `CoachToolName`); if so, proceed to Task 5 and verify both together.

- [ ] **Step 5: Commit** (with Task 5 if verified together)

---

### Task 5: Tool definitions + client dispatch

**Files:**
- Modify: `src/domains/guidance/agent/tools.ts`

- [ ] **Step 1: Add standalone input schemas** (above `coachToolDefinitions`; export them for reuse by `useProgramActions`)

```ts
const sessionFocusInputSchema = z.enum([
  "strength",
  "hypertrophy",
  "mixed",
  "recovery",
  "speed",
  "zone2",
  "zone5",
]);

export const proposeProgramInputSchema = z.object({
  name: z.string().min(1),
  goalFocus: sessionFocusInputSchema,
  durationWeeks: z.number().int().min(4).max(12),
  rationale: z.string().min(1),
  notes: z.string().optional(),
  sessions: z
    .array(
      z.object({
        name: z.string().min(1),
        sessionFocus: sessionFocusInputSchema.nullish(),
        setsPerExercise: z.number().int().min(1).max(10).nullish(),
        repRange: z.string().nullish(),
        progressionRule: z.string().nullish(),
        exercises: z
          .array(
            z.object({
              exerciseName: z.string().min(1),
              targetSets: z.number().int().min(1).max(10).nullish(),
              targetReps: z.string().nullish(),
              loadIncrementKg: z.number().nullish(),
              notes: z.string().nullish(),
            })
          )
          .min(1),
      })
    )
    .min(1)
    .max(7),
});
export type ProposeProgramInput = z.infer<typeof proposeProgramInputSchema>;

export const proposeProgramEditInputSchema = z.object({
  rationale: z.string().min(1),
  ops: z
    .array(
      z.discriminatedUnion("op", [
        z.object({
          op: z.literal("replace_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          newExerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("add_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          targetSets: z.number().int().min(1).max(10).nullish(),
          targetReps: z.string().nullish(),
        }),
        z.object({
          op: z.literal("remove_exercise"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("update_targets"),
          sessionName: z.string().min(1),
          exerciseName: z.string().min(1),
          targetSets: z.number().int().min(1).max(10).nullish(),
          targetReps: z.string().nullish(),
          loadIncrementKg: z.number().nullish(),
        }),
      ])
    )
    .min(1),
});
export type ProposeProgramEditInput = z.infer<typeof proposeProgramEditInputSchema>;

export const proposeActiveWorkoutEditInputSchema = z.object({
  rationale: z.string().min(1),
  ops: z
    .array(
      z.discriminatedUnion("op", [
        z.object({
          op: z.literal("swap_exercise"),
          exerciseName: z.string().min(1),
          newExerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("add_exercise"),
          exerciseName: z.string().min(1),
        }),
        z.object({
          op: z.literal("remove_exercise"),
          exerciseName: z.string().min(1),
        }),
      ])
    )
    .min(1),
});
export type ProposeActiveWorkoutEditInput = z.infer<
  typeof proposeActiveWorkoutEditInputSchema
>;
```

- [ ] **Step 2: Extend `CoachToolContext`**

```ts
export interface CoachToolContext {
  proposeWorkout: () => Promise<CoachToolResultPayload>;
  getProgramContext: () => Promise<CoachToolResultPayload>;
  proposeProgram: (input: Record<string, unknown>) => Promise<CoachToolResultPayload>;
  proposeProgramEdit: (input: Record<string, unknown>) => Promise<CoachToolResultPayload>;
  proposeActiveWorkoutEdit: (
    input: Record<string, unknown>
  ) => Promise<CoachToolResultPayload>;
}
```

- [ ] **Step 3: Add the four definitions to `coachToolDefinitions`**

```ts
  get_program_context: {
    description:
      "Read the user's active training program (sessions, exercises, targets, current week) and the exercise catalog grouped by movement archetype. Always call this before proposing or editing a program so you use exact catalog names.",
    execution: "client",
    inputSchema: emptyInputSchema,
    label: "Program Context",
    name: "get_program_context",
  },
  propose_program: {
    description:
      "Draft a complete training program (mesocycle) for review: name, goal focus, duration in weeks, and 1-7 sessions each with exercises from the catalog (exact names). Returns a reviewable draft; it does NOT save. The user applies it explicitly.",
    execution: "client",
    inputSchema: proposeProgramInputSchema,
    label: "Propose Program",
    name: "propose_program",
  },
  propose_program_edit: {
    description:
      "Propose edits to the user's active program: replace/add/remove exercises in a named session, or update target sets/reps/load increment. Returns a before/after card; it does NOT save. The user applies it explicitly.",
    execution: "client",
    inputSchema: proposeProgramEditInputSchema,
    label: "Propose Program Edit",
    name: "propose_program_edit",
  },
  propose_active_workout_edit: {
    description:
      "Propose changes to the workout currently in progress: swap an exercise for another catalog exercise, add one, or remove one. Returns a confirm card; it does NOT change anything until the user applies it.",
    execution: "client",
    inputSchema: proposeActiveWorkoutEditInputSchema,
    label: "Propose Workout Edit",
    name: "propose_active_workout_edit",
  },
```

- [ ] **Step 4: Extend `executeCoachTool`** (replace the switch)

```ts
export const executeCoachTool = async (
  toolCall: Pick<CoachToolCallMessage, "input" | "toolName">,
  context: CoachToolContext
): Promise<CoachToolResultPayload> => {
  switch (toolCall.toolName) {
    case "propose_workout":
      return context.proposeWorkout();
    case "get_program_context":
      return context.getProgramContext();
    case "propose_program":
      return context.proposeProgram(toolCall.input);
    case "propose_program_edit":
      return context.proposeProgramEdit(toolCall.input);
    case "propose_active_workout_edit":
      return context.proposeActiveWorkoutEdit(toolCall.input);
    case "get_recent_workout_summary":
    case "get_user_profile_summary":
    case "get_training_volume":
      throw new Error(
        `Coach tool ${toolCall.toolName} is server-executable and cannot run on the client.`
      );
    default:
      throw new Error(`Unknown coach tool: ${toolCall.toolName}`);
  }
};
```

- [ ] **Step 5: Verify** — `npm run build` then `npm run lint` (sequential). Expected: build fails only where `runtime.ts` / provider still lack the new tools — if so, complete Tasks 6 and 8's provider stub first; otherwise baseline. (TypeScript will force `coachToolExecutionByName` in `runtime.ts` and the provider's `executeCoachTool` context to be updated; do Task 6 before verifying if needed.)

- [ ] **Step 6: Commit** (Tasks 4-6 may land as one verified commit)

```bash
git add src/domains/guidance/agent
git commit -m "feat(coach): contracts + tool definitions for program/workout acting tools"
```

---

### Task 6: Runtime registration + instructions

**Files:**
- Modify: `src/domains/guidance/agent/runtime.ts`

- [ ] **Step 1: Register the client tools in `createCoachAgentTools`** (no `execute` — client tools end the server turn)

```ts
  get_program_context: tool({
    description: coachToolDefinitions.get_program_context.description,
    inputSchema: coachToolDefinitions.get_program_context.inputSchema,
  }),
  propose_program: tool({
    description: coachToolDefinitions.propose_program.description,
    inputSchema: coachToolDefinitions.propose_program.inputSchema,
  }),
  propose_program_edit: tool({
    description: coachToolDefinitions.propose_program_edit.description,
    inputSchema: coachToolDefinitions.propose_program_edit.inputSchema,
  }),
  propose_active_workout_edit: tool({
    description: coachToolDefinitions.propose_active_workout_edit.description,
    inputSchema: coachToolDefinitions.propose_active_workout_edit.inputSchema,
  }),
```

- [ ] **Step 2: Extend `coachToolExecutionByName`**

```ts
const coachToolExecutionByName: Record<
  CoachToolName,
  CoachToolExecutionEnvironment
> = {
  propose_workout: "client",
  get_recent_workout_summary: "server",
  get_user_profile_summary: "server",
  get_training_volume: "server",
  get_program_context: "client",
  propose_program: "client",
  propose_program_edit: "client",
  propose_active_workout_edit: "client",
};
```

- [ ] **Step 3: Extend the instructions** (append to the Tool rules list in `coachAgentInstructions`)

```
- Use \`get_program_context\` before drafting or editing any program, and before mid-workout edits, so you work from the real program structure and exact catalog exercise names. Never invent exercise names.
- Use \`propose_program\` when the user wants a full training program or next block. First ask (in chat) only for genuinely missing essentials — goal, days per week, duration — using the profile facts you already have. The draft is a proposal; never claim it was saved.
- Use \`propose_program_edit\` to change the active program (swap/add/remove exercises, adjust targets). Edits are proposals the user applies; editing an Occam or template program converts it to a coach-managed program, and you should mention that.
- Use \`propose_active_workout_edit\` for the workout currently in progress (e.g. a painful exercise mid-session). Proposals only; the user applies.
- Applied changes are recorded in a change log the user can revert from the surface.
```

- [ ] **Step 4: Verify** — `npm run build` then `npm run lint` (sequential). The build may still fail on `PresenceAgentProvider`'s `executeCoachTool` call missing the new context keys — if so, add the Task 8 provider wiring stub now (the four context entries throwing `new Error("not wired yet")`) to get a clean build, then replace in Task 8.

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/agent src/domains/guidance/hooks/PresenceAgentProvider.tsx
git commit -m "feat(coach): register acting tools in server runtime + instructions"
```

---

### Task 7: Change-log repository + workout edit actions

**Files:**
- Create: `src/domains/guidance/data/changeLogRepository.ts`
- Create: `src/domains/guidance/data/workoutEditActions.ts`

- [ ] **Step 1: Write `changeLogRepository.ts`**

```ts
import { supabase } from "@/lib/integrations/supabase/client";

export type CoachChangeType =
  | "program_created"
  | "program_edited"
  | "workout_edited";

export interface CoachChangeLogEntry {
  id: string;
  user_id: string;
  change_type: CoachChangeType;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
  reverted_at: string | null;
}

export const listCoachChanges = async (
  userId: string,
  limit = 30
): Promise<CoachChangeLogEntry[]> => {
  const { data, error } = await supabase
    .from("coach_change_log" as never)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CoachChangeLogEntry[];
};

export const insertCoachChange = async (
  userId: string,
  changeType: CoachChangeType,
  summary: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase.from("coach_change_log" as never).insert({
    user_id: userId,
    change_type: changeType,
    summary,
    payload,
  });
  if (error) throw error;
};

export const markCoachChangeReverted = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("coach_change_log" as never)
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};
```

- [ ] **Step 2: Write `workoutEditActions.ts`** (shared by Apply and Revert so they cannot drift)

```ts
import type { WorkoutExercise } from "@/lib/types/workout";
import type { AppDispatch } from "@/state/store";
import {
  addExerciseToWorkout,
  deleteWorkoutExercise,
  replaceWorkoutExercise,
} from "@/state/workout/workoutSlice";

export type WorkoutEditAction =
  | { kind: "replace"; workoutExercise: WorkoutExercise }
  | { kind: "add"; workoutExercise: WorkoutExercise }
  | { kind: "delete"; workoutExerciseId: string };

export const applyWorkoutEditActions = (
  dispatch: AppDispatch,
  actions: WorkoutEditAction[]
): void => {
  for (const action of actions) {
    if (action.kind === "replace") {
      dispatch(replaceWorkoutExercise(action.workoutExercise));
    } else if (action.kind === "add") {
      dispatch(addExerciseToWorkout(action.workoutExercise));
    } else {
      dispatch(deleteWorkoutExercise(action.workoutExerciseId));
    }
  }
};
```

- [ ] **Step 3: Verify** — `npm run build` then `npm run lint` (sequential; baseline)

- [ ] **Step 4: Commit**

```bash
git add src/domains/guidance/data/changeLogRepository.ts src/domains/guidance/data/workoutEditActions.ts
git commit -m "feat(coach): change-log repository + shared workout edit actions"
```

---

### Task 8: `useProgramActions` — client tool implementations + Apply handlers

**Files:**
- Modify: `src/domains/guidance/hooks/useWorkoutGenerator.ts` (export `buildExerciseDraft`: change `const buildExerciseDraft =` to `export const buildExerciseDraft =`)
- Create: `src/domains/guidance/hooks/useProgramActions.ts`

- [ ] **Step 1: Export `buildExerciseDraft` from `useWorkoutGenerator.ts`**

- [ ] **Step 2: Write `useProgramActions.ts`**

```ts
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CoachToolResultPayload,
  ProgramDraftApply,
  ProgramEditApply,
  WorkoutEditApply,
} from "@/domains/guidance/agent/contracts";
import {
  proposeActiveWorkoutEditInputSchema,
  proposeProgramEditInputSchema,
  proposeProgramInputSchema,
} from "@/domains/guidance/agent/tools";
import { insertCoachChange } from "@/domains/guidance/data/changeLogRepository";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import {
  applyWorkoutEditActions,
  type WorkoutEditAction,
} from "@/domains/guidance/data/workoutEditActions";
import { buildExerciseDraft } from "@/domains/guidance/hooks/useWorkoutGenerator";
import {
  applyProgramEdits,
  getActiveMesocycleProgram,
  saveDraftedProgram,
} from "@/domains/periodization/data/repository";
import type {
  ActiveMesocycleProgram,
  DraftedProgramInput,
  ResolvedProgramEditOp,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { Exercise } from "@/lib/types/workout";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

const normalizeName = (value: string) => value.trim().toLowerCase();

const findExerciseByName = (
  catalog: Exercise[],
  name: string
): Exercise | null =>
  catalog.find(
    (exercise) => normalizeName(exercise.name) === normalizeName(name)
  ) ?? null;

const strengthCatalog = (catalog: Exercise[]): Exercise[] =>
  catalog.filter((exercise) => exercise.exercise_type !== "cardio");

const formatCatalogByArchetype = (
  catalog: Exercise[],
  archetypeMap: Map<string, string>
): string => {
  const grouped = new Map<string, string[]>();
  for (const exercise of strengthCatalog(catalog)) {
    const archetype =
      (exercise.archetype_id && archetypeMap.get(exercise.archetype_id)) ||
      "Other";
    grouped.set(archetype, [...(grouped.get(archetype) ?? []), exercise.name]);
  }
  return Array.from(grouped.entries())
    .map(([archetype, names]) => `${archetype}: ${names.sort().join(", ")}`)
    .join("; ");
};

const formatProgramSummary = (program: ActiveMesocycleProgram | null): string => {
  if (!program) return "No active program.";
  const sessions = program.sessions
    .map(
      (session) =>
        `${session.name}: ${
          session.exercises
            .map((row) => row.exercise?.name ?? "unknown")
            .join(", ") || "no exercises"
        }`
    )
    .join(" | ");
  return `Active program: "${program.mesocycle.name}" (protocol ${program.mesocycle.protocol}, week ${program.current_week} of ${program.mesocycle.duration_weeks}, goal ${program.mesocycle.goal_focus}). Sessions — ${sessions}. Next session: ${program.next_session_name ?? "unknown"}.`;
};

export const useProgramActions = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const loadCatalog = useCallback(async () => {
    const [exercises, archetypes] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["exercises"],
        queryFn: fetchGuidanceExercises,
        staleTime: Infinity,
      }),
      queryClient.ensureQueryData({
        queryKey: ["movementArchetypes"],
        queryFn: fetchMovementArchetypes,
        staleTime: Infinity,
      }),
    ]);
    const archetypeMap = new Map(
      archetypes.map((archetype) => [archetype.id, archetype.name])
    );
    return { exercises, archetypeMap };
  }, [queryClient]);

  const loadActiveProgram =
    useCallback(async (): Promise<ActiveMesocycleProgram | null> => {
      if (!userId) return null;
      return queryClient.ensureQueryData({
        queryKey: ["activeMesocycleProgram", userId],
        queryFn: () => getActiveMesocycleProgram(userId),
        staleTime: 60 * 1000,
      });
    }, [queryClient, userId]);

  const getProgramContext =
    useCallback(async (): Promise<CoachToolResultPayload> => {
      const [{ exercises, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      const message = `${formatProgramSummary(program)}\nExercise catalog (use these exact names) — ${formatCatalogByArchetype(exercises, archetypeMap)}`;
      return { message };
    }, [loadActiveProgram, loadCatalog]);

  const proposeProgram = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramInputSchema.parse(rawInput);
      const { exercises, archetypeMap } = await loadCatalog();

      const unresolved: string[] = [];
      const sessions = input.sessions.map((session) => ({
        name: session.name,
        sessionFocus: session.sessionFocus ?? null,
        setsPerExercise: session.setsPerExercise ?? null,
        repRange: session.repRange ?? null,
        progressionRule: session.progressionRule ?? null,
        exercises: session.exercises.map((exercise) => {
          const resolved = findExerciseByName(exercises, exercise.exerciseName);
          if (!resolved) unresolved.push(exercise.exerciseName);
          return {
            exerciseId: resolved?.id ?? "",
            exerciseName: resolved?.name ?? exercise.exerciseName,
            targetSets: exercise.targetSets ?? null,
            targetReps: exercise.targetReps ?? null,
            loadIncrementKg: exercise.loadIncrementKg ?? null,
            notes: exercise.notes ?? null,
          };
        }),
      }));

      if (unresolved.length > 0) {
        throw new Error(
          `These exercise names are not in the catalog: ${[...new Set(unresolved)].join(", ")}. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
        );
      }

      const draftedProgram: DraftedProgramInput = {
        name: input.name,
        goalFocus: input.goalFocus,
        durationWeeks: input.durationWeeks,
        notes: input.notes ?? null,
        sessions,
      };

      return {
        message: `Drafted "${input.name}" (${input.durationWeeks} weeks, ${sessions.length} sessions). The user must apply it before it becomes active.`,
        artifact: {
          type: "program_draft",
          title: input.name,
          rationale: input.rationale,
          goalFocus: input.goalFocus,
          durationWeeks: input.durationWeeks,
          sessions: sessions.map((session) => ({
            name: session.name,
            exercises: session.exercises.map((exercise) => ({
              name: exercise.exerciseName,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
            })),
          })),
          apply: {
            draftedProgram: draftedProgram as unknown as Record<string, unknown>,
          },
        },
      };
    },
    [loadCatalog]
  );

  const proposeProgramEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramEditInputSchema.parse(rawInput);
      const [{ exercises, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      if (!program) {
        throw new Error("There is no active program to edit. Propose a new program instead.");
      }

      const resolvedOps: ResolvedProgramEditOp[] = [];
      const changes: Array<{ label: string; before: string | null; after: string | null }> = [];

      for (const op of input.ops) {
        const session = program.sessions.find(
          (candidate) => normalizeName(candidate.name) === normalizeName(op.sessionName)
        );
        if (!session) {
          throw new Error(
            `Session "${op.sessionName}" is not in the active program. Sessions: ${program.sessions.map((candidate) => candidate.name).join(", ")}.`
          );
        }

        if (op.op === "add_exercise") {
          const resolved = findExerciseByName(exercises, op.exerciseName);
          if (!resolved) {
            throw new Error(
              `"${op.exerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          resolvedOps.push({
            op: "add_exercise",
            sessionId: session.id,
            exerciseId: resolved.id,
            targetSets: op.targetSets ?? null,
            targetReps: op.targetReps ?? null,
          });
          changes.push({
            label: `${session.name}: add ${resolved.name}`,
            before: null,
            after: resolved.name,
          });
          continue;
        }

        const row = session.exercises.find(
          (candidate) =>
            normalizeName(candidate.exercise?.name ?? "") ===
            normalizeName(op.exerciseName)
        );
        if (!row) {
          throw new Error(
            `"${op.exerciseName}" is not in session "${session.name}". That session has: ${session.exercises.map((candidate) => candidate.exercise?.name ?? "unknown").join(", ")}.`
          );
        }

        if (op.op === "replace_exercise") {
          const replacement = findExerciseByName(exercises, op.newExerciseName);
          if (!replacement) {
            throw new Error(
              `"${op.newExerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          resolvedOps.push({
            op: "replace_exercise",
            sessionId: session.id,
            rowId: row.id,
            newExerciseId: replacement.id,
          });
          changes.push({
            label: `${session.name}: replace`,
            before: row.exercise?.name ?? op.exerciseName,
            after: replacement.name,
          });
        } else if (op.op === "remove_exercise") {
          resolvedOps.push({
            op: "remove_exercise",
            sessionId: session.id,
            rowId: row.id,
          });
          changes.push({
            label: `${session.name}: remove`,
            before: row.exercise?.name ?? op.exerciseName,
            after: null,
          });
        } else {
          resolvedOps.push({
            op: "update_targets",
            sessionId: session.id,
            rowId: row.id,
            ...(typeof op.targetSets !== "undefined" ? { targetSets: op.targetSets } : {}),
            ...(typeof op.targetReps !== "undefined" ? { targetReps: op.targetReps } : {}),
            ...(typeof op.loadIncrementKg !== "undefined"
              ? { loadIncrementKg: op.loadIncrementKg }
              : {}),
          });
          const beforeText = `${row.target_sets ?? "?"}x${row.target_reps ?? "?"}`;
          const afterText = `${op.targetSets ?? row.target_sets ?? "?"}x${op.targetReps ?? row.target_reps ?? "?"}`;
          changes.push({
            label: `${session.name}: ${row.exercise?.name ?? op.exerciseName} targets`,
            before: beforeText,
            after: afterText,
          });
        }
      }

      const convertsToCoachProtocol = program.mesocycle.protocol !== "coach";
      const summary = changes.map((change) => change.label).join("; ");

      return {
        message: `Proposed ${changes.length} edit(s) to "${program.mesocycle.name}". The user must apply them.${convertsToCoachProtocol ? " Applying converts the program to coach-managed (off its fixed template)." : ""}`,
        artifact: {
          type: "program_edit",
          title: `Edit ${program.mesocycle.name}`,
          rationale: input.rationale,
          convertsToCoachProtocol,
          changes,
          apply: {
            mesocycleId: program.mesocycle.id,
            summary,
            resolvedOps: resolvedOps as unknown as Array<Record<string, unknown>>,
          },
        },
      };
    },
    [loadActiveProgram, loadCatalog]
  );

  const proposeActiveWorkoutEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeActiveWorkoutEditInputSchema.parse(rawInput);
      if (!currentWorkout) {
        throw new Error("There is no workout in progress to edit.");
      }
      const { exercises, archetypeMap } = await loadCatalog();

      const actions: WorkoutEditAction[] = [];
      const inverseActions: WorkoutEditAction[] = [];
      const changes: Array<{ label: string }> = [];

      for (const op of input.ops) {
        if (op.op === "add_exercise") {
          const resolved = findExerciseByName(exercises, op.exerciseName);
          if (!resolved) {
            throw new Error(
              `"${op.exerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          const draft = buildExerciseDraft(resolved);
          actions.push({ kind: "add", workoutExercise: draft });
          inverseActions.unshift({ kind: "delete", workoutExerciseId: draft.id });
          changes.push({ label: `Add ${resolved.name}` });
          continue;
        }

        const target = currentWorkout.exercises.find(
          (candidate) =>
            normalizeName(candidate.exercise.name) === normalizeName(op.exerciseName)
        );
        if (!target) {
          throw new Error(
            `"${op.exerciseName}" is not in the current workout. It has: ${currentWorkout.exercises.map((candidate) => candidate.exercise.name).join(", ")}.`
          );
        }

        if (op.op === "swap_exercise") {
          const replacement = findExerciseByName(exercises, op.newExerciseName);
          if (!replacement) {
            throw new Error(
              `"${op.newExerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          const draft = { ...buildExerciseDraft(replacement), id: target.id };
          actions.push({ kind: "replace", workoutExercise: draft });
          inverseActions.unshift({ kind: "replace", workoutExercise: target });
          changes.push({
            label: `Swap ${target.exercise.name} → ${replacement.name}`,
          });
        } else {
          actions.push({ kind: "delete", workoutExerciseId: target.id });
          inverseActions.unshift({ kind: "add", workoutExercise: target });
          changes.push({ label: `Remove ${target.exercise.name}` });
        }
      }

      const summary = changes.map((change) => change.label).join("; ");

      return {
        message: `Proposed ${changes.length} change(s) to the current workout. The user must apply them.`,
        artifact: {
          type: "workout_edit",
          title: "Adjust current workout",
          rationale: input.rationale,
          changes,
          apply: {
            workoutId: currentWorkout.id,
            summary,
            actions: actions as unknown as Array<Record<string, unknown>>,
            inverseActions: inverseActions as unknown as Array<Record<string, unknown>>,
          },
        },
      };
    },
    [currentWorkout, loadCatalog]
  );

  const recordChange = useCallback(
    async (
      changeType: "program_created" | "program_edited" | "workout_edited",
      summary: string,
      payload: Record<string, unknown>
    ) => {
      if (!userId) return;
      try {
        await insertCoachChange(userId, changeType, summary, payload);
        queryClient.invalidateQueries({ queryKey: ["coachChangeLog", userId] });
      } catch {
        toast.warning("The change was applied but could not be added to the change log.");
      }
    },
    [queryClient, userId]
  );

  const applyProgramDraft = useCallback(
    async (apply: ProgramDraftApply) => {
      if (!userId) {
        toast.error("You need to be signed in to apply a program.");
        return;
      }
      try {
        const draft = apply.draftedProgram as unknown as DraftedProgramInput;
        const result = await saveDraftedProgram(userId, draft);
        await recordChange(
          "program_created",
          `Created program "${result.mesocycle.name}"`,
          {
            mesocycleId: result.mesocycle.id,
            previousActiveMesocycleId: result.previousActiveMesocycleId,
          }
        );
        queryClient.invalidateQueries({
          queryKey: ["activeMesocycleProgram", userId],
        });
        toast.success(`"${result.mesocycle.name}" is now your active program.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply the program."
        );
      }
    },
    [queryClient, recordChange, userId]
  );

  const applyProgramEdit = useCallback(
    async (apply: ProgramEditApply) => {
      if (!userId) {
        toast.error("You need to be signed in to apply program edits.");
        return;
      }
      try {
        const ops = apply.resolvedOps as unknown as ResolvedProgramEditOp[];
        const result = await applyProgramEdits(userId, apply.mesocycleId, ops);
        await recordChange("program_edited", apply.summary, {
          mesocycleId: apply.mesocycleId,
          ops: apply.resolvedOps,
          snapshot: result.snapshot,
          protocolBefore: result.protocolBefore,
        });
        queryClient.invalidateQueries({
          queryKey: ["activeMesocycleProgram", userId],
        });
        toast.success("Program updated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply program edits."
        );
      }
    },
    [queryClient, recordChange, userId]
  );

  const applyWorkoutEdit = useCallback(
    async (apply: WorkoutEditApply) => {
      if (!currentWorkout || currentWorkout.id !== apply.workoutId) {
        toast.error("That workout is no longer active.");
        return;
      }
      applyWorkoutEditActions(
        dispatch,
        apply.actions as unknown as WorkoutEditAction[]
      );
      await recordChange("workout_edited", apply.summary, {
        workoutId: apply.workoutId,
        inverseActions: apply.inverseActions,
      });
      toast.success("Workout updated.");
    },
    [currentWorkout, dispatch, recordChange]
  );

  return {
    getProgramContext,
    proposeProgram,
    proposeProgramEdit,
    proposeActiveWorkoutEdit,
    applyProgramDraft,
    applyProgramEdit,
    applyWorkoutEdit,
  };
};
```

- [ ] **Step 3: Verify** — `npm run build` then `npm run lint` (sequential; baseline)

- [ ] **Step 4: Commit**

```bash
git add src/domains/guidance/hooks/useProgramActions.ts src/domains/guidance/hooks/useWorkoutGenerator.ts
git commit -m "feat(coach): useProgramActions client tools + apply handlers"
```

---

### Task 9: Wire provider context + `usePresenceAgent`

**Files:**
- Modify: `src/domains/guidance/hooks/usePresenceAgent.ts`
- Modify: `src/domains/guidance/hooks/PresenceAgentProvider.tsx`

- [ ] **Step 1: Extend `PresenceAgentContextValue`**

```ts
import type {
  CoachConversationMessage,
  ProgramDraftApply,
  ProgramEditApply,
  WorkoutEditApply,
} from "@/domains/guidance/agent/contracts";
```

Add to the interface:

```ts
  applyProgramDraft: (apply: ProgramDraftApply) => Promise<void>;
  applyProgramEdit: (apply: ProgramEditApply) => Promise<void>;
  applyWorkoutEdit: (apply: WorkoutEditApply) => Promise<void>;
```

- [ ] **Step 2: Wire in `PresenceAgentProvider.tsx`**

Import and call the hook next to `useProposeWorkout`:

```ts
import { useProgramActions } from "@/domains/guidance/hooks/useProgramActions";
// ...
const proposeWorkout = useProposeWorkout();
const {
  getProgramContext,
  proposeProgram,
  proposeProgramEdit,
  proposeActiveWorkoutEdit,
  applyProgramDraft,
  applyProgramEdit,
  applyWorkoutEdit,
} = useProgramActions();
```

Pass the tool context where `executeCoachTool` is called:

```ts
const result = await executeCoachTool(toolCall, {
  proposeWorkout,
  getProgramContext,
  proposeProgram,
  proposeProgramEdit,
  proposeActiveWorkoutEdit,
});
```

Add `getProgramContext`, `proposeProgram`, `proposeProgramEdit`, `proposeActiveWorkoutEdit` to the `send` callback dependency array; add `applyProgramDraft`, `applyProgramEdit`, `applyWorkoutEdit` to the `value` memo (object and dependency array).

- [ ] **Step 3: Verify** — `npm run build` then `npm run lint` (sequential; baseline)

- [ ] **Step 4: Commit**

```bash
git add src/domains/guidance/hooks/usePresenceAgent.ts src/domains/guidance/hooks/PresenceAgentProvider.tsx
git commit -m "feat(coach): wire acting tools + apply handlers into presence provider"
```

---

### Task 10: Artifact renderers

**Files:**
- Create: `src/domains/guidance/ui/artifacts/ProgramDraftArtifact.tsx`
- Create: `src/domains/guidance/ui/artifacts/ProgramEditArtifact.tsx`
- Create: `src/domains/guidance/ui/artifacts/WorkoutEditArtifact.tsx`
- Modify: `src/domains/guidance/ui/ArtifactRenderer.tsx`

All three follow `WorkoutDraftArtifact.tsx`'s container styling (`rounded-xl border border-primary/40 bg-background p-3`).

- [ ] **Step 1: `ProgramDraftArtifact.tsx`**

```tsx
import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type ProgramDraft = Extract<CoachArtifact, { type: "program_draft" }>;

const formatTargets = (targetSets: number | null, targetReps: string | null) => {
  if (targetSets === null && targetReps === null) return null;
  return `${targetSets ?? "?"}×${targetReps ?? "?"}`;
};

const ProgramDraftArtifact = ({ artifact }: { artifact: ProgramDraft }) => {
  const { applyProgramDraft } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {artifact.goalFocus} · {artifact.durationWeeks} weeks
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <div className="mt-2 space-y-2">
        {artifact.sessions.map((session) => (
          <div key={session.name}>
            <p className="text-xs font-medium text-foreground">{session.name}</p>
            <ul className="mt-1 space-y-0.5">
              {session.exercises.map((exercise, index) => (
                <li
                  key={`${exercise.name}-${index}`}
                  className="flex justify-between text-sm text-foreground"
                >
                  <span>{exercise.name}</span>
                  <span className="text-muted-foreground">
                    {formatTargets(exercise.targetSets, exercise.targetReps)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyProgramDraft(artifact.apply)}
      >
        Apply program
      </Button>
    </div>
  );
};

export default ProgramDraftArtifact;
```

- [ ] **Step 2: `ProgramEditArtifact.tsx`**

```tsx
import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type ProgramEdit = Extract<CoachArtifact, { type: "program_edit" }>;

const ProgramEditArtifact = ({ artifact }: { artifact: ProgramEdit }) => {
  const { applyProgramEdit } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.changes.map((change, index) => (
          <li key={`${change.label}-${index}`} className="text-sm text-foreground">
            <span className="text-muted-foreground">{change.label}</span>
            {change.before || change.after ? (
              <span className="ml-1">
                {change.before ? <s>{change.before}</s> : null}
                {change.before && change.after ? " → " : null}
                {change.after}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {artifact.convertsToCoachProtocol ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Applying takes this program off its fixed template — it becomes
          coach-managed.
        </p>
      ) : null}
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyProgramEdit(artifact.apply)}
      >
        Apply changes
      </Button>
    </div>
  );
};

export default ProgramEditArtifact;
```

- [ ] **Step 3: `WorkoutEditArtifact.tsx`**

```tsx
import { Button } from "@/components/core/button";
import type { CoachArtifact } from "@/domains/guidance/agent/contracts";
import { usePresenceAgent } from "@/domains/guidance/hooks/usePresenceAgent";

type WorkoutEdit = Extract<CoachArtifact, { type: "workout_edit" }>;

const WorkoutEditArtifact = ({ artifact }: { artifact: WorkoutEdit }) => {
  const { applyWorkoutEdit } = usePresenceAgent();

  return (
    <div className="rounded-xl border border-primary/40 bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        {artifact.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{artifact.rationale}</p>
      <ul className="mt-2 space-y-1">
        {artifact.changes.map((change, index) => (
          <li key={`${change.label}-${index}`} className="text-sm text-foreground">
            {change.label}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-3 w-full"
        onClick={() => void applyWorkoutEdit(artifact.apply)}
      >
        Apply to workout
      </Button>
    </div>
  );
};

export default WorkoutEditArtifact;
```

- [ ] **Step 4: Register in `ArtifactRenderer.tsx`**

```tsx
import ProgramDraftArtifact from "@/domains/guidance/ui/artifacts/ProgramDraftArtifact";
import ProgramEditArtifact from "@/domains/guidance/ui/artifacts/ProgramEditArtifact";
import WorkoutEditArtifact from "@/domains/guidance/ui/artifacts/WorkoutEditArtifact";
// in the switch:
    case "program_draft":
      return <ProgramDraftArtifact artifact={artifact} />;
    case "program_edit":
      return <ProgramEditArtifact artifact={artifact} />;
    case "workout_edit":
      return <WorkoutEditArtifact artifact={artifact} />;
```

- [ ] **Step 5: Verify** — `npm run build` then `npm run lint` (sequential; baseline)

- [ ] **Step 6: Commit**

```bash
git add src/domains/guidance/ui
git commit -m "feat(coach): program draft/edit + workout edit artifact renderers"
```

---

### Task 11: Change log — hook, panel, summon-surface entry

**Files:**
- Create: `src/domains/guidance/hooks/useCoachChangeLog.ts`
- Create: `src/domains/guidance/ui/ChangeLogPanel.tsx`
- Modify: `src/domains/guidance/ui/SummonSurface.tsx`

- [ ] **Step 1: `useCoachChangeLog.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listCoachChanges,
  markCoachChangeReverted,
  type CoachChangeLogEntry,
} from "@/domains/guidance/data/changeLogRepository";
import {
  applyWorkoutEditActions,
  type WorkoutEditAction,
} from "@/domains/guidance/data/workoutEditActions";
import {
  revertProgramCreation,
  revertProgramEdits,
} from "@/domains/periodization/data/repository";
import type {
  MesocycleProtocol,
  SessionExerciseSnapshotRow,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

export const useCoachChangeLog = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const changesQuery = useQuery({
    queryKey: ["coachChangeLog", userId],
    queryFn: () => listCoachChanges(userId as string),
    enabled: Boolean(userId),
  });

  const canRevert = (entry: CoachChangeLogEntry): boolean => {
    if (entry.reverted_at) return false;
    if (entry.change_type !== "workout_edited") return true;
    const workoutId = entry.payload.workoutId as string | undefined;
    return Boolean(workoutId && currentWorkout?.id === workoutId);
  };

  const revertMutation = useMutation({
    mutationFn: async (entry: CoachChangeLogEntry) => {
      if (!userId) throw new Error("Not signed in.");
      if (entry.reverted_at) throw new Error("This change was already reverted.");

      if (entry.change_type === "program_created") {
        await revertProgramCreation(userId, {
          mesocycleId: entry.payload.mesocycleId as string,
          previousActiveMesocycleId:
            (entry.payload.previousActiveMesocycleId as string | null) ?? null,
        });
      } else if (entry.change_type === "program_edited") {
        await revertProgramEdits(userId, {
          mesocycleId: entry.payload.mesocycleId as string,
          snapshot: entry.payload.snapshot as SessionExerciseSnapshotRow[],
          protocolBefore: entry.payload.protocolBefore as MesocycleProtocol,
        });
      } else {
        const workoutId = entry.payload.workoutId as string | undefined;
        if (!workoutId || currentWorkout?.id !== workoutId) {
          throw new Error("That workout is no longer active, so this change cannot be undone.");
        }
        applyWorkoutEditActions(
          dispatch,
          entry.payload.inverseActions as unknown as WorkoutEditAction[]
        );
      }

      await markCoachChangeReverted(entry.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachChangeLog", userId] });
      queryClient.invalidateQueries({ queryKey: ["activeMesocycleProgram", userId] });
      toast.success("Change reverted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to revert.");
    },
  });

  return {
    changes: changesQuery.data ?? [],
    isLoading: changesQuery.isLoading,
    canRevert,
    revert: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
};
```

- [ ] **Step 2: `ChangeLogPanel.tsx`**

```tsx
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/core/button";
import { useCoachChangeLog } from "@/domains/guidance/hooks/useCoachChangeLog";
import { cn } from "@/lib/utils/cn";

const ChangeLogPanel = () => {
  const { changes, isLoading, canRevert, revert, isReverting } =
    useCoachChangeLog();

  if (isLoading) {
    return (
      <p className="px-1 pt-4 text-sm text-muted-foreground">Loading changes…</p>
    );
  }

  if (changes.length === 0) {
    return (
      <p className="px-1 pt-4 text-sm text-muted-foreground">
        No coach changes yet. When the coach changes your program or workout,
        it shows up here and can be reverted.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {changes.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-border bg-background p-3"
        >
          <p
            className={cn(
              "text-sm text-foreground",
              entry.reverted_at && "line-through opacity-60"
            )}
          >
            {entry.summary}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
              })}
            </p>
            {entry.reverted_at ? (
              <span className="text-xs text-muted-foreground">Reverted</span>
            ) : canRevert(entry) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReverting}
                onClick={() => revert(entry)}
              >
                Revert
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                No longer revertible
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ChangeLogPanel;
```

- [ ] **Step 3: Summon-surface entry point**

In `SummonSurface.tsx`: add `import { useState } from "react";`, `import ChangeLogPanel from "@/domains/guidance/ui/ChangeLogPanel";`, then local state and a toggle chip after the quick-action chips (note it must NOT call `dismiss()`):

```tsx
const [showChanges, setShowChanges] = useState(false);
```

After the `chips.map(...)` block, inside the same chip row container:

```tsx
          <button
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs hover:bg-accent",
              showChanges
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-foreground"
            )}
          >
            Changes
          </button>
```

Wrap the conversation area body:

```tsx
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {showChanges ? (
            <ChangeLogPanel />
          ) : conversation.length === 0 ? (
            /* existing empty state */
          ) : (
            /* existing conversation map */
          )}
          ...
```

(Keep the existing `statusMessage` block outside the `showChanges` ternary.)

- [ ] **Step 4: Verify** — `npm run build` then `npm run lint` (sequential; baseline)

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/hooks/useCoachChangeLog.ts src/domains/guidance/ui/ChangeLogPanel.tsx src/domains/guidance/ui/SummonSurface.tsx
git commit -m "feat(coach): change log panel with one-tap revert in summon surface"
```

---

### Task 12: CODEMAP + final verification + manual checks

**Files:**
- Modify: `CODEMAP.md`

- [ ] **Step 1: Update `CODEMAP.md`**

- Guidance domain "Current tools" list: add `get_program_context`, `propose_program`, `propose_program_edit`, `propose_active_workout_edit` (all client) with one-line behavior each; note all mutations are confirm-only and logged.
- Guidance entrypoints: add `hooks/useProgramActions.ts`, `hooks/useCoachChangeLog.ts`, `data/changeLogRepository.ts`, `data/workoutEditActions.ts`, `ui/ChangeLogPanel.tsx`, the three new artifact files.
- Periodization section: note `saveDraftedProgram` / `applyProgramEdits` / revert boundaries, and the `coach` protocol (agent-authored; not template re-seeded; editing an `occams`/`custom` program converts it to `coach`).
- Backend section: add the `coach_change_log` migration and the protocol CHECK extension.
- Coach architecture summary: artifacts now include `program_draft`, `program_edit`, `workout_edit`; change log + revert lives in the summon surface.

- [ ] **Step 2: Final verification** — `npm run build` then `npm run lint` (sequential). Expected: build passes, 8 warnings / 0 errors.

- [ ] **Step 3: Manual checks** (requires a configured BYOK provider; dev server)

1. With no active program: ask the Coach to "build me a 6-week program" → it should call `get_program_context`, maybe ask one or two questions, then render a program draft. Apply → toast, program active, change log shows "Created program …".
2. Ask it to use a fake exercise ("include Bulgarian Skull Press") → the draft attempt should bounce with unresolved names and the model should self-correct or ask.
3. With an Occam/custom program active: "swap bench press for incline dumbbell press in workout B" → edit card shows before/after + the off-template note. Apply → program updated; revert from Changes panel → original restored, protocol restored.
4. Start a workout; "my shoulder hurts, swap overhead press" → workout edit card; Apply updates the live workout; Revert in Changes restores it. End the workout; the entry becomes "No longer revertible".
5. Confirm an untouched `occams` program still loads and re-seeds normally.

- [ ] **Step 4: Commit**

```bash
git add CODEMAP.md
git commit -m "docs(codemap): acting-on-training tools, change log, coach protocol"
```
