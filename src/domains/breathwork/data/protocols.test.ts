import { describe, expect, it } from "vitest";

import {
  BREATHWORK_PROTOCOLS,
  buildSteps,
  completedUnits,
  shouldSaveEarlyExit,
  totalUnits,
  type PacedProtocol,
  type RoundsProtocol,
} from "./protocols";

const box = BREATHWORK_PROTOCOLS.find((p) => p.id === "box") as PacedProtocol;
const rounds = BREATHWORK_PROTOCOLS.find(
  (p) => p.id === "breath-rounds"
) as RoundsProtocol;

describe("buildSteps (paced)", () => {
  it("runs whole cycles until the target minutes are covered", () => {
    // Box cycle = 16s; 3 minutes = 180s -> ceil(180/16) = 12 cycles of 4 phases.
    const steps = buildSteps(box, 3);
    expect(steps).toHaveLength(48);
    expect(steps[0]).toMatchObject({ kind: "inhale", seconds: 4, unit: 0 });
    expect(steps[47]).toMatchObject({ kind: "hold", seconds: 4, unit: 11 });
    expect(totalUnits(box, 3)).toBe(12);
  });

  it("always schedules at least one full cycle", () => {
    expect(buildSteps(box, 0)).toHaveLength(4);
  });
});

describe("buildSteps (rounds)", () => {
  it("emits breaths, open retention, and recovery per round", () => {
    const steps = buildSteps(rounds);
    // per round: 30 breaths * 2 phases + retention + recovery = 62; 3 rounds = 186
    expect(steps).toHaveLength(186);
    const retention = steps[60];
    expect(retention).toMatchObject({ kind: "retention", seconds: null, unit: 0 });
    expect(steps[61]).toMatchObject({
      kind: "recovery",
      seconds: rounds.recoveryHoldSeconds,
      unit: 0,
    });
    expect(steps[0].breath).toBe(1);
    expect(steps[59].breath).toBe(30);
  });
});

describe("completedUnits / shouldSaveEarlyExit", () => {
  it("counts full paced cycles only", () => {
    const steps = buildSteps(box, 3);
    expect(completedUnits(box, steps, 3)).toBe(0);
    expect(completedUnits(box, steps, 4)).toBe(1);
    expect(shouldSaveEarlyExit(box, steps, 3)).toBe(false);
    expect(shouldSaveEarlyExit(box, steps, 4)).toBe(true);
  });

  it("counts a round only after its recovery hold finishes", () => {
    const steps = buildSteps(rounds);
    expect(completedUnits(rounds, steps, 61)).toBe(0);
    expect(completedUnits(rounds, steps, 62)).toBe(1);
  });
});
