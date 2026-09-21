import { useEffect, useMemo, useRef } from "react";
import { useStore } from "react-redux";

import { useAppSelector } from "@/hooks/redux";
import type { RootState } from "@/state/store";
import { selectIsWorkoutActive } from "@/state/workout/workoutSlice";
import { endLiveActivity, syncLiveActivity } from "@/lib/native/liveActivity";
import {
  areLiveActivityStatesEqual,
  buildLiveActivityState,
  type LiveActivityState,
} from "@/domains/fitness/data/liveActivityState";
import type { SetPlan } from "@/domains/fitness/data/setPlan";

/**
 * Keeps the lock screen on the same set as the workout, and takes it down when
 * the workout is over.
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
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const state = useMemo(() => buildLiveActivityState(setPlan), [setPlan]);
  const syncedStateRef = useRef<LiveActivityState | null>(null);

  useEffect(() => {
    if (!isWorkoutActive || !state) return;
    if (areLiveActivityStatesEqual(syncedStateRef.current, state)) return;

    syncedStateRef.current = state;
    void syncLiveActivity(state);
  }, [isWorkoutActive, state]);

  useEffect(
    () => () => {
      if (selectIsWorkoutActive(store.getState())) return;

      syncedStateRef.current = null;
      void endLiveActivity();
    },
    [store]
  );
};
