# Breathwork Module Design

Status: designed autonomously from the goal "add a breathwork module which can
be integrated into our workout/session primitive; multiple kinds of breathwork;
simple and beautiful". Assumptions are flagged inline — review before extending.

Date: 2026-07-03

## Revision — 2026-07-03: native-exercise integration

First-pass feedback: the initial build felt un-integrated. Two symptoms, one
root cause. (1) The catalogue showed no breathwork exercises, because the seed
migration was never applied — so the feature looked broken. (2) A dedicated
"Breathwork" button in the active-workout footer opened a full-screen takeover,
a *second* entry point parallel to the normal add-exercise flow. Breathwork was
adjacent to the session primitive, not part of it.

Resolved by committing fully to the catalogue-exercise model already chosen
below, and deleting the parallel path:

- **The seed migration is applied to the linked project** (`fhkhpwoxedcytetcjnob`),
  so the four protocols are real catalogue rows. This is the fix for the empty
  catalogue — the DB-row approach was sound, just never turned on.
- **Breathwork enters a session through the same `ExerciseSelector` as every
  other exercise** (filter/search under the Breathwork category). There is no
  longer a footer button; the `WorkoutScreen` breathwork dialog wiring is removed.
- **A breathwork exercise renders a dedicated in-session card**
  (`BreathworkExerciseCard`) instead of weight/reps inputs: it shows the protocol
  name/intent, any completed runs as time chips, and a single "Breathe" button
  that launches the pacer overlay. Each finished run is recorded as one completed
  timed set on that exercise via the existing generic `replaceWorkoutExercise`
  reducer — all breathwork logic stays in the breathwork domain (`applyBreathworkCompletion`),
  no new redux surface.
- **The pacer is shared, not duplicated.** `BreathworkRunner` owns a running
  session (auto-start, pacer, pause/end) and calls `onDone` once when finished.
  The standalone dialog and the in-session card both consume it; each decides
  what "done" means (log + summary screen vs. write a set + close).
- **The standalone Summon "Breathe" chip stays** — the one place a protocol
  picker belongs, for breathing outside a planned session. During an active
  workout it adds a breathwork exercise to the session (consistent with the card).

The sections below describe the original design; where they mention a footer
button or full-screen dialog as the in-session entry point, this revision
supersedes them.

## Goal

Give STRATOS a guided breathwork practice: a calm, full-screen pacer the user
can launch anywhere (including mid-workout), covering several distinct
breathwork styles, whose completions land in the existing workout/session
primitive — not in a parallel logging system.

## Decisions

- **Breathwork protocols are client-side data; completions are catalog
  exercises.** Protocol definitions (phase timings, rounds) live in a pure
  `data/protocols.ts`. Each built-in protocol maps to a seeded row in the
  `exercises` catalog (new `exercise_category = 'breathwork'`). A finished
  session is logged as one completed time-only set on that exercise. This buys
  integration for free: breathwork can appear in mesocycle session templates
  (they reference `exercise_id`), lands in workout history and recent-workout
  summaries, and is visible to Coach tools through the same catalog every other
  exercise uses. No new tables.
- **Two engine shapes cover "multiple kinds".** `paced` protocols are a
  repeating cycle of timed phases (inhale / hold / exhale / hold) run for a
  target duration; `rounds` protocols are N rounds of fast breaths followed by
  an open-ended retention hold (tap to end) and a short recovery hold. Every
  well-known practice below fits one of the two shapes; new protocols are new
  data entries, not new code.
- **Four built-in protocols.**
  - **Box Breathing** — paced 4-4-4-4, default 3 min. Focus/steadiness.
  - **4-7-8** — paced inhale 4 / hold 7 / exhale 8, default 2 min. Downshift.
  - **Coherent Breathing** — paced inhale 5.5 / exhale 5.5, default 5 min.
    Resonance/HRV.
  - **Breath Rounds** (Wim Hof–style) — 3 rounds × 30 breaths (~1.7 s in,
    ~1.3 s out), retention after each round (open-ended, count-up, tap when you
    need to breathe), 15 s recovery hold. Energize.
- **Logging routes through the existing primitives, chosen by context.** If a
  workout is active in Redux, completion appends a `WorkoutExercise` with one
  completed time-only set via `addExerciseToWorkout` — the breathwork block is
  simply part of that session, saved by the normal workout commit path. If no
  workout is active, completion logs through the standalone single-exercise
  path the Add Exercise quick action already uses. The player never grows its
  own persistence.
- **Entry points: a summon-surface quick-action chip ("Breathe") and a quiet
  secondary control on the workout screen.** The dialog itself is lazy-loaded
  from `MainAppLayout` exactly like the protein and sun quick-action dialogs.
  No new routes, no nav item.
- **Set shape: time-only strength set** (`weight 0`, `reps null`,
  `time = elapsed`), matching how timed work is already persisted
  (`time_seconds`). Seeded exercises use `exercise_type = 'strength'`,
  `is_static = true` so existing timed-set UI conventions apply.
  *(Assumption: no distinct per-round retention analytics for now — total
  duration is the record. Revisit only if breathwork analytics become a goal.)*
- **Early exit rule:** ending early saves the partial session if at least one
  full cycle (paced) or one full round (rounds) completed; otherwise it
  discards. No confirmation dialog either way — a toast states what happened.
- **Motion follows the house convention.** The pacer animates with CSS
  transitions whose duration is set per phase (no rAF loop for the visual, no
  framer-motion): scale up over the inhale, hold, scale down over the exhale.
  `prefers-reduced-motion` gets a static circle with the phase word and
  countdown only. Timing state (which phase, seconds left) ticks in the hook;
  the visual just receives the current phase and its duration.

## Approaches considered

1. **Catalog exercise + timed set (chosen).** New `breathwork` domain for the
   experience; persistence and session-template integration ride existing
   seams. Smallest blast radius, deepest integration.
2. **Dedicated `breathwork_sessions` table + own history surface.** Richer
   per-round detail (retention times), but a parallel primitive: new table,
   new history UI, no free template/Coach/history integration. Violates YAGNI
   until breathwork analytics are actually wanted.
3. **New `BreathworkSet` member in the `ExerciseSet` union.** Deepest typing,
   but touches every set type guard, the workout row UI, persistence mapping,
   and the Supabase schema — a large diff that buys nothing over (1) for a
   time-only record.

## Domain layout

```
src/domains/breathwork/
  data/
    protocols.ts        # BreathworkProtocol types + 4 built-ins + timeline logic
    protocols.test.ts   # unit tests for step advance / totals / early-exit rule
    logging.ts          # buildBreathworkWorkoutExercise(protocol, elapsed, exercise)
    logging.test.ts
  hooks/
    useBreathworkSession.ts  # timer engine: phase state machine over protocols.ts
    useBreathworkLogging.ts  # context-aware logging (active workout vs standalone)
  ui/
    BreathworkDialog.tsx     # full-screen dialog: picker -> player -> done
    BreathPacer.tsx          # the animated circle + phase word + countdown
    ProtocolPicker.tsx       # 4 stone-chip protocol cards + duration stepper
```

### Protocol model

```ts
export type BreathPhaseKind = 'inhale' | 'hold' | 'exhale';

export interface BreathPhase { kind: BreathPhaseKind; seconds: number }

export interface PacedProtocol {
  id: string;                 // 'box' | 'four-seven-eight' | 'coherent'
  type: 'paced';
  name: string;
  intent: string;             // one short line, e.g. "Steady the mind"
  exerciseName: string;       // catalog exercise this logs against
  phases: BreathPhase[];      // one cycle
  defaultMinutes: number;
  minuteOptions: number[];    // picker choices, e.g. [2, 3, 5, 10]
}

export interface RoundsProtocol {
  id: 'breath-rounds';
  type: 'rounds';
  name: string;
  intent: string;
  exerciseName: string;
  rounds: number;             // default 3
  breathsPerRound: number;    // 30
  inhaleSeconds: number;      // ~1.7
  exhaleSeconds: number;      // ~1.3
  recoveryHoldSeconds: number; // 15
}

export type BreathworkProtocol = PacedProtocol | RoundsProtocol;
```

Pure helpers in `protocols.ts` (the unit-test surface):

- `nextStep(protocol, position)` — advances the phase state machine; returns
  the next step (phase kind, planned seconds or `open` for retention) or
  `done`. Paced protocols finish at the end of the first full cycle whose
  completion reaches the target minutes.
- `sessionTotals(protocol, position, elapsedSeconds)` — cycles/rounds
  completed, used for the done screen and the early-exit save rule.
- `shouldSaveEarlyExit(protocol, position)` — the one-cycle / one-round rule.

### Engine hook

`useBreathworkSession(protocol, config)` owns time: a 250 ms interval advances
`secondsLeft`, calls `nextStep` at phase boundaries, and exposes
`{ status: 'idle' | 'running' | 'paused' | 'retention' | 'done', phase, phaseSeconds,
secondsLeft, elapsed, cycle, round, breath, start, pause, resume, endEarly,
tapRetention }`. Retention counts up until `tapRetention`. The hook contains no
JSX and no persistence.

### Logging

`useBreathworkLogging` resolves the protocol's `exerciseName` against the
cached `['exercises']` catalog query.

- Active workout (`currentWorkout` in Redux): dispatch `addExerciseToWorkout`
  with one completed set `{ weight: 0, reps: null, time: secondsToTime(elapsed),
  completed: true }`. Toast: "Added to workout".
- No active workout: persist through the same repository function the single
  exercise log uses (one-off workout containing the single completed set).
  Toast: "Breathwork logged".
- Exercise name unresolved (migration not applied): toast an error, do not
  save, keep the done screen up. Never silently drop a session.

### UI

`BreathworkDialog` is one full-screen surface with three states:

1. **Picker** — four protocol cards (`stone-chip`): name, intent line, timing
   signature ("4·4·4·4", "3 × 30 breaths"). Paced cards show a minute
   stepper. One primary action: Begin.
2. **Player** — near-empty stone screen: the pacer circle centered (pthalo
   glow on dark stone, scale 0.55 ↔ 1.0), the phase word above it, seconds
   countdown in `tabular-nums` inside it, cycle/round progress as a thin dotted
   row underneath. Controls are two quiet text buttons: Pause / End. During
   retention: count-up timer and "tap when you need to breathe" (whole screen
   is the tap target).
3. **Done** — total time, cycles or rounds completed, logged-destination line
   ("added to today's workout" / "logged"), one Done button.

Per the design language: no headers restating the obvious, no icon badges, one
dominant surface, numbers in `tabular-nums`.

## Database migration

One migration, shipped in the PR but **not applied to the linked project by
this change** (apply via Supabase CLI/MCP after review):

- Extend the `exercises.exercise_category` CHECK to include `'breathwork'`.
- Seed four global exercises (`created_by_user_id null`,
  `exercise_type 'strength'`, `is_static true`, `exercise_category
  'breathwork'`): `Box Breathing`, `4-7-8 Breathing`, `Coherent Breathing`,
  `Breath Rounds`. Idempotent inserts (guard on name + null creator).
- Client union `ExerciseCategory` gains `'breathwork'` in the same PR.

Until the migration is applied, the feature degrades cleanly: the player works,
logging surfaces the unresolved-exercise error.

## Testing

Vitest, node environment, following the existing pure-seam pattern:

- `protocols.test.ts` — step advance across full paced cycle and rounds
  session, duration completion rule, early-exit save rule, totals.
- `logging.test.ts` — `buildBreathworkWorkoutExercise` shape (completed
  time-only set), catalog resolution failure path.

Hooks and dialog UI follow the codebase norm of no component tests.

## Error handling

- Timer drift: the interval recomputes from `Date.now()` deltas, not tick
  counts, so a suspended tab resumes correctly.
- Dialog dismissal mid-session counts as End (same early-exit rule).
- Reduced motion: static pacer, identical timing and logging behavior.

## Explicitly out of scope (YAGNI)

- Custom user-authored protocols.
- Per-round retention analytics or a breathwork history surface.
- Coach propose-tool awareness beyond what the shared catalog already gives.
- Audio cues / haptics.
- Adding breathwork to session-template seeding logic (templates *can* include
  the exercises; no seeder changes now).
