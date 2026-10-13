import type { Workout as WorkoutType } from "@/lib/types/workout";
import { isCardioSet, isStrengthSet } from "@/lib/types/workout";
import { workoutExerciseGroups } from "./supersets";

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

  // Supabase reports a failed fetch as a plain { message } object rather than
  // an Error, so read the message off either shape.
  const rawMessage =
    error && typeof error === "object" && "message" in error
      ? (error as { message: unknown }).message
      : undefined;
  if (typeof rawMessage !== "string") {
    return false;
  }

  const message = rawMessage.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    // WebKit (Safari, the iOS wrap) words its fetch failures differently.
    message.includes("load failed") ||
    message.includes("internet connection appears to be offline") ||
    message.includes("request timed out")
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

    const historyKey = workoutExercise.supersetId ? `instance:${workoutExercise.id}` : `exercise:${workoutExercise.exerciseId}`;
    if (!exerciseHistoryMap[historyKey]) {
      orderedExerciseIds.push(historyKey);
      exerciseHistoryMap[historyKey] = {
        ...workoutExercise,
        id: workoutExercise.id,
        workoutId: workout.id,
        sets: [],
      };
    }

    const savedWorkoutExerciseId = exerciseHistoryMap[historyKey].id;
    exerciseHistoryMap[historyKey].sets.push(
      ...completedSets.map(set => ({
        ...set,
        workoutExerciseId: savedWorkoutExerciseId,
      }))
    );
  });

  const exercises = orderedExerciseIds.map(id => exerciseHistoryMap[id]);
  for (const group of workoutExerciseGroups(exercises)) {
    if (group.length === 1) group[0].supersetId = null;
  }
  return {
    ...workout,
    exercises,
  };
};
