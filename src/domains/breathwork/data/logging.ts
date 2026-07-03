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
