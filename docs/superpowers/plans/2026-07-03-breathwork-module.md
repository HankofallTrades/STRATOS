# Breathwork Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guided breathwork player (4 protocols, 2 engine shapes) whose completions log into the existing workout/session primitive as time-only sets on seeded catalog exercises.

**Architecture:** New `src/domains/breathwork` domain (ui/hooks/data). Pure protocol/timeline logic in `data/`, a timer hook in `hooks/`, one full-screen dialog in `ui/`. Logging routes to Redux `addExerciseToWorkout` when a workout is active, else `saveSingleExerciseLog`. One SQL migration seeds the catalog exercises (shipped, not applied).

**Tech Stack:** React 18, TypeScript, Redux Toolkit, React Query, Vitest, Tailwind (stone/pthalo design tokens), Supabase migration SQL.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-breathwork-module-design.md`.
- Layer names `ui / hooks / data` only; hooks/UI never import Supabase directly (ESLint-enforced) — persistence goes through `fitnessRepository`.
- Motion: CSS transitions with per-phase durations under `motion-safe:`; no framer-motion, no rAF visual loop. Honor `prefers-reduced-motion`.
- Design language: stone surfaces, pthalo accent, `tabular-nums` for read numbers, minimal copy (`docs/superpowers/specs/design-language.md`).
- Verification runs sequentially: `npm run build`, then `npm run lint` (baseline 8 warnings / 0 errors), then `npm test`.
- Working tree: `/Users/hank/agent-ops/Forge/stratos/.claude/worktrees/breathwork-module`, branch `feature/breathwork-module`.
- Do NOT apply the migration to the linked Supabase project; ship the file only.

---

### Task 1: Catalog groundwork — migration + `ExerciseCategory` union

**Files:**
- Create: `supabase/migrations/20260703090000_add_breathwork_exercises.sql`
- Modify: `src/lib/types/workout.ts:4` (ExerciseCategory union)
- Modify: `src/domains/fitness/ui/ExerciseSelector.tsx:58` area (category options list)
- Modify: `src/domains/fitness/hooks/useExerciseSelector.ts:37` (timed-category branch)

**Interfaces:**
- Produces: catalog rows named `Box Breathing`, `4-7-8 Breathing`, `Coherent Breathing`, `Breath Rounds` (category `breathwork`, `is_static true`, `exercise_type 'strength'`, global). Later tasks resolve these by name.

- [ ] **Step 1: Write the migration**

```sql
-- Add 'breathwork' exercise category and seed the built-in breathwork exercises.
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_exercise_category_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_exercise_category_check
  CHECK (exercise_category IN ('weights', 'calisthenics', 'cardio', 'mobility', 'stability', 'breathwork'));

INSERT INTO exercises (name, exercise_type, exercise_category, is_static, created_by_user_id)
SELECT v.name, 'strength', 'breathwork', true, NULL
FROM (VALUES ('Box Breathing'), ('4-7-8 Breathing'), ('Coherent Breathing'), ('Breath Rounds')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.name = v.name AND e.created_by_user_id IS NULL
);
```

Note: verify the actual CHECK constraint name first with `grep -n "CHECK" supabase/migrations/20260322000001_add_exercise_category_and_warmup.sql` — the constraint was created inline, so Postgres named it `exercises_exercise_category_check` by convention; keep `IF EXISTS` as the guard.

- [ ] **Step 2: Extend the client union and category UI**

`src/lib/types/workout.ts:4`:
```ts
export type ExerciseCategory = 'weights' | 'calisthenics' | 'cardio' | 'mobility' | 'stability' | 'breathwork';
```

`ExerciseSelector.tsx` category options (after the `mobility` entry):
```ts
  { value: 'breathwork', label: 'Breathwork' },
```

`useExerciseSelector.ts:37` — include breathwork with the other time-first categories:
```ts
if (category === 'mobility' || category === 'stability' || category === 'breathwork') {
```
(Read the surrounding lines first and mirror whatever that branch does for mobility/stability.)

- [ ] **Step 3: Verify compile**

Run: `npm run build` — Expected: success.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260703090000_add_breathwork_exercises.sql src/lib/types/workout.ts src/domains/fitness/ui/ExerciseSelector.tsx src/domains/fitness/hooks/useExerciseSelector.ts
git commit -m "feat(breathwork): add breathwork exercise category + seed migration"
```

---

### Task 2: Protocol model + step timeline (pure, TDD)

**Files:**
- Create: `src/domains/breathwork/data/protocols.ts`
- Test: `src/domains/breathwork/data/protocols.test.ts`

**Interfaces:**
- Produces:
  - `type BreathStepKind = 'inhale' | 'hold' | 'exhale' | 'retention' | 'recovery'`
  - `interface BreathStep { kind: BreathStepKind; seconds: number | null; unit: number; breath?: number }` (`seconds: null` = open-ended retention; `unit` = 0-based cycle/round index)
  - `interface PacedProtocol { id: string; type: 'paced'; name: string; intent: string; exerciseName: string; phases: { kind: 'inhale' | 'hold' | 'exhale'; seconds: number }[]; defaultMinutes: number; minuteOptions: number[] }`
  - `interface RoundsProtocol { id: string; type: 'rounds'; name: string; intent: string; exerciseName: string; rounds: number; breathsPerRound: number; inhaleSeconds: number; exhaleSeconds: number; recoveryHoldSeconds: number }`
  - `type BreathworkProtocol = PacedProtocol | RoundsProtocol`
  - `const BREATHWORK_PROTOCOLS: BreathworkProtocol[]` (box, four-seven-eight, coherent, breath-rounds — exact tunings from the spec)
  - `buildSteps(protocol: BreathworkProtocol, minutes?: number): BreathStep[]`
  - `totalUnits(protocol: BreathworkProtocol, minutes?: number): number`
  - `completedUnits(protocol: BreathworkProtocol, steps: BreathStep[], nextStepIndex: number): number`
  - `shouldSaveEarlyExit(protocol: BreathworkProtocol, steps: BreathStep[], nextStepIndex: number): boolean`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";

import {
  BREATHWORK_PROTOCOLS,
  buildSteps,
  completedUnits,
  shouldSaveEarlyExit,
  type PacedProtocol,
  type RoundsProtocol,
} from "./protocols";

const box = BREATHWORK_PROTOCOLS.find((p) => p.id === "box") as PacedProtocol;
const rounds = BREATHWORK_PROTOCOLS.find((p) => p.id === "breath-rounds") as RoundsProtocol;

describe("buildSteps (paced)", () => {
  it("runs whole cycles until the target minutes are covered", () => {
    // Box cycle = 16s; 3 minutes = 180s -> ceil(180/16) = 12 cycles of 4 phases.
    const steps = buildSteps(box, 3);
    expect(steps).toHaveLength(48);
    expect(steps[0]).toMatchObject({ kind: "inhale", seconds: 4, unit: 0 });
    expect(steps[47]).toMatchObject({ kind: "hold", seconds: 4, unit: 11 });
  });

  it("always schedules at least one full cycle", () => {
    expect(buildSteps(box, 0)).toHaveLength(4);
  });
});

describe("buildSteps (rounds)", () => {
  it("emits breaths, open retention, and recovery per round", () => {
    const steps = buildSteps(rounds);
    // per round: 30 breaths * 2 phases + retention + recovery = 62; 3 rounds = 186
    expect(steps).toHaveLength(186);
    const retention = steps[60];
    expect(retention).toMatchObject({ kind: "retention", seconds: null, unit: 0 });
    expect(steps[61]).toMatchObject({ kind: "recovery", seconds: rounds.recoveryHoldSeconds, unit: 0 });
    expect(steps[0].breath).toBe(1);
    expect(steps[59].breath).toBe(30);
  });
});

describe("completedUnits / shouldSaveEarlyExit", () => {
  it("counts full paced cycles only", () => {
    const steps = buildSteps(box, 3);
    expect(completedUnits(box, steps, 3)).toBe(0);
    expect(completedUnits(box, steps, 4)).toBe(1);
    expect(shouldSaveEarlyExit(box, steps, 3)).toBe(false);
    expect(shouldSaveEarlyExit(box, steps, 4)).toBe(true);
  });

  it("counts a round only after its recovery hold finishes", () => {
    const steps = buildSteps(rounds);
    expect(completedUnits(rounds, steps, 61)).toBe(0);
    expect(completedUnits(rounds, steps, 62)).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/domains/breathwork/data/protocols.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `protocols.ts`**

```ts
export type BreathStepKind = "inhale" | "hold" | "exhale" | "retention" | "recovery";

export interface BreathStep {
  kind: BreathStepKind;
  /** Planned seconds; null = open-ended (retention: user taps to continue). */
  seconds: number | null;
  /** 0-based cycle (paced) or round (rounds) index. */
  unit: number;
  /** 1-based breath number within a round (rounds protocols only). */
  breath?: number;
}

export interface PacedProtocol {
  id: string;
  type: "paced";
  name: string;
  intent: string;
  exerciseName: string;
  phases: { kind: "inhale" | "hold" | "exhale"; seconds: number }[];
  defaultMinutes: number;
  minuteOptions: number[];
}

export interface RoundsProtocol {
  id: string;
  type: "rounds";
  name: string;
  intent: string;
  exerciseName: string;
  rounds: number;
  breathsPerRound: number;
  inhaleSeconds: number;
  exhaleSeconds: number;
  recoveryHoldSeconds: number;
}

export type BreathworkProtocol = PacedProtocol | RoundsProtocol;

export const BREATHWORK_PROTOCOLS: BreathworkProtocol[] = [
  {
    id: "box",
    type: "paced",
    name: "Box Breathing",
    intent: "Steady the mind",
    exerciseName: "Box Breathing",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 4 },
      { kind: "exhale", seconds: 4 },
      { kind: "hold", seconds: 4 },
    ],
    defaultMinutes: 3,
    minuteOptions: [2, 3, 5, 10],
  },
  {
    id: "four-seven-eight",
    type: "paced",
    name: "4-7-8",
    intent: "Downshift",
    exerciseName: "4-7-8 Breathing",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 7 },
      { kind: "exhale", seconds: 8 },
    ],
    defaultMinutes: 2,
    minuteOptions: [1, 2, 3, 5],
  },
  {
    id: "coherent",
    type: "paced",
    name: "Coherent Breathing",
    intent: "Settle the system",
    exerciseName: "Coherent Breathing",
    phases: [
      { kind: "inhale", seconds: 5.5 },
      { kind: "exhale", seconds: 5.5 },
    ],
    defaultMinutes: 5,
    minuteOptions: [3, 5, 10, 15],
  },
  {
    id: "breath-rounds",
    type: "rounds",
    name: "Breath Rounds",
    intent: "Energize",
    exerciseName: "Breath Rounds",
    rounds: 3,
    breathsPerRound: 30,
    inhaleSeconds: 1.7,
    exhaleSeconds: 1.3,
    recoveryHoldSeconds: 15,
  },
];

const cycleSeconds = (protocol: PacedProtocol) =>
  protocol.phases.reduce((sum, phase) => sum + phase.seconds, 0);

export const totalUnits = (protocol: BreathworkProtocol, minutes?: number): number => {
  if (protocol.type === "rounds") return protocol.rounds;
  const targetSeconds = (minutes ?? protocol.defaultMinutes) * 60;
  return Math.max(1, Math.ceil(targetSeconds / cycleSeconds(protocol)));
};

export const buildSteps = (protocol: BreathworkProtocol, minutes?: number): BreathStep[] => {
  const steps: BreathStep[] = [];
  if (protocol.type === "paced") {
    const cycles = totalUnits(protocol, minutes);
    for (let unit = 0; unit < cycles; unit++) {
      for (const phase of protocol.phases) {
        steps.push({ kind: phase.kind, seconds: phase.seconds, unit });
      }
    }
    return steps;
  }
  for (let unit = 0; unit < protocol.rounds; unit++) {
    for (let breath = 1; breath <= protocol.breathsPerRound; breath++) {
      steps.push({ kind: "inhale", seconds: protocol.inhaleSeconds, unit, breath });
      steps.push({ kind: "exhale", seconds: protocol.exhaleSeconds, unit, breath });
    }
    steps.push({ kind: "retention", seconds: null, unit });
    steps.push({ kind: "recovery", seconds: protocol.recoveryHoldSeconds, unit });
  }
  return steps;
};

export const completedUnits = (
  protocol: BreathworkProtocol,
  steps: BreathStep[],
  nextStepIndex: number
): number => {
  if (protocol.type === "paced") {
    return Math.floor(nextStepIndex / protocol.phases.length);
  }
  return steps.slice(0, nextStepIndex).filter((step) => step.kind === "recovery").length;
};

export const shouldSaveEarlyExit = (
  protocol: BreathworkProtocol,
  steps: BreathStep[],
  nextStepIndex: number
): boolean => completedUnits(protocol, steps, nextStepIndex) >= 1;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/domains/breathwork/data/protocols.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/breathwork/data/protocols.ts src/domains/breathwork/data/protocols.test.ts
git commit -m "feat(breathwork): protocol model and step timeline"
```

---

### Task 3: Logging builders (pure, TDD)

**Files:**
- Create: `src/domains/breathwork/data/logging.ts`
- Test: `src/domains/breathwork/data/logging.test.ts`

**Interfaces:**
- Consumes: `Exercise`, `WorkoutExercise`, `StrengthSet`, `secondsToTime` from `@/lib/types/workout`; protocol `exerciseName`.
- Produces:
  - `findBreathworkExercise(exercises: Exercise[], exerciseName: string): Exercise | null` (global rows preferred: `created_by_user_id == null` wins over a user copy)
  - `buildBreathworkWorkoutExercise(exercise: Exercise, elapsedSeconds: number): WorkoutExercise` — one completed time-only set (`weight 0`, `reps null`)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";

import type { Exercise } from "@/lib/types/workout";
import { buildBreathworkWorkoutExercise, findBreathworkExercise } from "./logging";

const globalBox: Exercise = { id: "ex-1", name: "Box Breathing", created_by_user_id: null };
const userBox: Exercise = { id: "ex-2", name: "Box Breathing", created_by_user_id: "user-1" };

describe("findBreathworkExercise", () => {
  it("prefers the global catalog row over a user copy", () => {
    expect(findBreathworkExercise([userBox, globalBox], "Box Breathing")).toBe(globalBox);
  });

  it("returns null when the exercise is missing (migration not applied)", () => {
    expect(findBreathworkExercise([userBox], "Coherent Breathing")).toBeNull();
  });
});

describe("buildBreathworkWorkoutExercise", () => {
  it("wraps the elapsed time in one completed time-only set", () => {
    const entry = buildBreathworkWorkoutExercise(globalBox, 185);
    expect(entry.exerciseId).toBe("ex-1");
    expect(entry.exercise).toBe(globalBox);
    expect(entry.sets).toHaveLength(1);
    expect(entry.sets[0]).toMatchObject({
      exerciseId: "ex-1",
      weight: 0,
      reps: null,
      completed: true,
      time: { hours: 0, minutes: 3, seconds: 5 },
    });
    expect(entry.id).not.toBe(entry.sets[0].id);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/domains/breathwork/data/logging.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `logging.ts`**

```ts
import { v4 as uuidv4 } from "uuid";

import type { Exercise, StrengthSet, WorkoutExercise } from "@/lib/types/workout";
import { secondsToTime } from "@/lib/types/workout";

export const findBreathworkExercise = (
  exercises: Exercise[],
  exerciseName: string
): Exercise | null => {
  const matches = exercises.filter((exercise) => exercise.name === exerciseName);
  if (matches.length === 0) return null;
  return matches.find((exercise) => exercise.created_by_user_id == null) ?? matches[0];
};

export const buildBreathworkWorkoutExercise = (
  exercise: Exercise,
  elapsedSeconds: number
): WorkoutExercise => {
  const set: StrengthSet = {
    id: uuidv4(),
    exerciseId: exercise.id,
    weight: 0,
    reps: null,
    time: secondsToTime(Math.round(elapsedSeconds)),
    completed: true,
  };
  return {
    id: uuidv4(),
    exerciseId: exercise.id,
    exercise,
    sets: [set],
  };
};
```

- [ ] **Step 4: Run tests** — `npx vitest run src/domains/breathwork/data/logging.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/breathwork/data/logging.ts src/domains/breathwork/data/logging.test.ts
git commit -m "feat(breathwork): pure logging builders"
```

---

### Task 4: Session engine hook

**Files:**
- Create: `src/domains/breathwork/hooks/useBreathworkSession.ts`

**Interfaces:**
- Consumes: `buildSteps`, `completedUnits`, `shouldSaveEarlyExit`, `totalUnits`, `BreathworkProtocol`, `BreathStep`.
- Produces:

```ts
export type BreathworkStatus = "idle" | "running" | "paused" | "retention" | "done";
export interface BreathworkSessionState {
  status: BreathworkStatus;
  step: BreathStep | null;          // current step (null before start / after done)
  stepIndex: number;
  steps: BreathStep[];
  secondsLeft: number;              // remaining in current timed step (ceil)
  retentionSeconds: number;         // count-up during open retention
  elapsedSeconds: number;           // total session time excluding pauses
  unitsCompleted: number;
  totalUnits: number;
  saveOnExit: boolean;              // early-exit save rule, live
}
export interface BreathworkSessionControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  tapRetention: () => void;         // ends open retention, advances
  end: () => void;                  // early end -> status 'done'
}
export const useBreathworkSession = (
  protocol: BreathworkProtocol,
  minutes?: number
): BreathworkSessionState & BreathworkSessionControls
```

Implementation notes (behavioral requirements, not placeholders — the reducer shape is the implementer's choice):

- One 250 ms `setInterval` while `running`/`retention`; all arithmetic from `Date.now()` anchors (`stepStartedAt`, `pausedAt`, accumulated pause), so a suspended tab catches up correctly. A tab suspended past several steps fast-forwards through them (advance while `elapsed(step) >= step.seconds`).
- Timed steps advance when their planned seconds elapse; `retention` steps never auto-advance (count up until `tapRetention`).
- Reaching the end of `steps` sets `status: 'done'` and freezes `elapsedSeconds`.
- `end()` from any live state sets `done`, keeping current elapsed/units.
- `pause()` stores the moment; `resume()` shifts the step anchor forward by the pause duration.
- Cleanup on unmount clears the interval.
- No JSX, no persistence, no Supabase.

- [ ] **Step 1: Implement the hook per the interface above**
- [ ] **Step 2: Typecheck** — `npm run build` — Expected: success.
- [ ] **Step 3: Commit**

```bash
git add src/domains/breathwork/hooks/useBreathworkSession.ts
git commit -m "feat(breathwork): session timer engine hook"
```

---

### Task 5: Context-aware logging hook

**Files:**
- Create: `src/domains/breathwork/hooks/useBreathworkLogging.ts`

**Interfaces:**
- Consumes: `findBreathworkExercise`, `buildBreathworkWorkoutExercise`; `addExerciseToWorkout` + `selectCurrentWorkout`-equivalent from `src/state/workout/workoutSlice` (read the slice for the exact selector; `state.workout.currentWorkout` via `useAppSelector`); `saveSingleExerciseLog`, `fetchExercises` from `@/domains/fitness/data/fitnessRepository`; `useAuth`, `useToast`.
- Produces:

```ts
export type BreathworkLogDestination = "workout" | "standalone";
export interface BreathworkLogResult { destination: BreathworkLogDestination }
export const useBreathworkLogging = (): {
  logSession: (protocol: BreathworkProtocol, elapsedSeconds: number) => Promise<BreathworkLogResult>;
  isLogging: boolean;
}
```

Behavior:

- Catalog from `useQuery({ queryKey: ['exercises'], queryFn: fetchExercises, staleTime: Infinity })` (same key the rest of the app uses, so it is warm).
- `logSession`:
  - Resolve exercise by `protocol.exerciseName`. Unresolved → toast destructive "Breathwork exercise missing — apply the latest database migration." and `throw`.
  - Active workout (`currentWorkout != null`): `dispatch(addExerciseToWorkout(buildBreathworkWorkoutExercise(exercise, elapsed)))`; toast "Added to workout"; returns `{ destination: 'workout' }`. The set is already `completed: true`, so the normal end-workout commit persists it.
  - Otherwise: `await saveSingleExerciseLog(user.id, { exerciseId, reps: null, timeSeconds: Math.round(elapsed), weight: 0, equipmentType: null, variation: null })`; invalidate `['workouts']` and `['analyticsData']` (mirrors `useSingleExerciseLog`); toast "Breathwork logged"; returns `{ destination: 'standalone' }`.
  - No user → toast error, throw.

- [ ] **Step 1: Implement the hook**
- [ ] **Step 2: Typecheck** — `npm run build` — Expected: success.
- [ ] **Step 3: Commit**

```bash
git add src/domains/breathwork/hooks/useBreathworkLogging.ts
git commit -m "feat(breathwork): context-aware session logging"
```

---

### Task 6: UI — pacer, picker, dialog

**Files:**
- Create: `src/domains/breathwork/ui/BreathPacer.tsx`
- Create: `src/domains/breathwork/ui/ProtocolPicker.tsx`
- Create: `src/domains/breathwork/ui/BreathworkDialog.tsx` (default export, for `lazyWithRetry`)

**Interfaces:**
- Consumes: Tasks 2, 4, 5. `Button` from `@/components/core/button`.
- Produces: `BreathworkDialog` props `{ isOpen: boolean; onClose: () => void }`.

**BreathPacer** — props `{ step: BreathStep | null; secondsLeft: number; retentionSeconds: number; paused: boolean }`:

- A single centered circle (`~w-56 h-56`, rounded-full) on the stone background: soft pthalo fill (`bg-primary/10`), 1px `border-primary/30`, outer glow via `shadow-[0_0_80px_-20px]` in the accent.
- Scale by phase: `inhale` → 1.0, `exhale` → 0.55, `hold` after inhale → 1.0, `hold` after exhale → 0.55 (pass the previous phase kind or precompute a `grow` boolean on the step when rendering), `retention` → 0.55, `recovery` → 1.0.
- Animation: inline `style={{ transform: scale(...), transitionDuration: ${step.seconds}s }}` with `motion-safe:transition-transform ease-in-out`; hold/retention get `transitionDuration: 0.3s`. Reduced motion (`motion-reduce:transition-none`) leaves a static circle — timing text still updates.
- Inside the circle: the phase word (`Inhale` / `Hold` / `Exhale` / `Hold — tap when you need to breathe` / `Recover`), and beneath it the countdown (`tabular-nums`, `text-4xl`) — count-up for retention. Pause shows `Paused` in place of the word.

**ProtocolPicker** — props `{ onBegin: (protocol: BreathworkProtocol, minutes?: number) => void }`:

- Four `stone-chip` rounded cards in a single column: name (semibold), intent (muted, one line), timing signature right-aligned in `tabular-nums` (`4·4·4·4`, `4·7·8`, `5.5·5.5`, `3 × 30`).
- Selecting a paced card reveals its minute options as small segmented `stone-chip` pills (from `minuteOptions`, default selected `defaultMinutes`).
- One `app-primary-action` Begin button at the bottom, enabled once a protocol is selected.

**BreathworkDialog** — full-screen overlay, same pattern as `ProteinLogging` (`fixed inset-0 z-50 bg-black/60`, inner panel is `stone-panel` but `h-full w-full max-w-none rounded-none` — one dominant surface, per design language):

- Three states: `pick` → `play` → `done` (`useState`), plus mounts `useBreathworkSession` only in `play`/`done` (key the player subtree by protocol id + minutes so re-begin restarts cleanly — render a `<BreathworkPlayer protocol minutes onExit>` inner component that owns the session hook).
- Player layout: protocol name as quiet kicker top-left, close (End) and Pause/Resume as two quiet text buttons (`app-tonal-control`) bottom-center; pacer centered; unit progress under the pacer as `unitsCompleted + 1 / totalUnits` dots (`tabular-nums` text is fine: `Cycle 3 of 12` / `Round 1 of 3` / breath counter `Breath 14 of 30` during rounds breathing).
- During `retention`, the whole player area is a tap target for `tapRetention` (`onClick` on the container; the End/Pause buttons `stopPropagation`).
- On session `done` (natural or via End): if natural completion or `saveOnExit`, call `logSession(protocol, elapsedSeconds)` once (guard with a ref); else skip logging and toast "Session discarded".
- Done state: total time (`formatTime(secondsToTime(elapsed))`, `tabular-nums`), `N cycles` / `N rounds`, destination line ("added to today's workout" / "logged"), one Done button (`app-primary-action`) → `onClose`.
- Closing the dialog mid-session (Escape/backdrop is not wired — only explicit End) keeps semantics simple: End is the only exit from `play`.

- [ ] **Step 1: Implement `BreathPacer.tsx`**
- [ ] **Step 2: Implement `ProtocolPicker.tsx`**
- [ ] **Step 3: Implement `BreathworkDialog.tsx`**
- [ ] **Step 4: Typecheck + lint** — `npm run build` then `npm run lint` — Expected: build success; lint stays at 8 warnings / 0 errors.
- [ ] **Step 5: Commit**

```bash
git add src/domains/breathwork/ui/
git commit -m "feat(breathwork): pacer, picker, and full-screen dialog"
```

---

### Task 7: Wiring — quick action chip + workout screen entry

**Files:**
- Modify: `src/domains/fitness/hooks/useQuickActions.ts` (add breathwork modal state + handler)
- Modify: `src/domains/guidance/ui/SummonSurface.tsx` (add `onBreathwork` to `SummonSurfaceQuickActions` + a `Breathe` chip after `Sun`)
- Modify: `src/components/layout/MainAppLayout.tsx` (lazy `BreathworkDialog`, mount like ProteinLogging, pass `onBreathwork` into the summon surface quick actions)
- Modify: `src/domains/fitness/ui/WorkoutScreen.tsx` (quiet `Breathwork` `app-tonal-control` button near the existing secondary workout controls, lazy-mounting its own `BreathworkDialog` with local open state)

**Interfaces:**
- Consumes: `BreathworkDialog` `{ isOpen, onClose }` from Task 6.
- Produces: `useQuickActions` additionally returns `{ isBreathworkModalOpen, setIsBreathworkModalOpen, handleBreathwork }`.

Steps mirror the existing protein/sun pattern exactly (state in `useQuickActions`, chip label `Breathe`, `lazyWithRetry(() => import("@/domains/breathwork/ui/BreathworkDialog"))`, `<Suspense fallback={null}>` mount guarded by open state). For `WorkoutScreen`, read the file first and place the button with the other secondary actions (near the Add Exercise control), not as a new hero element.

- [ ] **Step 1: Extend `useQuickActions`**
- [ ] **Step 2: Add the chip to `SummonSurface`**
- [ ] **Step 3: Mount the dialog in `MainAppLayout`**
- [ ] **Step 4: Add the workout-screen entry**
- [ ] **Step 5: Typecheck + lint** — `npm run build`, `npm run lint` — Expected: success / 8 warnings.
- [ ] **Step 6: Commit**

```bash
git add src/domains/fitness/hooks/useQuickActions.ts src/domains/guidance/ui/SummonSurface.tsx src/components/layout/MainAppLayout.tsx src/domains/fitness/ui/WorkoutScreen.tsx
git commit -m "feat(breathwork): summon chip + workout screen entry"
```

---

### Task 8: Docs + full verification

**Files:**
- Modify: `CODEMAP.md` (new `src/domains/breathwork` section under Domain Map; note the seeded migration in Backend and Data Contract; add the two test suites to the baseline list)

- [ ] **Step 1: Update `CODEMAP.md`**
- [ ] **Step 2: Full verification, sequentially**

```bash
npm run build   # Expected: success
npm run lint    # Expected: 8 warnings, 0 errors
npm test        # Expected: all suites pass incl. protocols.test.ts, logging.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add CODEMAP.md
git commit -m "docs: map breathwork domain in CODEMAP"
```

---

## Self-Review Notes

- Spec coverage: protocols/engine (T2, T4), logging (T3, T5), UI (T6), entry points (T7), migration + category (T1), tests (T2, T3), CODEMAP (T8). Early-exit rule lives in `shouldSaveEarlyExit` (T2) and is enforced in the dialog (T6). Reduced motion handled in T6/BreathPacer.
- The spec's `useBreathworkSession` "phaseSeconds" is exposed as `step.seconds`; `secondsLeft` matches.
- Migration is shipped but never applied — noted in Global Constraints and the PR body.
