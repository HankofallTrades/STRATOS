import { describe, expect, it } from "vitest";

import type { CardioSet, StrengthSet, Workout, WorkoutExercise } from "@/lib/types/workout";
import workoutReducer, { setCompleted, startWorkout } from "@/state/workout/workoutSlice";

import { replayActivityJournal, type ActivityJournalEntry } from "./activityJournal";

// Replay is the seam the whole lock screen rests on: what the phone recorded
// while the webview was asleep becomes what the workout screen shows. These
// tests assert on the workout state that comes out the far side of the real
// reducer, not on which completions were handed back — the two surfaces
// agreeing is the business rule, and counting dispatches would not notice if
// they stopped.

const squatSet = (id: string, completed = false): StrengthSet => ({
  id,
  exerciseId: "ex-1",
  weight: 0,
  reps: 0,
  time: null,
  completed,
});

const squat = (sets: StrengthSet[]): WorkoutExercise => ({
  id: "we-1",
  exercise: { id: "ex-1", name: "Squat" },
  sets,
});

const entry = (overrides: Partial<ActivityJournalEntry> = {}): ActivityJournalEntry => ({
  id: "journal-1",
  kind: "set-completed",
  setKind: "strength",
  setId: "set-1",
  workoutExerciseId: "we-1",
  at: "2026-09-21T10:00:00.000Z",
  reps: 5,
  weight: 100,
  timeSeconds: null,
  distanceKm: null,
  ...overrides,
});

/** Run a journal the way the app does: replay, then dispatch what it decided. */
const workoutAfterReplay = (
  entries: ActivityJournalEntry[],
  exercises: WorkoutExercise[]
): Workout => {
  let state = workoutReducer(undefined, startWorkout({ initialExercises: exercises }));

  const { completions } = replayActivityJournal({
    entries,
    workout: state.currentWorkout,
  });

  for (const completion of completions) {
    state = workoutReducer(state, setCompleted(completion));
  }

  return state.currentWorkout!;
};

describe("replayActivityJournal", () => {
  it("logs a set completed on the lock screen with the numbers it was showing", () => {
    const workout = workoutAfterReplay(
      [entry({ reps: 5, weight: 100 })],
      [squat([squatSet("set-1")])]
    );

    expect(workout.exercises[0].sets[0]).toMatchObject({
      weight: 100,
      reps: 5,
      completed: true,
    });
  });

  it("logs several sets in the order they were pressed", () => {
    const workout = workoutAfterReplay(
      [
        entry({ id: "journal-1", setId: "set-1", reps: 5, weight: 100 }),
        entry({ id: "journal-2", setId: "set-2", reps: 4, weight: 105 }),
      ],
      [squat([squatSet("set-1"), squatSet("set-2"), squatSet("set-3")])]
    );

    expect(workout.exercises[0].sets.map(set => set.completed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(workout.exercises[0].sets[1]).toMatchObject({ weight: 105, reps: 4 });
  });

  // The app can foreground, background and foreground again before the journal
  // is cleared, and a crash between the read and the clear leaves it in place
  // on purpose. Neither may log the same set twice.
  it("does not log a set twice when the same journal is replayed again", () => {
    const entries = [entry({ reps: 5, weight: 100 })];
    const exercises = [squat([squatSet("set-1"), squatSet("set-2")])];

    let state = workoutReducer(undefined, startWorkout({ initialExercises: exercises }));

    const firstPass = replayActivityJournal({ entries, workout: state.currentWorkout });
    for (const completion of firstPass.completions) {
      state = workoutReducer(state, setCompleted(completion));
    }

    const secondPass = replayActivityJournal({ entries, workout: state.currentWorkout });
    for (const completion of secondPass.completions) {
      state = workoutReducer(state, setCompleted(completion));
    }

    expect(secondPass.completions).toEqual([]);
    expect(secondPass.skipped).toEqual([
      { entryId: "journal-1", setId: "set-1", reason: "already-completed" },
    ]);
    expect(state.currentWorkout!.exercises[0].sets[0]).toMatchObject({
      weight: 100,
      reps: 5,
      completed: true,
    });
  });

  // A double tap on the lock screen can land two entries on one set before the
  // first has been replayed, so the guard cannot rely on the workout alone.
  it("does not log a set twice from two entries in one journal", () => {
    const replay = replayActivityJournal({
      entries: [
        entry({ id: "journal-1", reps: 5, weight: 100 }),
        entry({ id: "journal-2", reps: 5, weight: 100 }),
      ],
      workout: workoutReducer(
        undefined,
        startWorkout({ initialExercises: [squat([squatSet("set-1")])] })
      ).currentWorkout,
    });

    expect(replay.completions).toHaveLength(1);
    expect(replay.skipped).toEqual([
      { entryId: "journal-2", setId: "set-1", reason: "already-completed" },
    ]);
  });

  // Ticking the same set in the app first is the same collision seen from the
  // other side: the workout already has it, so the journal adds nothing.
  it("leaves a set the user already logged in the app alone", () => {
    const workout = workoutAfterReplay(
      [entry({ reps: 5, weight: 100 })],
      [squat([{ ...squatSet("set-1", true), weight: 80, reps: 8 }])]
    );

    expect(workout.exercises[0].sets[0]).toMatchObject({ weight: 80, reps: 8 });
  });

  it("logs a static hold for the time the lock screen was showing", () => {
    const workout = workoutAfterReplay(
      [entry({ setKind: "time", reps: null, weight: 0, timeSeconds: 45 })],
      [squat([squatSet("set-1")])]
    );

    expect(workout.exercises[0].sets[0]).toMatchObject({
      time: { hours: 0, minutes: 0, seconds: 45 },
      reps: null,
      completed: true,
    });
  });

  it("logs a cardio set for its duration and distance", () => {
    const cardioSet: CardioSet = {
      id: "set-1",
      exerciseId: "ex-1",
      time: { hours: 0, minutes: 0, seconds: 0 },
      completed: false,
    };

    const workout = workoutAfterReplay(
      [
        entry({
          setKind: "cardio",
          reps: null,
          weight: null,
          timeSeconds: 600,
          distanceKm: 2.5,
        }),
      ],
      [{ id: "we-1", exercise: { id: "ex-1", name: "Row" }, sets: [cardioSet] }]
    );

    expect(workout.exercises[0].sets[0]).toMatchObject({
      time: { hours: 0, minutes: 10, seconds: 0 },
      distance_km: 2.5,
      completed: true,
    });
  });

  // The journal outlives the session it was written for: the app can be killed
  // and a new workout started before it is replayed. Its entries name sets that
  // no longer exist, and must not touch the new session.
  it("skips an entry for a set the workout no longer has", () => {
    const replay = replayActivityJournal({
      entries: [entry({ setId: "set-from-a-dead-session" })],
      workout: workoutReducer(
        undefined,
        startWorkout({ initialExercises: [squat([squatSet("set-1")])] })
      ).currentWorkout,
    });

    expect(replay.completions).toEqual([]);
    expect(replay.skipped[0].reason).toBe("set-missing");
  });

  it("skips every entry when there is no workout to replay into", () => {
    const replay = replayActivityJournal({ entries: [entry()], workout: null });

    expect(replay.completions).toEqual([]);
    expect(replay.skipped[0].reason).toBe("workout-missing");
  });

  // The lock screen can only offer what the Set Plan resolved. A set with no
  // target at all is refused by the same rule that refuses an empty row, rather
  // than logged as zero reps.
  it("refuses an entry with nothing to log, and says why", () => {
    const replay = replayActivityJournal({
      entries: [entry({ reps: null, weight: null })],
      workout: workoutReducer(
        undefined,
        startWorkout({ initialExercises: [squat([squatSet("set-1")])] })
      ).currentWorkout,
    });

    expect(replay.completions).toEqual([]);
    expect(replay.skipped[0].reason).toBe("reps-missing");
  });

  // Replay runs through the same completion rule as the checkbox, but with no
  // draft and no history behind it: only what the lock screen displayed counts,
  // so a blank field cannot quietly pick up last session's numbers.
  it("does not fall back to a previous performance", () => {
    const replay = replayActivityJournal({
      entries: [entry({ reps: null, weight: 100 })],
      workout: workoutReducer(
        undefined,
        startWorkout({ initialExercises: [squat([squatSet("set-1")])] })
      ).currentWorkout,
    });

    expect(replay.completions).toEqual([]);
  });
});
