import type { SetPlan, SetPlanEntry, SetPlanEntryKind } from "./setPlan";
import { areSetTargetsEqual, type SetTarget } from "./setTarget";

/**
 * One set of the session as the lock screen sees it: what to show, and what a
 * Done button would log.
 *
 * Nothing here is derived natively. Once the phone is locked the webview is
 * suspended and cannot answer a question, so every number the activity can ever
 * display has to already be in the plan it was handed.
 */
export interface LiveActivitySet {
  setId: string;
  workoutExerciseId: string;
  exerciseName: string;
  kind: SetPlanEntryKind;
  /** 1-based index within the current exercise. */
  setNumber: number;
  /** 1-based index across the whole session — the "7" in "set 7 of 12". */
  position: number;
  /** What a Done tap would log, carried over from the Set Plan unchanged. */
  target: SetTarget;
  completed: boolean;
  /**
   * Whether this set has enough of a target to be logged at all.
   *
   * A set with no reps, hold or duration behind it is refused by
   * `completeSetFromDraft` — the same refusal an empty row on the workout
   * screen gets. The lock screen has no way to show that refusal and no way to
   * ask for the missing number, so it does not offer the button: tapping Done
   * and having the set still be waiting on reopen is worse than no button.
   */
  loggable: boolean;
}

/**
 * Whether a target is a number worth logging. Zero reps is not a set, and a
 * zero-second hold is not a hold — the completion rule refuses both.
 */
const isLoggableTarget = (value: number | null): boolean => value !== null && value > 0;

/**
 * Restates which field each kind cannot be logged without, matching the
 * `reps-missing`, `hold-time-missing` and `duration-missing` refusals in
 * `setCompletion.ts`. It asks the question one step earlier, from the plan
 * rather than from a set, because the lock screen has to decide whether to draw
 * a button before anyone taps it.
 */
const isLoggable = (entry: SetPlanEntry): boolean =>
  entry.kind === "strength"
    ? isLoggableTarget(entry.target.reps)
    : isLoggableTarget(entry.target.timeSeconds);

/**
 * The whole session, handed over rather than one set at a time.
 *
 * The native side walks it: which entry is current is a cursor over this list
 * and the Activity Journal, and it has to move on a Done tap with no webview to
 * ask. That walk is the one thing Swift decides, and it is the rule restated
 * below in {@link currentLiveActivitySet} — the two must agree.
 */
export type LiveActivityPlan = LiveActivitySet[];

export const buildLiveActivityPlan = (setPlan: SetPlan): LiveActivityPlan =>
  setPlan.map(entry => ({
    setId: entry.setId,
    workoutExerciseId: entry.workoutExerciseId,
    exerciseName: entry.exerciseName,
    kind: entry.kind,
    setNumber: entry.setNumber,
    position: entry.position,
    target: entry.target,
    completed: entry.completed,
    loggable: isLoggable(entry),
  }));

/**
 * The set the lock screen is on, or `null` when there is nothing to show.
 *
 * The current set is the first one still open. Sets can be logged out of order,
 * so it is the first gap rather than one past the last completed set. When
 * every planned set is logged the last set stands, because the activity's life
 * is tied to the workout and not to the plan running out: the user can still
 * add an exercise, and the lock screen going blank mid-session would read as
 * the app having lost the workout.
 *
 * This is the web's statement of the rule `StratosActivityCursor` implements in
 * Swift. It is what the app shows while it is awake, so a disagreement between
 * the two surfaces shows up here rather than only on a locked phone.
 */
export const currentLiveActivitySet = (plan: LiveActivityPlan): LiveActivitySet | null => {
  if (plan.length === 0) return null;
  return plan.find(entry => !entry.completed) ?? plan[plan.length - 1];
};

/**
 * Whether two reads of the session say the same thing.
 *
 * The plan is rebuilt on every workout change, most of which cannot move the
 * lock screen. Crossing the bridge on each one would push a redundant update to
 * a system-rate-limited surface.
 */
export const areLiveActivityPlansEqual = (
  left: LiveActivityPlan | null,
  right: LiveActivityPlan | null
): boolean => {
  if (!left || !right) return left === right;
  if (left.length !== right.length) return false;

  return left.every((entry, index) => {
    const other = right[index];

    return (
      entry.setId === other.setId &&
      entry.workoutExerciseId === other.workoutExerciseId &&
      entry.exerciseName === other.exerciseName &&
      entry.kind === other.kind &&
      entry.setNumber === other.setNumber &&
      entry.position === other.position &&
      areSetTargetsEqual(entry.target, other.target) &&
      entry.completed === other.completed &&
      entry.loggable === other.loggable
    );
  });
};
