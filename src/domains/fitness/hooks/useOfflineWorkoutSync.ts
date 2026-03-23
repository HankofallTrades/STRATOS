import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  clearWorkout,
  selectCurrentWorkout,
  selectWorkoutOwnerUserId,
} from "@/state/workout/workoutSlice";

import { getQueuedWorkouts, removeQueuedWorkout } from "../data/offlineQueue";
import { saveWorkoutToDb } from "../data/fitnessRepository";
import {
  buildCompletedWorkoutForHistory,
  isLikelyNetworkError,
} from "../data/workoutPersistence";

export const useOfflineWorkoutSync = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { loading, user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutOwnerUserId = useAppSelector(selectWorkoutOwnerUserId);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (loading || !currentWorkout) {
      return;
    }

    if (!user || !workoutOwnerUserId || workoutOwnerUserId !== user.id) {
      dispatch(clearWorkout());
    }
  }, [currentWorkout, dispatch, loading, user, workoutOwnerUserId]);

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    let cancelled = false;

    const syncQueuedWorkouts = async () => {
      if (syncingRef.current || !navigator.onLine) {
        return;
      }

      const queuedWorkouts = getQueuedWorkouts(user.id);
      if (queuedWorkouts.length === 0) {
        return;
      }

      syncingRef.current = true;

      let syncedCount = 0;
      let hadSyncFailure = false;

      try {
        for (const entry of queuedWorkouts) {
          if (cancelled) {
            break;
          }

          try {
            const { workoutId } = await saveWorkoutToDb(
              user.id,
              entry.workout,
              entry.durationInSeconds,
              entry.workoutType
            );

            removeQueuedWorkout(entry.id);
            dispatch(
              addWorkoutToHistory(
                buildCompletedWorkoutForHistory({
                  ...entry.workout,
                  id: workoutId,
                })
              )
            );
            syncedCount += 1;
          } catch (error) {
            console.error("Error syncing offline workout:", error);

            if (isLikelyNetworkError(error)) {
              break;
            }

            hadSyncFailure = true;
          }
        }
      } finally {
        syncingRef.current = false;
      }

      if (syncedCount > 0) {
        await queryClient.invalidateQueries();
        toast({
          title: `Synced ${syncedCount} offline workout${syncedCount === 1 ? "" : "s"}`,
          description: "Your locally saved workouts are now on your profile.",
        });
      }

      if (hadSyncFailure) {
        toast({
          title: "Offline sync needs attention",
          description:
            "At least one queued workout could not be uploaded yet. It will stay queued on this device.",
          variant: "destructive",
        });
      }
    };

    void syncQueuedWorkouts();

    const handleOnline = () => {
      void syncQueuedWorkouts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncQueuedWorkouts();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, loading, queryClient, user]);
};
