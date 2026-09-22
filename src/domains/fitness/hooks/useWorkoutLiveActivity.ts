import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "react-redux";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { isCardioSet } from "@/lib/types/workout";
import type { RootState } from "@/state/store";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
  setCompleted,
  updateCardioSet,
  updateSet,
} from "@/state/workout/workoutSlice";
import {
  clearActivityJournal,
  endLiveActivity,
  readActivityJournal,
  syncLiveActivity,
} from "@/lib/native/liveActivity";
import { replayActivityJournal } from "@/domains/fitness/data/activityJournal";
import {
  areLiveActivityPlansEqual,
  buildLiveActivityPlan,
  type LiveActivityPlan,
} from "@/domains/fitness/data/liveActivityState";
import type { SetPlan } from "@/domains/fitness/data/setPlan";

/**
 * Keeps the lock screen on the same set as the workout, replays what was logged
 * from it while the app was away, and takes it down when the workout is over.
 *
 * Lives with the Set Plan rather than at the app root because the plan is what
 * the activity is made of. That puts it inside the workout screen's active
 * branch, so finishing and discarding do not re-render it — they unmount it,
 * because clearing the workout is exactly what drops the screen back to its
 * no-workout view. The end therefore has to happen on the way out, and it asks
 * the store rather than a captured render value, which still says the workout
 * is running: the same unmount also happens when the user merely navigates away
 * mid-session, and that must leave the lock screen up.
 */
export const useWorkoutLiveActivity = (setPlan: SetPlan): void => {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const plan = useMemo(() => buildLiveActivityPlan(setPlan), [setPlan]);
  const syncedPlanRef = useRef<LiveActivityPlan | null>(null);
  const replayingRef = useRef(false);

  /**
   * Fold the Activity Journal back into the workout.
   *
   * The store is read through `getState` rather than a rendered value: this
   * runs from a foreground event, and the workout it has to reconcile against
   * is the one that exists now, not the one from the render that subscribed.
   * The journal is cleared only after the completions are dispatched, and only
   * through the last entry that was read.
   */
  const replayJournal = useCallback(async () => {
    // Mount and a foreground event can land together, and both would read the
    // same journal before either had dispatched. The reducer would survive it,
    // but everything listening for `setCompleted` — the rest timer, the haptic
    // — would fire twice for one set.
    if (replayingRef.current) return;
    replayingRef.current = true;
    try {
      // With no workout on screen there is nothing to replay into, and clearing
      // the journal would throw away entries the session they belong to has not
      // come back to yet. A journal left over from a dead session is cleared by
      // the next one, whose sets it names none of.
      if (!selectCurrentWorkout(store.getState())) return;

      const entries = await readActivityJournal();
      if (entries.length === 0) return;

      const { completions, adjustments, skipped } = replayActivityJournal({
        entries,
        workout: selectCurrentWorkout(store.getState()),
      });

      for (const completion of completions) {
        dispatch(setCompleted(completion));
      }

      // Numbers the user changed on the lock screen and did not log. They are
      // value edits and nothing more: no completion, and so none of the things
      // that listen for one — the rest timer, the haptic — fire for them.
      for (const { workoutExerciseId, adjustedSet } of adjustments) {
        if (isCardioSet(adjustedSet)) {
          dispatch(
            updateCardioSet({
              workoutExerciseId,
              setId: adjustedSet.id,
              time: adjustedSet.time,
              distance_km: adjustedSet.distance_km,
            })
          );
          continue;
        }

        dispatch(
          updateSet({
            workoutExerciseId,
            setId: adjustedSet.id,
            weight: adjustedSet.weight,
            reps: adjustedSet.reps,
            time: adjustedSet.time,
          })
        );
      }

      // Every skip is the lock screen and the workout disagreeing about a set
      // the user thinks they logged, so none of them pass silently.
      if (skipped.length > 0) {
        console.warn("live activity: journal entries that logged nothing", skipped);
      }

      await clearActivityJournal(entries[entries.length - 1].id);
    } finally {
      replayingRef.current = false;
    }
  }, [dispatch, store]);

  // A cold launch is the other way back from the lock screen: the app can be
  // killed while the activity is up, and its journal outlives the process.
  useEffect(() => {
    void replayJournal();

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      void replayJournal();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [replayJournal]);

  useEffect(() => {
    if (!isWorkoutActive || plan.length === 0) return;
    if (areLiveActivityPlansEqual(syncedPlanRef.current, plan)) return;

    syncedPlanRef.current = plan;
    void syncLiveActivity(plan);
  }, [isWorkoutActive, plan]);

  useEffect(
    () => () => {
      if (selectIsWorkoutActive(store.getState())) return;

      syncedPlanRef.current = null;
      void endLiveActivity();
    },
    [store]
  );
};
