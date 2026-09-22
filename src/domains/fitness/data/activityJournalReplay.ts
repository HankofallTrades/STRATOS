import { clearActivityJournal, readActivityJournal } from "@/lib/native/liveActivity";
import { isCardioSet, type Workout } from "@/lib/types/workout";
import type { AppDispatch, RootState } from "@/state/store";
import {
  selectCurrentWorkout,
  setCompleted,
  updateCardioSet,
  updateSet,
} from "@/state/workout/workoutSlice";

import { replayActivityJournal } from "./activityJournal";

// Folding the Activity Journal back into the workout, and the ordering that
// hangs off it.
//
// This lives below the hooks because two callers need it and they must not race
// each other: the workout screen replays on foreground, and Finish has to know
// the journal is settled before it snapshots the workout. A replay is a bridge
// round trip, so "already running" is a state that outlives any one of them.

export interface ActivityJournalReplayDeps {
  dispatch: AppDispatch;
  getState: () => RootState;
}

/**
 * Read the journal, dispatch what it means, then clear what was read.
 *
 * The workout is read at the top rather than passed in: this runs from a
 * foreground event or from Finish, and the workout it has to reconcile against
 * is the one that exists now, not the one from whichever render asked.
 */
const replayOnce = async ({ dispatch, getState }: ActivityJournalReplayDeps) => {
  // With no workout on screen there is nothing to replay into, and clearing the
  // journal would throw away entries the session they belong to has not come
  // back to yet. A journal left over from a dead session is cleared by the next
  // one, whose sets it names none of.
  if (!selectCurrentWorkout(getState())) return;

  const entries = await readActivityJournal();
  if (entries.length === 0) return;

  const { completions, adjustments, skipped } = replayActivityJournal({
    entries,
    workout: selectCurrentWorkout(getState()),
  });

  for (const completion of completions) {
    dispatch(setCompleted(completion));
  }

  // Numbers the user changed on the lock screen and did not log. They are value
  // edits and nothing more: no completion, and so none of the things that
  // listen for one — the rest timer, the haptic — fire for them.
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

  // Every skip is the lock screen and the workout disagreeing about a set the
  // user thinks they logged, so none of them pass silently.
  if (skipped.length > 0) {
    console.warn("live activity: journal entries that logged nothing", skipped);
  }

  await clearActivityJournal(entries[entries.length - 1].id);
};

/**
 * Every replay, in order.
 *
 * Passes are chained rather than dropped when one is already running, because
 * the callers want different things from "in flight". The workout screen only
 * needs the journal folded in eventually; Finish needs a pass that began after
 * it asked, or it snapshots a workout the replay had not reached yet. Chaining
 * gives both, and costs a second bridge read that finds the journal already
 * emptied by the pass in front of it.
 *
 * Dropping instead — the shape this had while the screen was its only caller —
 * would answer Finish immediately and wrongly. Running them concurrently would
 * have both read the same journal before either dispatched, and everything
 * listening for `setCompleted` would fire twice for one set.
 */
let replayQueue: Promise<void> = Promise.resolve();

export const reconcileActivityJournal = (
  deps: ActivityJournalReplayDeps
): Promise<void> => {
  // Both arms run the next pass: a failed one must not wedge the chain shut.
  replayQueue = replayQueue.then(
    () => replayOnce(deps),
    () => replayOnce(deps)
  );
  return replayQueue;
};

/**
 * The workout as Finish should see it: whatever the lock screen logged is in it.
 *
 * Finish reads the workout through this rather than from its own render, since
 * the replay it just waited for is precisely what made that render stale. The
 * commit seam is untouched — this is its preamble, not a third thing
 * `commitFinalizedWorkout` has to know about, and it is down here rather than in
 * the hook so the ordering it exists for can be tested without a React runtime.
 *
 * "Reconciled", not "settled": settling is what the commit does to workout
 * history on the far side of this, and the two must not share a word.
 */
export const reconciledWorkoutForFinish = async (
  deps: ActivityJournalReplayDeps
): Promise<Workout | null> => {
  await reconcileActivityJournal(deps);
  return selectCurrentWorkout(deps.getState());
};
