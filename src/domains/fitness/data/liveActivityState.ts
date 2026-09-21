import type { SetPlan, SetPlanEntryKind } from "./setPlan";

/**
 * Everything the lock screen shows about the session, resolved from the Set
 * Plan in one pass.
 *
 * The native side never derives any of this. Once the phone is locked the
 * webview is suspended and cannot answer a question, so whatever the Live
 * Activity needs has to already be in the state it was handed.
 */
export interface LiveActivityState {
  exerciseName: string;
  kind: SetPlanEntryKind;
  /** 1-based index within the current exercise. */
  setNumber: number;
  /** 1-based index across the whole session — the "7" in "set 7 of 12". */
  position: number;
  totalSets: number;
  suggestedReps: number | null;
  suggestedWeight: number | null;
  suggestedTimeSeconds: number | null;
}

/**
 * The current state of the session, or `null` when there is no set to show.
 *
 * The current set is the first one still open. Sets can be logged out of
 * order, so it is the first gap rather than one past the last completed set.
 * When every planned set is logged the last set stands, because the activity's
 * life is tied to the workout and not to the plan running out: the user can
 * still add an exercise, and the lock screen going blank mid-session would read
 * as the app having lost the workout.
 */
export const buildLiveActivityState = (setPlan: SetPlan): LiveActivityState | null => {
  if (setPlan.length === 0) return null;

  const current = setPlan.find(entry => !entry.completed) ?? setPlan[setPlan.length - 1];

  return {
    exerciseName: current.exerciseName,
    kind: current.kind,
    setNumber: current.setNumber,
    position: current.position,
    totalSets: setPlan.length,
    suggestedReps: current.suggestedReps,
    suggestedWeight: current.suggestedWeight,
    suggestedTimeSeconds: current.suggestedTimeSeconds,
  };
};

/**
 * Whether two reads of the session say the same thing.
 *
 * The plan is rebuilt on every workout change, most of which cannot move the
 * lock screen. Crossing the bridge on each one would push a redundant update
 * to a system-rate-limited surface.
 */
export const areLiveActivityStatesEqual = (
  left: LiveActivityState | null,
  right: LiveActivityState | null
): boolean => {
  if (!left || !right) return left === right;

  return (
    left.exerciseName === right.exerciseName &&
    left.kind === right.kind &&
    left.setNumber === right.setNumber &&
    left.position === right.position &&
    left.totalSets === right.totalSets &&
    left.suggestedReps === right.suggestedReps &&
    left.suggestedWeight === right.suggestedWeight &&
    left.suggestedTimeSeconds === right.suggestedTimeSeconds
  );
};
