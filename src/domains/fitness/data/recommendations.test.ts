import { describe, expect, it } from "vitest";

import {
  buildRecommendedStrengthSetPerformances,
  getProgressionRepRange,
  getStrengthRecommendationAction,
  type HistoricalStrengthSetPerformance,
} from "./recommendations";

const set = (
  set_number: number,
  weight: number,
  reps: number | null
): HistoricalStrengthSetPerformance => ({
  set_number,
  weight,
  reps,
  time_seconds: null,
});

describe("getProgressionRepRange", () => {
  // The rep range *is* the progression policy: it decides when a lift is
  // strong enough to add load vs. when reps should still climb.
  it("maps each training focus to its prescribed rep range", () => {
    expect(getProgressionRepRange("strength")).toEqual({ min: 3, max: 5 });
    expect(getProgressionRepRange("hypertrophy")).toEqual({ min: 8, max: 15 });
    expect(getProgressionRepRange("mixed")).toEqual({ min: 5, max: 8 });
  });

  it("returns null when focus is absent, so no progression is recommended", () => {
    expect(getProgressionRepRange(null)).toBeNull();
    expect(getProgressionRepRange(undefined)).toBeNull();
  });
});

describe("getStrengthRecommendationAction", () => {
  it("recommends adding load once the best set clears the top of the range", () => {
    // hypertrophy tops out at 15 reps; 16 means the load is too light.
    expect(getStrengthRecommendationAction("hypertrophy", [set(1, 100, 16)])).toBe(
      "increase_load"
    );
  });

  it("recommends dropping load when even the best set is below the range", () => {
    // Failing to reach 8 reps means the load was too heavy to progress on.
    expect(getStrengthRecommendationAction("hypertrophy", [set(1, 100, 5)])).toBe(
      "decrease_load"
    );
  });

  it("recommends adding reps while inside the range", () => {
    expect(getStrengthRecommendationAction("hypertrophy", [set(1, 100, 10)])).toBe(
      "increase_reps"
    );
  });

  it("judges progress by the best set, not the last or first", () => {
    // A strong top set should drive load progression even amid weaker sets.
    const sets = [set(1, 100, 8), set(2, 100, 16), set(3, 100, 7)];
    expect(getStrengthRecommendationAction("hypertrophy", sets)).toBe(
      "increase_load"
    );
  });

  it("ignores sets with no logged reps (e.g. timed/cardio rows)", () => {
    const sets = [set(1, 100, null), set(2, 100, 10)];
    expect(getStrengthRecommendationAction("hypertrophy", sets)).toBe(
      "increase_reps"
    );
  });

  it("recommends nothing without a rep range or without history", () => {
    expect(getStrengthRecommendationAction(null, [set(1, 100, 12)])).toBe("none");
    expect(getStrengthRecommendationAction("hypertrophy", [])).toBe("none");
    expect(getStrengthRecommendationAction("hypertrophy", null)).toBe("none");
  });
});

describe("buildRecommendedStrengthSetPerformances", () => {
  it("returns no recommendations when there is nothing to progress from", () => {
    expect(
      buildRecommendedStrengthSetPerformances({
        focus: "hypertrophy",
        currentSetCount: 3,
        historicalSets: [],
      })
    ).toEqual({});
    expect(
      buildRecommendedStrengthSetPerformances({
        focus: null,
        currentSetCount: 3,
        historicalSets: [set(1, 100, 12)],
      })
    ).toEqual({});
    expect(
      buildRecommendedStrengthSetPerformances({
        focus: "hypertrophy",
        currentSetCount: 0,
        historicalSets: [set(1, 100, 12)],
      })
    ).toEqual({});
  });

  it("on load increase, bumps weight and resets reps to the bottom of the range", () => {
    // Progressing load means starting the next cycle at the easy end of the range.
    const result = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 1,
      historicalSets: [set(1, 100, 16)],
    });
    // delta = max(5kg, 10% of 100) = 10kg -> 110kg, snapped to the 5kg grid.
    expect(result[1]).toEqual({
      weight: 110,
      reps: 8,
      time_seconds: null,
      action: "increase_load",
    });
  });

  it("uses the 5kg minimum increment for light loads", () => {
    const result = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 1,
      historicalSets: [set(1, 20, 16)],
    });
    // 10% of 20 = 2kg, below the 5kg floor, so the bar moves by 5kg.
    expect(result[1]?.weight).toBe(25);
  });

  it("on reps-in-range, keeps the weight and adds a single rep", () => {
    const result = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 1,
      historicalSets: [set(1, 100, 10)],
    });
    expect(result[1]).toEqual({
      weight: 100,
      reps: 11,
      time_seconds: null,
      action: "increase_reps",
    });
  });

  it("matches each working set to its own historical set number", () => {
    // Different sets can warrant different actions in the same exercise.
    const result = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 2,
      historicalSets: [set(1, 100, 16), set(2, 100, 10)],
    });
    expect(result[1]?.action).toBe("increase_load");
    expect(result[2]?.action).toBe("increase_reps");
  });

  it("falls back to the last historical set when a set number is missing", () => {
    // A newly added 3rd set inherits the most recent set's reference.
    const result = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 3,
      historicalSets: [set(1, 100, 10), set(2, 90, 10)],
    });
    expect(result[3]?.weight).toBe(90);
  });
});
