import { describe, expect, it } from "vitest";

import { adjustSetTarget, setAdjustmentForKind } from "./setAdjustment";
import type { SetTarget } from "./setTarget";

// The rule these tests hold is that a lock-screen stepper lands on the number
// the in-app stepper would land on, and can never step a set into something the
// completion rule would refuse. Both matter on a locked phone, where the user
// cannot see what the app made of the tap until much later.

const target = (overrides: Partial<SetTarget> = {}): SetTarget => ({
  reps: 10,
  weight: 100,
  timeSeconds: null,
  distanceKm: null,
  ...overrides,
});

const stepped = ({
  kind,
  field,
  direction,
  from,
  times = 1,
}: {
  kind: "strength" | "time" | "cardio";
  field: keyof SetTarget;
  direction: 1 | -1;
  from: SetTarget;
  times?: number;
}): SetTarget => {
  const adjustment = setAdjustmentForKind(kind);
  let current = from;
  for (let tap = 0; tap < times; tap += 1) {
    current = adjustSetTarget({ target: current, adjustment, field, direction });
  }
  return current;
};

describe("adjustSetTarget", () => {
  it("moves reps a rep at a time, as the workout screen's stepper does", () => {
    expect(
      stepped({ kind: "strength", field: "reps", direction: -1, from: target() }).reps
    ).toBe(9);
  });

  it("moves weight a kilo at a time, and keeps a half-plate loading half", () => {
    // 82.5 is a real barbell weight and has to survive repeated taps intact:
    // the whole point of the feature is recording what was actually lifted.
    const up = stepped({
      kind: "strength",
      field: "weight",
      direction: 1,
      from: target({ weight: 82.5 }),
      times: 3,
    });

    expect(up.weight).toBe(85.5);
    expect(
      stepped({
        kind: "strength",
        field: "weight",
        direction: -1,
        from: up,
        times: 3,
      }).weight
    ).toBe(82.5);
  });

  it("leaves the other fields of the target alone", () => {
    expect(
      stepped({ kind: "strength", field: "reps", direction: 1, from: target() })
    ).toMatchObject({ weight: 100, timeSeconds: null, distanceKm: null });
  });

  it("will not step reps below one, however many times it is tapped", () => {
    // Zero reps is refused by `completeSetFromDraft`, so a set stepped down to
    // it would still be showing a Done button the replay would throw away.
    expect(
      stepped({
        kind: "strength",
        field: "reps",
        direction: -1,
        from: target({ reps: 3 }),
        times: 10,
      }).reps
    ).toBe(1);
  });

  it("stops weight at zero, because an unloaded lift is still a lift", () => {
    expect(
      stepped({
        kind: "strength",
        field: "weight",
        direction: -1,
        from: target({ weight: 2 }),
        times: 10,
      }).weight
    ).toBe(0);
  });

  it("will not step a hold below a second", () => {
    expect(
      stepped({
        kind: "time",
        field: "timeSeconds",
        direction: -1,
        from: target({ reps: null, timeSeconds: 3 }),
        times: 10,
      }).timeSeconds
    ).toBe(1);
  });

  it("moves cardio duration in half-minutes and floors at one of them", () => {
    const from = target({ reps: null, weight: null, timeSeconds: 60 });

    expect(
      stepped({ kind: "cardio", field: "timeSeconds", direction: 1, from }).timeSeconds
    ).toBe(90);
    expect(
      stepped({ kind: "cardio", field: "timeSeconds", direction: -1, from, times: 5 })
        .timeSeconds
    ).toBe(30);
  });

  it("does nothing to a field the kind cannot adjust", () => {
    // Reps on a timed hold: there is no rep count to move, and starting one
    // from zero would invent a number the user never chose.
    const from = target({ reps: null, timeSeconds: 30 });

    expect(stepped({ kind: "time", field: "reps", direction: 1, from })).toBe(from);
  });

  it("does nothing to a field the set has no target for", () => {
    const from = target({ reps: null });

    expect(stepped({ kind: "strength", field: "reps", direction: 1, from })).toBe(from);
  });
});

describe("setAdjustmentForKind", () => {
  it("offers a stepper only for the fields the kind is logged on", () => {
    expect(setAdjustmentForKind("strength").step).toMatchObject({
      reps: 1,
      weight: 1,
      timeSeconds: null,
      distanceKm: null,
    });
    expect(setAdjustmentForKind("time").step.reps).toBeNull();
    expect(setAdjustmentForKind("cardio").step.weight).toBeNull();
  });

  it("floors every adjustable field at something the completion rule accepts", () => {
    for (const kind of ["strength", "time", "cardio"] as const) {
      const { step, floor } = setAdjustmentForKind(kind);

      for (const field of ["reps", "weight", "timeSeconds", "distanceKm"] as const) {
        // A field with no step has no floor to speak of, and a field with one
        // must have a number rather than a null the arithmetic would guess at.
        expect(floor[field] === null).toBe(step[field] === null);
      }

      expect(floor.weight === null || floor.weight === 0).toBe(true);
    }
  });
});
