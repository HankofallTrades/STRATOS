import { describe, expect, it } from "vitest";

import type { StrengthSet, WorkoutExercise } from "@/lib/types/workout";

import workoutReducer, {
  clearWorkout,
  setCompleted,
  startWarmup,
  startWorkout,
  uncompleteSet,
  updateSet,
  updateWorkoutExerciseEquipment,
  workoutFinished,
} from "./workoutSlice";

describe("workoutSlice — lastFinishedWorkoutId", () => {
  it("records the workout id on a finished (saved) session", () => {
    // useWorkout.saveWorkout dispatches workoutFinished(id) right before
    // clearWorkout() on a successful save. The proactive engine keys its
    // "session logged" nudge off this id, so it must survive the reducer.
    let state = workoutReducer(undefined, startWorkout());
    const id = state.currentWorkout!.id;

    state = workoutReducer(state, workoutFinished(id));
    state = workoutReducer(state, clearWorkout());

    expect(state.lastFinishedWorkoutId).toBe(id);
    expect(state.currentWorkout).toBeNull();
  });

  it("leaves lastFinishedWorkoutId untouched when a session is discarded", () => {
    // useWorkout.discardWorkout only dispatches clearWorkout() — it must
    // never cause a "session logged" nudge to fire for the discarded
    // workout, so clearWorkout must not fabricate a finished-workout id.
    const state = workoutReducer(undefined, startWorkout());

    const afterDiscard = workoutReducer(state, clearWorkout());

    expect(afterDiscard.lastFinishedWorkoutId).toBeNull();
    expect(afterDiscard.currentWorkout).toBeNull();
  });

  it("does not clear a previously recorded finished-workout id on a later discard", () => {
    // Regression guard: clearWorkout resets currentWorkout/startTime but
    // must not also wipe lastFinishedWorkoutId, otherwise the proactive
    // engine's edge-detection would race clearWorkout and silently miss
    // the save-triggered notification.
    let state = workoutReducer(undefined, startWorkout());
    const savedId = state.currentWorkout!.id;
    state = workoutReducer(state, workoutFinished(savedId));
    state = workoutReducer(state, clearWorkout());

    state = workoutReducer(state, startWorkout());
    state = workoutReducer(state, clearWorkout());

    expect(state.lastFinishedWorkoutId).toBe(savedId);
  });
});

const pendingSet: StrengthSet = {
  id: "set-1",
  exerciseId: "ex-1",
  weight: 0,
  reps: 0,
  time: null,
  completed: false,
};

const exercise: WorkoutExercise = {
  id: "we-1",
  exercise: { id: "ex-1", name: "Squat" },
  sets: [pendingSet],
};

const startedWorkout = () =>
  workoutReducer(undefined, startWorkout({ initialExercises: [exercise] }));

describe("workoutSlice — chosen weights", () => {
  // Zero weight is a real lift, so the Set Plan cannot tell a weight of zero
  // someone picked from the zero a new set is born with. The reducer marks it,
  // because every caller of updateSet is a person setting a number.
  it("marks the weight as chosen, even when the number is zero", () => {
    const state = workoutReducer(
      startedWorkout(),
      updateSet({ workoutExerciseId: "we-1", setId: "set-1", weight: 0, reps: 8 })
    );

    expect(state.currentWorkout!.exercises[0].sets[0]).toMatchObject({
      weight: 0,
      weightChosen: true,
    });
  });

  it("leaves an untouched set unmarked, so a suggestion can still fill it", () => {
    const set = startedWorkout().currentWorkout!.exercises[0].sets[0];

    expect(set).toMatchObject({ weight: 0 });
    expect((set as StrengthSet).weightChosen).toBeUndefined();
  });
});

describe("workoutSlice — set completion", () => {
  // Set completion decides the values and the tick in one go, so the reducer
  // stores them together. Splitting them would let a set be marked done while
  // still holding the zeros it was created with.
  it("stores the logged values and the completion as one change", () => {
    const state = workoutReducer(
      startedWorkout(),
      setCompleted({
        workoutExerciseId: "we-1",
        completedSet: { ...pendingSet, weight: 80, reps: 5, completed: true },
      })
    );

    expect(state.currentWorkout!.exercises[0].sets[0]).toMatchObject({
      weight: 80,
      reps: 5,
      completed: true,
    });
  });

  // The completed set is built from the row as it last rendered. Writing it
  // back wholesale would revert anything changed since — an equipment switch
  // propagated to the set, say — so only the logged values are written.
  it("writes the logged values without reverting the rest of the set", () => {
    let state = workoutReducer(
      startedWorkout(),
      updateWorkoutExerciseEquipment({ workoutExerciseId: "we-1", equipmentType: "Dumbbell" })
    );

    state = workoutReducer(
      state,
      setCompleted({
        workoutExerciseId: "we-1",
        completedSet: { ...pendingSet, weight: 80, reps: 5, equipmentType: "Barbell", completed: true },
      })
    );

    expect(state.currentWorkout!.exercises[0].sets[0]).toMatchObject({
      weight: 80,
      reps: 5,
      completed: true,
      equipmentType: "Dumbbell",
    });
  });

  it("ignores a completion for a set that is not in the workout", () => {
    const state = workoutReducer(
      startedWorkout(),
      setCompleted({
        workoutExerciseId: "we-1",
        completedSet: { ...pendingSet, id: "set-gone", completed: true },
      })
    );

    expect(state.currentWorkout!.exercises[0].sets).toHaveLength(1);
    expect(state.currentWorkout!.exercises[0].sets[0].completed).toBe(false);
  });

  // Warming up ends the moment the first set is logged; the elapsed time is
  // banked then, because nothing later in the session can tell where the
  // warmup stopped.
  it("closes the warmup on the first logged set", () => {
    let state = workoutReducer(startedWorkout(), startWarmup());
    expect(state.warmupStartTime).not.toBeNull();

    state = workoutReducer(
      state,
      setCompleted({
        workoutExerciseId: "we-1",
        completedSet: { ...pendingSet, weight: 80, reps: 5, completed: true },
      })
    );

    expect(state.warmupStartTime).toBeNull();
    expect(state.currentWorkout!.warmup_seconds).toBeGreaterThanOrEqual(0);
  });

  it("clears the tick without touching the logged values", () => {
    let state = workoutReducer(
      startedWorkout(),
      setCompleted({
        workoutExerciseId: "we-1",
        completedSet: { ...pendingSet, weight: 80, reps: 5, completed: true },
      })
    );

    state = workoutReducer(state, uncompleteSet({ workoutExerciseId: "we-1", setId: "set-1" }));

    expect(state.currentWorkout!.exercises[0].sets[0]).toMatchObject({
      weight: 80,
      reps: 5,
      completed: false,
    });
  });
});
