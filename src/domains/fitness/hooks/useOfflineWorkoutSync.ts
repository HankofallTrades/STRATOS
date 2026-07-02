import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  clearWorkout,
  selectCurrentWorkout,
  selectWorkoutOwnerUserId,
} from "@/state/workout/workoutSlice";

import { getQueuedWorkouts } from "../data/offlineQueue";
import { commitFinalizedWorkout } from "../data/workoutCommit";
import { invalidateWorkoutDependentQueries } from "../data/queryInvalidation";

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

          const outcome = await commitFinalizedWorkout(
            {
              workout: entry.workout,
              durationInSeconds: entry.durationInSeconds,
              workoutType: entry.workoutType,
            },
            { userId: user.id, dispatch }
          );

          if (outcome.status === "saved") {
            syncedCount += 1;
          } else if (outcome.status === "queued") {
            // Still offline: the entry stays queued untouched; stop the pass.
            break;
          } else {
            hadSyncFailure = true;
          }
        }
      } finally {
        syncingRef.current = false;
      }

      if (syncedCount > 0) {
        await invalidateWorkoutDependentQueries(queryClient, user.id);
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
