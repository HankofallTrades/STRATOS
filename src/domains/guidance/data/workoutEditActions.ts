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
