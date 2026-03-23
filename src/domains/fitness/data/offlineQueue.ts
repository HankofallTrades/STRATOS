import type { Workout as WorkoutType } from "@/lib/types/workout";

import type { PersistedWorkoutType } from "./workoutPersistence";

export interface QueuedWorkout {
  id: string;
  queuedAt: number;
  userId: string;
  durationInSeconds: number;
  workoutType: PersistedWorkoutType;
  workout: WorkoutType;
}

const STORAGE_KEY = "stratos.offline.workouts.v1";

const isQueuedWorkout = (value: unknown): value is QueuedWorkout => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<QueuedWorkout>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.queuedAt === "number" &&
    typeof candidate.userId === "string" &&
    typeof candidate.durationInSeconds === "number" &&
    (candidate.workoutType === "strength" ||
      candidate.workoutType === "cardio" ||
      candidate.workoutType === "mixed") &&
    Boolean(candidate.workout)
  );
};

const readQueue = (): QueuedWorkout[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isQueuedWorkout);
  } catch {
    return [];
  }
};

const writeQueue = (entries: QueuedWorkout[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getQueuedWorkouts = (userId?: string): QueuedWorkout[] =>
  readQueue()
    .filter(entry => (userId ? entry.userId === userId : true))
    .sort((left, right) => left.queuedAt - right.queuedAt);

export const enqueueWorkout = (entry: QueuedWorkout): void => {
  const queue = readQueue().filter(existingEntry => existingEntry.id !== entry.id);
  queue.push(entry);
  writeQueue(queue.sort((left, right) => left.queuedAt - right.queuedAt));
};

export const removeQueuedWorkout = (id: string): void => {
  writeQueue(readQueue().filter(entry => entry.id !== id));
};

export const clearQueuedWorkouts = (userId?: string): void => {
  if (!userId) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return;
  }

  writeQueue(readQueue().filter(entry => entry.userId !== userId));
};
