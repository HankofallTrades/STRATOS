import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "react-redux";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { RootState } from "@/state/store";
import { selectIsWorkoutActive } from "@/state/workout/workoutSlice";
import { endLiveActivity, syncLiveActivity } from "@/lib/native/liveActivity";
import { reconcileActivityJournal } from "@/domains/fitness/data/activityJournalReplay";
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

  /**
   * Fold the Activity Journal back into the workout.
   *
   * The pass itself lives in the data layer, because Finish waits on the same
   * queue: a set logged on the lock screen has to be in the workout before it
   * is snapshotted (I-39).
   */
  const replayJournal = useCallback(
    () => reconcileActivityJournal({ dispatch, getState: store.getState }),
    [dispatch, store]
  );

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
