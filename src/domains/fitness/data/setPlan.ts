import type { SessionFocus, WorkoutExercise } from "@/lib/types/workout";
import {
  isCardioExercise,
  isCardioSet,
  isStrengthSet,
  timeToSeconds,
} from "@/lib/types/workout";

import {
  buildRecommendedStrengthSetPerformances,
  type HistoricalStrengthSetPerformance,
  type RecommendedStrengthSetPerformance,
  type StrengthRecommendationAction,
} from "./recommendations";
import type { SetTarget } from "./setTarget";

/**
 * How a planned set is performed, which decides what a suggestion can even mean.
 * Only `strength` sets carry a reps/weight suggestion; the other two are timed,
 * so their target is a duration the user already chose, not a progression.
 */
export type SetPlanEntryKind = "strength" | "time" | "cardio";

/** One set of the session, with everything needed to display it in isolation. */
export interface SetPlanEntry {
  setId: string;
  workoutExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  kind: SetPlanEntryKind;
  /** 1-based index across the whole session, so "set 7 of 12" is answerable. */
  position: number;
  /** 1-based index within this exercise, matching the recommendation set numbers. */
  setNumber: number;
  suggestedWeight: number | null;
  suggestedReps: number | null;
  suggestedTimeSeconds: number | null;
  /**
   * What logging this set right now would record: the set's own numbers where
   * it has them, and the suggestion for the fields it leaves blank.
   *
   * That order is the whole of it. A suggestion is something offered — the row
   * shows it as an indicator to apply — so it must not outrank numbers the user
   * has already put on the set, from the row or from the lock screen's
   * steppers. Logging 10 over a set the user stepped to 8, with nothing on
   * screen to say so, is the failure this ordering exists to prevent.
   */
  target: SetTarget;
  action: StrengthRecommendationAction;
  completed: boolean;
}

/**
 * Every set in the active session, in the order they are presented.
 *
 * The lock screen cannot call back into a suspended webview, so the whole
 * session has to be resolvable up front rather than a row at a time.
 */
export type SetPlan = SetPlanEntry[];

export interface BuildSetPlanInput {
  exercises: WorkoutExercise[];
  sessionFocus: SessionFocus | null | undefined;
  /**
   * Screen-level batched history, already resolved per workout exercise. Keyed
   * this way so the builder never has to know how history lookups are keyed or
   * fetched, which keeps it free of the repository and its Supabase client.
   */
  historyByWorkoutExerciseId: Record<
    string,
    HistoricalStrengthSetPerformance[] | null | undefined
  >;
}

const getSetPlanEntryKind = (
  exercise: WorkoutExercise["exercise"]
): SetPlanEntryKind => {
  if (isCardioExercise(exercise)) return "cardio";
  if (exercise.exercise_category === "breathwork") return "time";
  if (exercise.is_static) return "time";
  return "strength";
};

/**
 * The reps to target: the set's own where it has some, else the suggestion.
 *
 * Zero reps is not a choice anyone can make — Set completion refuses it — so an
 * untouched set reads as blank and the suggestion fills it. Where there is no
 * suggestion either, the blank stands rather than being invented into a number:
 * the lock screen shows such a set as having nothing to log, which is true.
 */
const targetReps = (
  stored: number | null,
  suggested: number | null | undefined
): number | null => (stored && stored > 0 ? stored : suggested ?? stored);

/**
 * The weight to target: the set's own where it has one, else the suggestion.
 *
 * Unlike reps, zero can be the answer. An unloaded lift is a real lift, so a
 * weight the user stepped down to zero has to survive the next plan rebuild
 * intact — which is why the set says whether its weight was chosen rather than
 * the number being read for it.
 */
const targetWeight = (
  set: { weight: number; weightChosen?: boolean },
  suggested: number | null | undefined
): number | null =>
  set.weightChosen || set.weight > 0 ? set.weight : suggested ?? set.weight;

export const buildSetPlan = ({
  exercises,
  sessionFocus,
  historyByWorkoutExerciseId,
}: BuildSetPlanInput): SetPlan => {
  const setPlan: SetPlan = [];
  let position = 0;

  for (const workoutExercise of exercises) {
    const kind = getSetPlanEntryKind(workoutExercise.exercise);

    // Reuse the one implementation of the progression rules. Forking them here
    // would let the lock screen and the workout screen drift apart.
    const recommendations =
      kind === "strength"
        ? buildRecommendedStrengthSetPerformances({
            focus: sessionFocus,
            currentSetCount: workoutExercise.sets.length,
            historicalSets: historyByWorkoutExerciseId[workoutExercise.id] ?? null,
          })
        : {};

    workoutExercise.sets.forEach((set, index) => {
      const setNumber = index + 1;
      const recommendation = recommendations[setNumber] ?? null;
      position += 1;

      const plannedTime = set.time ?? null;
      const suggestedTimeSeconds =
        kind === "strength"
          ? recommendation?.time_seconds ?? null
          : plannedTime
            ? timeToSeconds(plannedTime)
            : null;

      const storedTimeSeconds = plannedTime ? timeToSeconds(plannedTime) : null;
      const storedWeight = isStrengthSet(set) ? set.weight : null;
      const storedReps = isStrengthSet(set) ? set.reps : null;
      const storedDistanceKm = isCardioSet(set) ? set.distance_km ?? null : null;

      setPlan.push({
        setId: set.id,
        workoutExerciseId: workoutExercise.id,
        exerciseId: workoutExercise.exercise.id,
        exerciseName: workoutExercise.exercise.name,
        kind,
        position,
        setNumber,
        suggestedWeight: kind === "strength" ? recommendation?.weight ?? null : null,
        suggestedReps: kind === "strength" ? recommendation?.reps ?? null : null,
        suggestedTimeSeconds,
        target: {
          weight:
            kind === "strength" && isStrengthSet(set)
              ? targetWeight(set, recommendation?.weight)
              : storedWeight,
          reps: kind === "strength" ? targetReps(storedReps, recommendation?.reps) : null,
          // Every target falls back to what the set already holds, time
          // included: only the strength branch above can leave the suggestion
          // empty while the set itself carries a duration.
          timeSeconds: suggestedTimeSeconds ?? storedTimeSeconds,
          distanceKm: storedDistanceKm,
        },
        action: recommendation?.action ?? "none",
        completed: set.completed,
      });
    });
  }

  return setPlan;
};

/** Suggestions for one exercise, keyed by its 1-based set number. */
export type ExerciseSetRecommendations = Record<
  number,
  RecommendedStrengthSetPerformance | null
>;

/**
 * The workout screen's per-exercise view of the plan, in the shape the set rows
 * already render. Reading it back out of the plan is what keeps the screen and
 * the lock screen showing the same numbers.
 */
export const getExerciseSetPlanRecommendations = (
  setPlan: SetPlan,
  workoutExerciseId: string
): ExerciseSetRecommendations => {
  const recommendations: ExerciseSetRecommendations = {};

  for (const entry of setPlan) {
    if (entry.workoutExerciseId !== workoutExerciseId) continue;
    // Every recommendation branch resolves a weight, so a null weight means the
    // set has no suggestion at all rather than a suggestion of zero.
    if (entry.kind !== "strength" || entry.suggestedWeight === null) continue;

    recommendations[entry.setNumber] = {
      weight: entry.suggestedWeight,
      reps: entry.suggestedReps,
      time_seconds: entry.suggestedTimeSeconds,
      action: entry.action,
    };
  }

  return recommendations;
};

/**
 * Whether two sets of suggestions say the same thing.
 *
 * The plan is rebuilt whenever the workout changes, including on edits that
 * cannot move a suggestion. Exercise rows are memoised on their props, so
 * without this check a single set edit would re-render every row in the
 * session.
 */
export const areSetPlanRecommendationsEqual = (
  left: ExerciseSetRecommendations,
  right: ExerciseSetRecommendations
): boolean => {
  const leftSetNumbers = Object.keys(left);

  if (leftSetNumbers.length !== Object.keys(right).length) return false;

  return leftSetNumbers.every(key => {
    const leftRecommendation = left[Number(key)];
    const rightRecommendation = right[Number(key)];

    if (!leftRecommendation || !rightRecommendation) {
      return leftRecommendation === rightRecommendation;
    }

    return (
      leftRecommendation.weight === rightRecommendation.weight &&
      leftRecommendation.reps === rightRecommendation.reps &&
      leftRecommendation.time_seconds === rightRecommendation.time_seconds &&
      leftRecommendation.action === rightRecommendation.action
    );
  });
};
