import type { CompletedWeightedSetForPr } from "@/domains/analytics/data/analyticsRepository";
import { isStrengthSet, type ExerciseSet } from "@/lib/types/workout";
import {
  E1RM_IMPROVEMENT_EPSILON,
  calculateOneRepMax,
} from "@/lib/utils/workoutUtils";

// Pure rule for what a just-completed set is worth: a PR or an ordinary set.
// The haptic bridge plays whichever this returns. Same PR definition as the
// home model's "Recent PR" card: the set's e1RM beats the exercise's previous
// best, and a first-ever exercise has no best to beat.

export type SetCompletionKind = "set" | "pr";

const weightedE1RM = (set: ExerciseSet): number | null => {
  if (!isStrengthSet(set)) return null;
  if (set.weight <= 0 || typeof set.reps !== "number" || set.reps <= 0) {
    return null;
  }
  return calculateOneRepMax(set.weight, set.reps);
};

/**
 * The bar each exercise has to clear, from its completed weighted sets. Folded
 * here with the app's own e1RM formula rather than read from the e1RM RPC,
 * which uses a different one; a PR has to be measured the way it is displayed.
 */
export const bestE1RMByExerciseId = (
  rows: CompletedWeightedSetForPr[]
): Record<string, number> => {
  const best: Record<string, number> = {};
  for (const row of rows) {
    if (row.weight === null || row.reps === null) continue;
    const e1rm = calculateOneRepMax(row.weight, row.reps);
    if (best[row.exerciseId] === undefined || e1rm > best[row.exerciseId]) {
      best[row.exerciseId] = e1rm;
    }
  }
  return best;
};

export const classifySetCompletion = ({
  set,
  exerciseSets,
  priorBestE1RM,
}: {
  /** The set that was just completed. */
  set: ExerciseSet;
  /** Every set of the same exercise in this session, completed or not. */
  exerciseSets: ExerciseSet[];
  /** The exercise's all-time best e1RM before this session; null if none. */
  priorBestE1RM: number | null;
}): SetCompletionKind => {
  const e1rm = weightedE1RM(set);
  if (e1rm === null || priorBestE1RM === null) return "set";

  const sessionBest = exerciseSets
    .filter((other) => other.id !== set.id && other.completed)
    .map(weightedE1RM)
    .reduce<number>((best, value) => (value !== null && value > best ? value : best), 0);

  const barToBeat = Math.max(priorBestE1RM, sessionBest);
  return e1rm > barToBeat + E1RM_IMPROVEMENT_EPSILON ? "pr" : "set";
};
