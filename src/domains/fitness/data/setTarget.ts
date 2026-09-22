/**
 * What logging a set right now would record.
 *
 * These four numbers travel together everywhere the lock screen is involved:
 * they are resolved in the Set Plan, projected into the Live Activity, stored
 * natively, written into the Activity Journal when a Done button is pressed,
 * and read back out on reopen. Naming them once means adding a fifth is one
 * edit rather than six, and means the sides can be checked against each other.
 *
 * `null` and `0` are not the same thing here. "No target" is a set that cannot
 * be logged at all; "a target of zero" is a number the user chose. The
 * completion rules turn on that difference, so it has to survive the bridge —
 * see `bridgePayload` in `StratosLiveActivityPlugin.swift`.
 */
export interface SetTarget {
  reps: number | null;
  weight: number | null;
  timeSeconds: number | null;
  distanceKm: number | null;
}

/**
 * Every field of a {@link SetTarget}, as data.
 *
 * The `Record` is the point: adding a field to `SetTarget` without adding it
 * here is a compile error, and this list is what the contract test compares
 * against the Swift mirror, which no compiler can reach.
 */
const setTargetFields: Record<keyof SetTarget, true> = {
  reps: true,
  weight: true,
  timeSeconds: true,
  distanceKm: true,
};

export const SET_TARGET_FIELDS = Object.keys(setTargetFields) as (keyof SetTarget)[];

export const areSetTargetsEqual = (left: SetTarget, right: SetTarget): boolean =>
  SET_TARGET_FIELDS.every(field => left[field] === right[field]);
