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
import type { ActivityJournalEntry } from "./activityJournal";

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

export type ActivityJournalReplayResult =
  | { status: "reconciled"; workout: Workout | null }
  | { status: "failed"; error: unknown; failureStarted: boolean };

// An episode survives screen remounts, but belongs to one store and workout.
// Finish always reports its failure; foreground only reports the first one.
const failedWorkouts = new WeakMap<ActivityJournalReplayDeps["getState"], string>();

/**
 * Read the journal, dispatch what it means, then clear what was read.
 *
 * The workout is read at the top rather than passed in: this runs from a
 * foreground event or from Finish, and the workout it has to reconcile against
 * is the one that exists now, not the one from whichever render asked.
 */
const replayOnce = async ({ dispatch, getState }: ActivityJournalReplayDeps): Promise<ActivityJournalReplayResult> => {
  // With no workout on screen there is nothing to replay into, and clearing the
  // journal would throw away entries the session they belong to has not come
  // back to yet. A journal left over from a dead session is cleared by the next
  // one, whose sets it names none of.
  const workout = selectCurrentWorkout(getState());
  if (!workout) {
    failedWorkouts.delete(getState);
    return { status: "reconciled", workout: null };
  }

  let entries: ActivityJournalEntry[];
  try {
    entries = await readActivityJournal();
  } catch (error) {
    const failureStarted = failedWorkouts.get(getState) !== workout.id;
    failedWorkouts.set(getState, workout.id);
    return { status: "failed", error, failureStarted };
  }
  failedWorkouts.delete(getState);
  if (entries.length === 0) {
    return { status: "reconciled", workout: selectCurrentWorkout(getState()) };
  }

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
  return { status: "reconciled", workout: selectCurrentWorkout(getState()) };
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
 *
 * Only a successful read returns a workout snapshot. Finish uses that snapshot
 * rather than its stale render; a failed read never means an empty workout.
 */
let replayQueue: Promise<unknown> = Promise.resolve();

export const reconcileActivityJournal = (
  deps: ActivityJournalReplayDeps
): Promise<ActivityJournalReplayResult> => {
  // Both arms run the next pass: a failed one must not wedge the chain shut.
  const replay = replayQueue.then(
    () => replayOnce(deps),
    () => replayOnce(deps)
  );
  replayQueue = replay;
  return replay;
};
