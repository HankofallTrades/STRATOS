import { describe, expect, it } from "vitest";

import type { CardioSet, StrengthSet } from "@/lib/types/workout";
import { isCardioSet, isStrengthSet, secondsToTime } from "@/lib/types/workout";

import {
  bodyweightWeightFill,
  completeSetFromDraft,
  type PreviousSetPerformance,
  type SetCompletionResult,
} from "./setCompletion";

const strengthSet = (overrides: Partial<StrengthSet> = {}): StrengthSet => ({
  id: "set-1",
  exerciseId: "ex-1",
  weight: 0,
  reps: 0,
  time: null,
  completed: false,
  variation: "Standard",
  equipmentType: "Barbell",
  ...overrides,
});

const cardioSet = (overrides: Partial<CardioSet> = {}): CardioSet => ({
  id: "set-1",
  exerciseId: "ex-2",
  time: secondsToTime(0),
  completed: false,
  ...overrides,
});

const previous = (
  overrides: Partial<PreviousSetPerformance> = {}
): PreviousSetPerformance => ({
  weight: 60,
  reps: 8,
  time_seconds: null,
  distance_km: null,
  ...overrides,
});

const accepted = (result: SetCompletionResult) => {
  if (result.status !== "accepted") {
    throw new Error(`expected an accepted completion, got ${result.reason}`);
  }
  return result;
};

const acceptedStrength = (result: SetCompletionResult) => {
  const { completedSet, updates } = accepted(result);
  if (!isStrengthSet(completedSet)) throw new Error("expected a strength set");
  return { completedSet, updates };
};

const acceptedCardio = (result: SetCompletionResult) => {
  const { completedSet, updates } = accepted(result);
  if (!isCardioSet(completedSet)) throw new Error("expected a cardio set");
  return { completedSet, updates };
};

describe("completeSetFromDraft — a set with reps", () => {
  it("logs what the user typed", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "strength",
        draft: { weight: "80", reps: "5" },
        previousPerformance: previous(),
      })
    );

    expect(completedSet).toMatchObject({ weight: 80, reps: 5, time: null, completed: true });
    // Nothing was filled in for the user, so no input has to change.
    expect(updates).toEqual({});
  });

  // Tapping the checkbox on an untouched row is the fastest way to repeat last
  // session's set — the rule is "same as last time", not "empty set".
  it("carries the previous performance into fields left blank", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "strength",
        draft: { weight: "", reps: "" },
        previousPerformance: previous({ weight: 60, reps: 8 }),
      })
    );

    expect(completedSet).toMatchObject({ weight: 60, reps: 8 });
    // The inputs have to show the values that were logged, not stay empty.
    expect(updates).toEqual({ weight: "60", reps: "8" });
  });

  it("keeps a typed zero weight rather than treating it as blank", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "strength",
        draft: { weight: "0", reps: "12" },
        previousPerformance: previous({ weight: 60, reps: 8 }),
      })
    );

    expect(completedSet.weight).toBe(0);
    expect(updates.weight).toBeUndefined();
  });

  // An unloaded movement on its first ever outing still logs; only the rep
  // count is load-bearing for a reps set.
  it("logs a blank weight as zero when there is nothing to carry over", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "strength",
        draft: { weight: "", reps: "10" },
        previousPerformance: null,
      })
    );

    expect(completedSet.weight).toBe(0);
    expect(updates).toEqual({});
  });

  it("refuses a set with no reps and no previous reps to borrow", () => {
    const result = completeSetFromDraft({
      set: strengthSet(),
      kind: "strength",
      draft: { weight: "80", reps: "" },
      previousPerformance: previous({ reps: null }),
    });

    expect(result).toEqual({ status: "rejected", reason: "reps-missing" });
  });

  it("refuses zero reps even when a previous performance exists", () => {
    const result = completeSetFromDraft({
      set: strengthSet(),
      kind: "strength",
      draft: { weight: "80", reps: "0" },
      previousPerformance: previous({ reps: 8 }),
    });

    expect(result).toEqual({ status: "rejected", reason: "reps-missing" });
  });

  it("refuses a negative weight", () => {
    const result = completeSetFromDraft({
      set: strengthSet(),
      kind: "strength",
      draft: { weight: "-5", reps: "5" },
      previousPerformance: null,
    });

    expect(result).toEqual({ status: "rejected", reason: "weight-negative" });
  });

  it("keeps the set's own variation and equipment on the logged set", () => {
    const { completedSet } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet({ variation: "Paused", equipmentType: "Dumbbell" }),
        kind: "strength",
        draft: { weight: "30", reps: "10" },
        previousPerformance: null,
      })
    );

    expect(completedSet).toMatchObject({ variation: "Paused", equipmentType: "Dumbbell" });
  });

  // The journal records numbers, not keystrokes, and replays through this same
  // rule when the app reopens after a lock-screen completion.
  it("takes numbers as readily as typed strings", () => {
    const { completedSet } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "strength",
        draft: { weight: 82.5, reps: 6 },
        previousPerformance: null,
      })
    );

    expect(completedSet).toMatchObject({ weight: 82.5, reps: 6 });
  });
});

describe("completeSetFromDraft — a static hold", () => {
  it("logs seconds held and never reps", () => {
    const { completedSet } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "time",
        draft: { weight: "20", time: "45", reps: "8" },
        previousPerformance: null,
      })
    );

    expect(completedSet.time).toEqual(secondsToTime(45));
    // A hold has no rep count, whatever the reps input happens to hold.
    expect(completedSet.reps).toBeNull();
  });

  it("carries the previous hold duration into a blank time field", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet(),
        kind: "time",
        draft: { weight: "", time: "" },
        previousPerformance: previous({ weight: 20, reps: null, time_seconds: 60 }),
      })
    );

    expect(completedSet.time).toEqual(secondsToTime(60));
    expect(updates).toEqual({ weight: "20", time: "60" });
  });

  // Reps would satisfy a normal set, but a hold with no duration has nothing
  // worth logging.
  it("refuses a hold with no duration", () => {
    const result = completeSetFromDraft({
      set: strengthSet(),
      kind: "time",
      draft: { weight: "20", time: "", reps: "8" },
      previousPerformance: previous({ time_seconds: null }),
    });

    expect(result).toEqual({ status: "rejected", reason: "hold-time-missing" });
  });
});

describe("completeSetFromDraft — cardio", () => {
  it("logs duration and distance", () => {
    const { completedSet } = acceptedCardio(
      completeSetFromDraft({
        set: cardioSet(),
        kind: "cardio",
        draft: { duration: "1200", distance: "4.2" },
        previousPerformance: null,
      })
    );

    expect(completedSet).toMatchObject({
      time: secondsToTime(1200),
      distance_km: 4.2,
      completed: true,
    });
  });

  it("carries the previous duration and distance into blank fields", () => {
    const { completedSet, updates } = acceptedCardio(
      completeSetFromDraft({
        set: cardioSet(),
        kind: "cardio",
        draft: { duration: "", distance: "" },
        previousPerformance: previous({ time_seconds: 900, distance_km: 3 }),
      })
    );

    expect(completedSet).toMatchObject({ time: secondsToTime(900), distance_km: 3 });
    expect(updates).toEqual({ duration: "900", distance: "3" });
  });

  // Distance is optional — a rower or a bike session is a real session without
  // one — so an unfilled distance is stored as absent rather than as zero.
  it("logs a duration-only session with no distance", () => {
    const { completedSet } = acceptedCardio(
      completeSetFromDraft({
        set: cardioSet(),
        kind: "cardio",
        draft: { duration: "600", distance: "" },
        previousPerformance: null,
      })
    );

    expect(completedSet.distance_km).toBeUndefined();
  });

  it("refuses a cardio set with no duration", () => {
    const result = completeSetFromDraft({
      set: cardioSet(),
      kind: "cardio",
      draft: { duration: "", distance: "5" },
      previousPerformance: null,
    });

    expect(result).toEqual({ status: "rejected", reason: "duration-missing" });
  });
});

describe("completeSetFromDraft — kind and set have to agree", () => {
  it("refuses cardio fields on a strength set", () => {
    const result = completeSetFromDraft({
      set: strengthSet(),
      kind: "cardio",
      draft: { duration: "600" },
      previousPerformance: null,
    });

    expect(result).toEqual({ status: "rejected", reason: "kind-mismatch" });
  });

  it("refuses reps on a cardio set", () => {
    const result = completeSetFromDraft({
      set: cardioSet(),
      kind: "strength",
      draft: { reps: "10" },
      previousPerformance: null,
    });

    expect(result).toEqual({ status: "rejected", reason: "kind-mismatch" });
  });
});

describe("bodyweightWeightFill", () => {
  const base = {
    equipmentType: "Bodyweight",
    userBodyweight: 82,
    previousPerformance: null,
    weight: "",
  };

  it("stands the user's bodyweight in for an empty weight on a bodyweight movement", () => {
    expect(bodyweightWeightFill(base)).toBe(82);
  });

  it("fills a zero weight, which is what an untouched bodyweight set starts at", () => {
    expect(bodyweightWeightFill({ ...base, weight: "0" })).toBe(82);
  });

  it("leaves a weight the user typed alone", () => {
    expect(bodyweightWeightFill({ ...base, weight: "10" })).toBeNull();
    expect(bodyweightWeightFill({ ...base, weightTouched: true })).toBeNull();
  });

  // With history the carried-over weight already includes however the set was
  // loaded, so adding bodyweight on top would double-count it.
  it("defers to a previous performance", () => {
    expect(bodyweightWeightFill({ ...base, previousPerformance: previous() })).toBeNull();
  });

  it("does nothing for loaded equipment or an unknown bodyweight", () => {
    expect(bodyweightWeightFill({ ...base, equipmentType: "Barbell" })).toBeNull();
    expect(bodyweightWeightFill({ ...base, userBodyweight: null })).toBeNull();
    expect(bodyweightWeightFill({ ...base, userBodyweight: 0 })).toBeNull();
  });

  // The input and the completion have to agree about "touched": if the user
  // cleared the weight on purpose, neither may put the bodyweight back.
  it("stays out of the way on completion once the user has edited the weight", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet({ equipmentType: "Bodyweight" }),
        kind: "strength",
        draft: { weight: "", reps: "12" },
        previousPerformance: null,
        userBodyweight: 82,
        weightTouched: true,
      })
    );

    expect(completedSet.weight).toBe(0);
    expect(updates.weight).toBeUndefined();
  });

  it("is the same rule completion falls back on when no history exists", () => {
    const { completedSet, updates } = acceptedStrength(
      completeSetFromDraft({
        set: strengthSet({ equipmentType: "Bodyweight" }),
        kind: "strength",
        draft: { weight: "", reps: "12" },
        previousPerformance: null,
        userBodyweight: 82,
      })
    );

    expect(completedSet.weight).toBe(82);
    expect(updates.weight).toBe("82");
  });
});
