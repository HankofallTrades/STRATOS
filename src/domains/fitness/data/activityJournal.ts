import { isCardioSet, type ExerciseSet, type Workout } from "@/lib/types/workout";

import {
  completeSetFromDraft,
  type CompletedSetKind,
  type SetCompletionRejection,
} from "./setCompletion";
import type { SetTarget } from "./setTarget";

// The Activity Journal: what the user did on the lock screen while the webview
// was suspended, recorded natively and replayed here when the app comes back.
//
// The journal is the source of truth for that stretch of time. It is not a
// parallel workout state — the native side only records that a button was
// pressed and what the lock screen was showing when it was; deciding what that
// is worth as a logged set happens here, through the same completion rule the
// checkbox uses.

/**
 * A lock-screen action.
 *
 * Both record the same thing — a button was pressed, and this is what the lock
 * screen was showing — and differ only in what the press was for. A stepper tap
 * is journalled rather than folded into the next completion because it is worth
 * something on its own: the user changed the number and may never press Done.
 */
export type ActivityJournalEntryKind = "set-completed" | "set-adjusted";

/**
 * The kinds as data. The native side writes these strings and nothing checks
 * them at either compiler, so the contract test holds this list against
 * `StratosActivityJournalKind`: a kind added on one side and not the other is
 * an entry that replays as nothing.
 */
const entryKinds: Record<ActivityJournalEntryKind, true> = {
  "set-completed": true,
  "set-adjusted": true,
};

export const ACTIVITY_JOURNAL_ENTRY_KINDS = Object.keys(
  entryKinds
) as ActivityJournalEntryKind[];

export interface ActivityJournalEntry {
  /** Native-assigned and unique — it is what the clear names once replayed. */
  id: string;
  kind: ActivityJournalEntryKind;
  /** How the set is performed, carried from the Set Plan entry it was logged from. */
  setKind: CompletedSetKind;
  setId: string;
  workoutExerciseId: string;
  /** When the button was pressed, ISO-8601. */
  at: string;
  /**
   * The target the lock screen was showing when it was pressed. What the user
   * saw is what gets logged: the app may have moved on since, but it was asleep
   * and the journal was not.
   */
  target: SetTarget;
}

/** One completion to apply, in the shape the `setCompleted` action takes. */
export interface ActivityJournalCompletion {
  workoutExerciseId: string;
  completedSet: ExerciseSet;
}

/**
 * One set whose numbers were changed on the lock screen and then left there.
 *
 * Only the sets that were not also completed: where Done followed the steppers
 * the completion carries the same numbers and says more, so applying both would
 * be one edit too many.
 */
export interface ActivityJournalAdjustment {
  workoutExerciseId: string;
  /** The set with the adjusted values, still uncompleted. */
  adjustedSet: ExerciseSet;
}

/**
 * Why an entry logged nothing. Every one of these leaves the lock screen a set
 * ahead of the workout, so they are reported rather than swallowed.
 */
export type ActivityJournalSkipReason =
  | "workout-missing"
  | "set-missing"
  | "already-completed"
  | SetCompletionRejection;

export interface ActivityJournalSkip {
  entryId: string;
  setId: string;
  reason: ActivityJournalSkipReason;
}

export interface ActivityJournalReplay {
  completions: ActivityJournalCompletion[];
  adjustments: ActivityJournalAdjustment[];
  skipped: ActivityJournalSkip[];
}

/**
 * A target as the completion rule wants it, which names the same numbers
 * differently: `time` and `duration` are one target read by two set kinds.
 *
 * The destructure is the point. A field added to `SetTarget` and not placed
 * here lands in `unmapped`, which cannot be assigned to an empty record — so it
 * is a compile error rather than a number that silently never reaches the set.
 */
const draftFromTarget = (target: SetTarget) => {
  const { reps, weight, timeSeconds, distanceKm, ...unmapped } = target;
  const everyFieldIsSpent: Record<string, never> = unmapped;
  void everyFieldIsSpent;

  return {
    weight,
    reps,
    time: timeSeconds,
    duration: timeSeconds,
    distance: distanceKm,
  };
};

/**
 * Whether a set already holds the numbers an adjustment would write.
 *
 * A retained adjustment is replayed on every foreground — it stays in the
 * journal until its set is logged, so the lock screen keeps showing it — and
 * re-dispatching the same values each time would churn the workout screen for
 * nothing. Only the fields completion writes are compared; an adjustment never
 * touches the rest.
 */
const holdsTheSameValues = (set: ExerciseSet, adjusted: ExerciseSet): boolean => {
  const time = JSON.stringify(set.time ?? null) === JSON.stringify(adjusted.time ?? null);

  if (isCardioSet(set) && isCardioSet(adjusted)) {
    return time && set.distance_km === adjusted.distance_km;
  }
  if (isCardioSet(set) || isCardioSet(adjusted)) return false;

  return time && set.weight === adjusted.weight && set.reps === adjusted.reps;
};

const findSet = (
  workout: Workout,
  workoutExerciseId: string,
  setId: string
): ExerciseSet | null => {
  const workoutExercise = workout.exercises.find(
    exercise => exercise.id === workoutExerciseId
  );
  return workoutExercise?.sets.find(set => set.id === setId) ?? null;
};

/**
 * Turn a journal into the set completions it means, against the workout as it
 * stands now.
 *
 * Pure, and idempotent in both directions that matter. A set the workout
 * already has completed is skipped, so replaying a journal that was applied but
 * not cleared — foreground, background, foreground again, or a crash between
 * the read and the clear — cannot log it twice. So is a set already completed
 * earlier in the same pass, which covers a duplicate entry within one journal.
 *
 * Nothing falls back to a previous performance: the journal carries the numbers
 * the lock screen displayed, and those are the whole of what the user agreed
 * to. An entry with nothing to log is refused by the completion rule exactly as
 * an empty row would be, and lands in `skipped`.
 *
 * Adjustments go through that same rule, because the question they ask is the
 * same one: what would logging these numbers record? The only difference is
 * that the set stays open afterwards. Keyed by set and applied last-wins, since
 * a run of stepper taps is one decision arrived at in stages, not eight edits.
 */
export const replayActivityJournal = ({
  entries,
  workout,
}: {
  entries: ActivityJournalEntry[];
  workout: Workout | null;
}): ActivityJournalReplay => {
  const completions: ActivityJournalCompletion[] = [];
  const skipped: ActivityJournalSkip[] = [];
  const completedInThisPass = new Set<string>();
  const adjustmentsBySetId = new Map<string, ActivityJournalAdjustment>();

  for (const entry of entries) {
    const skip = (reason: ActivityJournalSkipReason) =>
      skipped.push({ entryId: entry.id, setId: entry.setId, reason });

    if (!workout) {
      skip("workout-missing");
      continue;
    }

    const set = findSet(workout, entry.workoutExerciseId, entry.setId);

    // The workout moved on without the lock screen: the set was deleted, or the
    // journal outlived the session it was written for.
    if (!set) {
      skip("set-missing");
      continue;
    }

    if (set.completed || completedInThisPass.has(set.id)) {
      skip("already-completed");
      continue;
    }

    const result = completeSetFromDraft({
      set,
      kind: entry.setKind,
      draft: draftFromTarget(entry.target),
      previousPerformance: null,
    });

    if (result.status === "rejected") {
      skip(result.reason);
      continue;
    }

    if (entry.kind === "set-adjusted") {
      // What completing would have stored, minus the completing. Going through
      // the completion rule rather than writing the fields here is what keeps
      // an adjustment from being able to produce a set a tick never could.
      const adjustedSet = { ...result.completedSet, completed: false };

      if (holdsTheSameValues(set, adjustedSet)) {
        adjustmentsBySetId.delete(set.id);
        continue;
      }

      adjustmentsBySetId.set(set.id, {
        workoutExerciseId: entry.workoutExerciseId,
        adjustedSet,
      });
      continue;
    }

    completedInThisPass.add(set.id);
    // The completion carries the adjusted numbers itself — the lock screen was
    // showing them when Done was pressed — so a pending adjustment for this set
    // has already been said, and saying it again would be a second edit.
    adjustmentsBySetId.delete(set.id);
    completions.push({
      workoutExerciseId: entry.workoutExerciseId,
      completedSet: result.completedSet,
    });
  }

  return { completions, adjustments: [...adjustmentsBySetId.values()], skipped };
};
