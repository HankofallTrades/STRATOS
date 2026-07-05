import { v4 as uuidv4 } from "uuid";

import type { Exercise, StrengthSet, WorkoutExercise } from "@/lib/types/workout";
import { isStrengthSet, secondsToTime } from "@/lib/types/workout";

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

/**
 * Record a finished breathwork run onto an existing workout exercise: fill its
 * first not-yet-completed set, or append a new completed timed set if every set
 * is already done. Pure — the caller dispatches replaceWorkoutExercise with the
 * result. Each run lands as one completed time-only set, like an extra "set" of
 * the exercise.
 */
export const applyBreathworkCompletion = (
  workoutExercise: WorkoutExercise,
  elapsedSeconds: number
): WorkoutExercise => {
  const time = secondsToTime(Math.round(elapsedSeconds));
  const targetIndex = workoutExercise.sets.findIndex(
    (set) => !set.completed && isStrengthSet(set)
  );

  if (targetIndex >= 0) {
    const sets = workoutExercise.sets.map((set, index) =>
      index === targetIndex
        ? { ...(set as StrengthSet), weight: 0, reps: null, time, completed: true }
        : set
    );
    return { ...workoutExercise, sets };
  }

  const set: StrengthSet = {
    id: uuidv4(),
    exerciseId: workoutExercise.exerciseId,
    weight: 0,
    reps: null,
    time,
    completed: true,
    variation: workoutExercise.variation ?? undefined,
    equipmentType: workoutExercise.equipmentType ?? undefined,
  };
  return { ...workoutExercise, sets: [...workoutExercise.sets, set] };
};
