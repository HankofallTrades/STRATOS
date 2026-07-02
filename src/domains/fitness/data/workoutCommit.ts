import { addWorkoutToHistory } from "@/state/history/historySlice";
import type { AppDispatch } from "@/state/store";

import { saveWorkoutToDb } from "./fitnessRepository";
import {
  enqueueWorkout,
  getQueuedWorkouts,
  removeQueuedWorkout,
} from "./offlineQueue";
import {
  buildCompletedWorkoutForHistory,
  isLikelyNetworkError,
  type FinalizedWorkoutSnapshot,
} from "./workoutPersistence";

// The one workout-commit path. Online save (useWorkoutPersistence) and offline
// replay (useOfflineWorkoutSync) both cross this interface: persist the
// finalized snapshot, fall back to the offline queue on network failure, and
// settle Redux history — including the server-id swap on the history entry.
// Callers own what genuinely differs per path: toasts, navigation, and cache
// invalidation timing (replay batches one invalidation per sync pass).

export type WorkoutCommitOutcome =
  | { status: "saved"; workoutId: string }
  | { status: "queued" }
  | { status: "failed"; error: unknown };

export interface WorkoutCommitDeps {
  userId: string;
  dispatch: AppDispatch;
}

export const commitFinalizedWorkout = async (
  snapshot: FinalizedWorkoutSnapshot,
  deps: WorkoutCommitDeps
): Promise<WorkoutCommitOutcome> => {
  const { workout, durationInSeconds, workoutType } = snapshot;
  try {
    const { workoutId } = await saveWorkoutToDb(
      deps.userId,
      workout,
      durationInSeconds,
      workoutType
    );
    // History carries the server id; the local queue entry (if any) is done.
    removeQueuedWorkout(workout.id);
    deps.dispatch(
      addWorkoutToHistory(
        buildCompletedWorkoutForHistory({ ...workout, id: workoutId })
      )
    );
    return { status: "saved", workoutId };
  } catch (error) {
    console.error("Error committing workout:", error);
    if (!isLikelyNetworkError(error)) {
      // Not a connectivity problem: report it, touch nothing (a queued entry
      // stays queued for a later pass).
      return { status: "failed", error };
    }
    const alreadyQueued = getQueuedWorkouts(deps.userId).some(
      (entry) => entry.id === workout.id
    );
    if (!alreadyQueued) {
      // First failure of a fresh save: queue it and settle history with the
      // local id so the workout shows up immediately.
      enqueueWorkout({
        id: workout.id,
        userId: deps.userId,
        workout,
        durationInSeconds,
        workoutType,
        queuedAt: Date.now(),
      });
      deps.dispatch(
        addWorkoutToHistory(buildCompletedWorkoutForHistory(workout))
      );
    }
    // Replaying an already-queued entry that fails again: leave it exactly as
    // it is (original queue position, history already settled when queued).
    return { status: "queued" };
  }
};
