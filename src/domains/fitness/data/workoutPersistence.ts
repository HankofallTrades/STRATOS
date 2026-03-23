import type { Workout as WorkoutType } from "@/lib/types/workout";
import { isCardioSet, isStrengthSet } from "@/lib/types/workout";

export type PersistedWorkoutType = "strength" | "cardio" | "mixed";

type CompletedSetWithWorkoutExerciseId =
  WorkoutType["exercises"][number]["sets"][number] & { workoutExerciseId: string };

type MergedHistoryExercise =
  Omit<WorkoutType["exercises"][number], "id" | "workoutId" | "sets"> & {
    id: string;
    workoutId: string;
    sets: CompletedSetWithWorkoutExerciseId[];
  };

export interface FinalizedWorkoutSnapshot {
  durationInSeconds: number;
  workout: WorkoutType;
  workoutType: PersistedWorkoutType;
}

export const isLikelyNetworkError = (error: unknown): boolean => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  );
};

export const finalizeWorkout = ({
  workout,
  endTime,
  warmupStartTime,
  workoutStartTime,
}: {
  workout: WorkoutType;
  endTime: number;
  warmupStartTime: number | null;
  workoutStartTime: number | null;
}): FinalizedWorkoutSnapshot => {
  const durationInSeconds = workoutStartTime
    ? Math.max(0, Math.round((endTime - workoutStartTime) / 1000))
    : 0;

  const hasStrengthSets = workout.exercises.some(exercise =>
    exercise.sets.some(set => set.completed && isStrengthSet(set))
  );
  const hasCardioSets = workout.exercises.some(exercise =>
    exercise.sets.some(set => set.completed && isCardioSet(set))
  );

  let workoutType: PersistedWorkoutType = "strength";
  if (hasStrengthSets && hasCardioSets) {
    workoutType = "mixed";
  } else if (hasCardioSets) {
    workoutType = "cardio";
  }

  const warmupSeconds =
    workout.warmup_seconds ??
    (warmupStartTime
      ? Math.max(0, Math.round((endTime - warmupStartTime) / 1000))
      : undefined);

  return {
    durationInSeconds,
    workout: {
      ...workout,
      completed: true,
      duration: durationInSeconds,
      workout_type: workoutType,
      ...(typeof warmupSeconds === "number"
        ? { warmup_seconds: warmupSeconds }
        : {}),
    },
    workoutType,
  };
};

export const buildCompletedWorkoutForHistory = (
  workout: WorkoutType
): WorkoutType => {
  const exerciseHistoryMap: Record<string, MergedHistoryExercise> = {};
  const orderedExerciseIds: string[] = [];

  workout.exercises.forEach(workoutExercise => {
    const completedSets = workoutExercise.sets.filter(set => set.completed);
    if (completedSets.length === 0) {
      return;
    }

    if (!exerciseHistoryMap[workoutExercise.exerciseId]) {
      orderedExerciseIds.push(workoutExercise.exerciseId);
      exerciseHistoryMap[workoutExercise.exerciseId] = {
        ...workoutExercise,
        id: workoutExercise.id,
        workoutId: workout.id,
        sets: [],
      };
    }

    const savedWorkoutExerciseId = exerciseHistoryMap[workoutExercise.exerciseId].id;
    exerciseHistoryMap[workoutExercise.exerciseId].sets.push(
      ...completedSets.map(set => ({
        ...set,
        workoutExerciseId: savedWorkoutExerciseId,
      }))
    );
  });

  return {
    ...workout,
    exercises: orderedExerciseIds.map(id => exerciseHistoryMap[id]),
  };
};
