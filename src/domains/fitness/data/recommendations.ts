import type { SessionFocus } from "@/lib/types/workout";

export interface HistoricalStrengthSetPerformance {
  set_number: number;
  weight: number;
  reps: number | null;
  time_seconds: number | null;
}

export type StrengthRecommendationAction =
  | "increase_load"
  | "decrease_load"
  | "increase_reps"
  | "none";

export interface RecommendedStrengthSetPerformance {
  weight: number;
  reps: number | null;
  time_seconds: number | null;
  action: StrengthRecommendationAction;
}

interface ProgressionRepRange {
  min: number;
  max: number;
}

const LOAD_INCREMENT_KG = 5;
const LOAD_CHANGE_PERCENT = 0.1;

export const getProgressionRepRange = (
  focus: SessionFocus | null | undefined
): ProgressionRepRange | null => {
  switch (focus) {
    case "strength":
      return { min: 3, max: 5 };
    case "hypertrophy":
      return { min: 8, max: 15 };
    case "mixed":
      return { min: 5, max: 8 };
    default:
      return null;
  }
};

const roundToNearestLoadIncrement = (value: number) =>
  Math.max(0, Math.round(value / LOAD_INCREMENT_KG) * LOAD_INCREMENT_KG);

const getAdjustedLoad = (
  weight: number,
  direction: "up" | "down"
): number => {
  const delta = Math.max(LOAD_INCREMENT_KG, weight * LOAD_CHANGE_PERCENT);
  const nextWeight = direction === "up" ? weight + delta : Math.max(0, weight - delta);
  return roundToNearestLoadIncrement(nextWeight);
};

const getStrengthRecommendationActionForSet = (
  repRange: ProgressionRepRange | null,
  referenceSet: HistoricalStrengthSetPerformance | null | undefined
): StrengthRecommendationAction => {
  if (!repRange || !referenceSet || referenceSet.reps === null) {
    return "none";
  }

  if (referenceSet.reps > repRange.max) {
    return "increase_load";
  }

  if (referenceSet.reps < repRange.min) {
    return "decrease_load";
  }

  return "increase_reps";
};

export const getStrengthRecommendationAction = (
  focus: SessionFocus | null | undefined,
  historicalSets: HistoricalStrengthSetPerformance[] | null | undefined
): StrengthRecommendationAction => {
  const repRange = getProgressionRepRange(focus);
  const repValues =
    historicalSets?.map(set => set.reps).filter((reps): reps is number => reps !== null) ?? [];

  if (!repRange || repValues.length === 0) {
    return "none";
  }

  const bestRepCount = Math.max(...repValues);

  if (bestRepCount > repRange.max) {
    return "increase_load";
  }

  if (bestRepCount < repRange.min) {
    return "decrease_load";
  }

  return "increase_reps";
};

export const buildRecommendedStrengthSetPerformances = ({
  focus,
  currentSetCount,
  historicalSets,
}: {
  focus: SessionFocus | null | undefined;
  currentSetCount: number;
  historicalSets: HistoricalStrengthSetPerformance[] | null | undefined;
}): Record<number, RecommendedStrengthSetPerformance | null> => {
  const repRange = getProgressionRepRange(focus);
  const orderedHistoricalSets = [...(historicalSets ?? [])].sort(
    (left, right) => left.set_number - right.set_number
  );
  const action = getStrengthRecommendationAction(focus, orderedHistoricalSets);
  const recommendations: Record<number, RecommendedStrengthSetPerformance | null> = {};

  if (!repRange || orderedHistoricalSets.length === 0 || currentSetCount <= 0) {
    return recommendations;
  }

  for (let index = 0; index < currentSetCount; index += 1) {
    const setNumber = index + 1;
    const referenceSet =
      orderedHistoricalSets.find(set => set.set_number === setNumber) ??
      orderedHistoricalSets[orderedHistoricalSets.length - 1];
    const action = getStrengthRecommendationActionForSet(repRange, referenceSet);

    if (!referenceSet) {
      recommendations[setNumber] = null;
      continue;
    }

    if (action === "increase_load") {
      recommendations[setNumber] = {
        weight: getAdjustedLoad(referenceSet.weight, "up"),
        reps: repRange.min,
        time_seconds: null,
        action,
      };
      continue;
    }

    if (action === "decrease_load") {
      recommendations[setNumber] = {
        weight: getAdjustedLoad(referenceSet.weight, "down"),
        reps: repRange.min,
        time_seconds: null,
        action,
      };
      continue;
    }

    if (action === "increase_reps") {
      const previousReps = referenceSet.reps ?? repRange.min - 1;
      recommendations[setNumber] = {
        weight: referenceSet.weight,
        reps: Math.min(previousReps + 1, repRange.max + 1),
        time_seconds: null,
        action,
      };
      continue;
    }

    recommendations[setNumber] = {
      weight: referenceSet.weight,
      reps: referenceSet.reps,
      time_seconds: referenceSet.time_seconds,
      action,
    };
  }

  return recommendations;
};
