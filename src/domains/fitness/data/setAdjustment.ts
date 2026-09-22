import type { SetPlanEntryKind } from "./setPlan";
import type { SetTarget } from "./setTarget";

/**
 * How far a lock-screen stepper may move a target, and how far down.
 *
 * Both halves are resolved here and carried across the bridge rather than being
 * decided natively. The step a tap produces has to be the one the in-app
 * stepper produces — a set logged from the lock screen and the same set logged
 * from the workout screen must land on the same number — and the native side is
 * deliberately not a place where that kind of rule lives.
 *
 * `null` for a field means it is not adjustable from the lock screen at all. It
 * is the same distinction the target itself makes: no step is not a step of
 * zero, and a stepper that moved nothing would be a button that lies.
 */
export interface SetAdjustment {
  /** What one tap adds, or subtracts. Always positive. */
  step: SetTarget;
  /**
   * The lowest value a field can be stepped down to.
   *
   * It is not zero for everything. Zero reps is not a set and a zero-second
   * hold is not a hold — `completeSetFromDraft` refuses both — so stepping a
   * loggable set down to zero would turn its Done button into one the replay
   * throws away. The floor for the field that decides the kind is therefore one
   * step, and an unloaded lift is a real lift, so weight floors at zero.
   */
  floor: SetTarget;
}

/**
 * Every field of a {@link SetAdjustment}, as data — the same trick
 * `SET_TARGET_FIELDS` plays, and for the same reason: this list is what the
 * contract test holds against the Swift mirror no compiler can reach.
 */
const setAdjustmentFields: Record<keyof SetAdjustment, true> = {
  step: true,
  floor: true,
};

export const SET_ADJUSTMENT_FIELDS = Object.keys(
  setAdjustmentFields
) as (keyof SetAdjustment)[];

/**
 * The step each kind takes, matching the small (tap, not swipe) steps the
 * in-app steppers use in `WorkoutExerciseView`: a kilo, a rep, a second of
 * hold, half a minute of cardio.
 *
 * Only the two fields a kind is logged on are adjustable. Cardio distance is
 * left alone: it is not what the Done button needs to be allowed to log, and a
 * third stepper does not fit on a lock screen.
 */
const STEP_BY_KIND: Record<SetPlanEntryKind, SetTarget> = {
  strength: { reps: 1, weight: 1, timeSeconds: null, distanceKm: null },
  time: { reps: null, weight: 1, timeSeconds: 1, distanceKm: null },
  cardio: { reps: null, weight: null, timeSeconds: 30, distanceKm: null },
};

const floorFor = (step: SetTarget): SetTarget => ({
  reps: step.reps,
  weight: step.weight === null ? null : 0,
  timeSeconds: step.timeSeconds,
  distanceKm: step.distanceKm === null ? null : 0,
});

export const setAdjustmentForKind = (kind: SetPlanEntryKind): SetAdjustment => {
  const step = STEP_BY_KIND[kind];
  return { step, floor: floorFor(step) };
};

/** Which way a stepper tap goes. */
export type SetAdjustmentDirection = 1 | -1;

/**
 * The target a stepper tap produces.
 *
 * This is the web's statement of a rule the lock screen runs natively — the
 * phone is locked when the tap lands, and the webview cannot be asked what the
 * new number is. `StratosSetAdjustment.applied` in
 * `StratosSetActivityAttributes.swift` is the same arithmetic in Swift, and the
 * two must agree. Keeping it here is what lets it be tested at all.
 *
 * A field with no step, or no target to step from, is left exactly as it was: a
 * tap that cannot mean anything does nothing rather than inventing a number
 * from zero.
 */
export const adjustSetTarget = ({
  target,
  adjustment,
  field,
  direction,
}: {
  target: SetTarget;
  adjustment: SetAdjustment;
  field: keyof SetTarget;
  direction: SetAdjustmentDirection;
}): SetTarget => {
  const step = adjustment.step[field];
  const current = target[field];
  if (step === null || current === null) return target;

  const floor = adjustment.floor[field] ?? 0;
  // Rounded rather than truncated: the floats are all halves and tenths, and
  // repeated taps must not drift a 82.5 into a 82.49999999999999.
  const next = Math.max(floor, Math.round((current + step * direction) * 100) / 100);

  return { ...target, [field]: next };
};
