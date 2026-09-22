import type { ExerciseSet, Workout } from "@/lib/types/workout";

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

/** A lock-screen action. Adjusting reps and weight (I-20) joins this later. */
export type ActivityJournalEntryKind = "set-completed";

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
  skipped: ActivityJournalSkip[];
}

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
      draft: {
        weight: entry.target.weight,
        reps: entry.target.reps,
        time: entry.target.timeSeconds,
        duration: entry.target.timeSeconds,
        distance: entry.target.distanceKm,
      },
      previousPerformance: null,
    });

    if (result.status === "rejected") {
      skip(result.reason);
      continue;
    }

    completedInThisPass.add(set.id);
    completions.push({
      workoutExerciseId: entry.workoutExerciseId,
      completedSet: result.completedSet,
    });
  }

  return { completions, skipped };
};
