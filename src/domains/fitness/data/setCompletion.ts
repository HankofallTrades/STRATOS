import {
  isCardioSet,
  isStrengthSet,
  secondsToTime,
  type ExerciseSet,
} from "@/lib/types/workout";

// Set completion: the whole rule for what a tapped checkbox is worth. Given the
// draft the user typed, the previous performance for that set, and how the set
// is performed, it either accepts — handing back the field values to show and
// the set as it should be stored — or refuses with a reason.
//
// No React, no redux, no Supabase: the Activity Journal replays lock-screen
// completions through this same function when the app reopens, and it has no
// draft state to lend.

/**
 * How the set is performed, which decides which fields have to be filled.
 * The same three kinds the Set Plan uses.
 */
export type CompletedSetKind = "strength" | "time" | "cardio";

/**
 * One field as the user left it. A string is what a text input holds; a number
 * is what a journal entry or a script hands over. Blank, missing and
 * unparseable all mean "not filled", which is what opens the auto-fill rules.
 */
export type SetDraftValue = string | number | null | undefined;

export interface SetCompletionDraft {
  weight?: SetDraftValue;
  reps?: SetDraftValue;
  /** Seconds held, for a static hold. */
  time?: SetDraftValue;
  /** Seconds elapsed, for cardio. */
  duration?: SetDraftValue;
  /** Kilometres covered, for cardio. */
  distance?: SetDraftValue;
}

/** Each draft field the rule filled in, ready to show in the input it came from. */
export type SetDraftUpdates = Partial<Record<keyof SetCompletionDraft, string>>;

/** What the same set number did the last time this exercise was trained. */
export interface PreviousSetPerformance {
  weight: number;
  reps: number | null;
  time_seconds?: number | null;
  distance_km?: number | null;
}

export interface SetCompletionInput {
  /** The set as it stands in the workout, before completion. */
  set: ExerciseSet;
  kind: CompletedSetKind;
  draft: SetCompletionDraft;
  previousPerformance: PreviousSetPerformance | null;
  /** The user's logged bodyweight, for the bodyweight fill rule. */
  userBodyweight?: number | null;
  /** Whether the user has edited the weight field, which closes the bodyweight fill. */
  weightTouched?: boolean;
}

/**
 * Why a set was refused. Each one means a field the set cannot be logged
 * without, and which neither the draft nor the previous performance supplied.
 */
export type SetCompletionRejection =
  | "reps-missing"
  | "hold-time-missing"
  | "duration-missing"
  | "weight-negative"
  | "kind-mismatch";

export type SetCompletionResult =
  | { status: "accepted"; updates: SetDraftUpdates; completedSet: ExerciseSet }
  | { status: "rejected"; reason: SetCompletionRejection };

const BODYWEIGHT_EQUIPMENT = "Bodyweight";

const parseDraftNumber = (value: SetDraftValue): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Reps and seconds are whole numbers; a typed "12.7" logs as 12, as it always has. */
const parseDraftWholeNumber = (value: SetDraftValue): number | null => {
  const parsed = parseDraftNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
};

/**
 * A bodyweight movement with no history has no weight to carry over, so the
 * user's own bodyweight stands in — but only while the field is untouched and
 * empty, so it never overwrites a number someone typed or a loaded weight.
 * Returns the weight to fill, or null to leave the field alone.
 */
export const bodyweightWeightFill = ({
  equipmentType,
  userBodyweight,
  previousPerformance,
  weight,
  weightTouched = false,
}: {
  equipmentType: string | null | undefined;
  userBodyweight: number | null | undefined;
  previousPerformance: PreviousSetPerformance | null;
  weight: SetDraftValue;
  weightTouched?: boolean;
}): number | null => {
  if (equipmentType !== BODYWEIGHT_EQUIPMENT) return null;
  if (!userBodyweight || userBodyweight <= 0) return null;
  if (previousPerformance) return null;
  if (weightTouched) return null;

  const typed = parseDraftNumber(weight);
  if (typed !== null && typed !== 0) return null;

  return userBodyweight;
};

/**
 * A field the user left blank falls back to what the same set did last time,
 * and the input has to show what was filled in rather than stay empty.
 * Returns null when there is nothing to fall back on either.
 */
const resolveField = (
  draftValue: SetDraftValue,
  lastTime: number | null | undefined,
  field: keyof SetCompletionDraft,
  updates: SetDraftUpdates,
  parse: (value: SetDraftValue) => number | null = parseDraftWholeNumber
): number | null => {
  const typed = parse(draftValue);
  if (typed !== null) return typed;
  if (!lastTime) return null;

  updates[field] = String(lastTime);
  return lastTime;
};

const resolveWeight = (
  { set, draft, previousPerformance, userBodyweight, weightTouched }: SetCompletionInput,
  updates: SetDraftUpdates
): number => {
  const typed = parseDraftNumber(draft.weight);
  if (typed !== null) return typed;

  if (previousPerformance) {
    updates.weight = String(previousPerformance.weight);
    return previousPerformance.weight;
  }

  const bodyweight = bodyweightWeightFill({
    equipmentType: isStrengthSet(set) ? set.equipmentType : null,
    userBodyweight,
    previousPerformance,
    weight: draft.weight,
    weightTouched,
  });
  if (bodyweight !== null) {
    updates.weight = String(bodyweight);
    return bodyweight;
  }

  // An unloaded set is a real set: zero is a weight, not a missing field.
  return 0;
};

/**
 * Decide a set completion. Accepts with the draft fields to show and the set as
 * it should be stored, or refuses and leaves everything as it was.
 */
export const completeSetFromDraft = (input: SetCompletionInput): SetCompletionResult => {
  const { set, kind, draft, previousPerformance } = input;
  const updates: SetDraftUpdates = {};

  if (kind === "cardio") {
    if (!isCardioSet(set)) return { status: "rejected", reason: "kind-mismatch" };

    const duration = resolveField(
      draft.duration,
      previousPerformance?.time_seconds,
      "duration",
      updates
    );
    const distance = resolveField(
      draft.distance,
      previousPerformance?.distance_km,
      "distance",
      updates,
      parseDraftNumber
    );

    if (duration === null || duration <= 0) {
      return { status: "rejected", reason: "duration-missing" };
    }

    return {
      status: "accepted",
      updates,
      completedSet: {
        ...set,
        time: secondsToTime(duration),
        distance_km: distance !== null && distance > 0 ? distance : undefined,
        completed: true,
      },
    };
  }

  if (!isStrengthSet(set)) return { status: "rejected", reason: "kind-mismatch" };

  const weight = resolveWeight(input, updates);
  if (weight < 0) return { status: "rejected", reason: "weight-negative" };

  if (kind === "time") {
    const holdSeconds = resolveField(
      draft.time,
      previousPerformance?.time_seconds,
      "time",
      updates
    );

    if (holdSeconds === null || holdSeconds <= 0) {
      return { status: "rejected", reason: "hold-time-missing" };
    }

    return {
      status: "accepted",
      updates,
      completedSet: {
        ...set,
        weight,
        reps: null,
        time: secondsToTime(holdSeconds),
        completed: true,
      },
    };
  }

  const reps = resolveField(draft.reps, previousPerformance?.reps, "reps", updates);

  if (reps === null || reps <= 0) {
    return { status: "rejected", reason: "reps-missing" };
  }

  return {
    status: "accepted",
    updates,
    completedSet: { ...set, weight, reps, time: null, completed: true },
  };
};
