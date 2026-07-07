import { describe, expect, it } from "vitest";

import workoutReducer, {
  clearWorkout,
  startWorkout,
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
