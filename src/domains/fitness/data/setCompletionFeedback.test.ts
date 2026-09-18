import { describe, expect, it } from "vitest";

import type { CardioSet, StrengthSet } from "@/lib/types/workout";
import { secondsToTime } from "@/lib/types/workout";
import { calculateOneRepMax } from "@/lib/utils/workoutUtils";

import { bestE1RMByExerciseId, classifySetCompletion } from "./setCompletionFeedback";

const strengthSet = (
  overrides: Partial<StrengthSet> & { id: string }
): StrengthSet => ({
  exerciseId: "ex-1",
  weight: 100,
  reps: 5,
  completed: true,
  ...overrides,
});

const priorBest = calculateOneRepMax(100, 5);

describe("classifySetCompletion", () => {
  it("is a PR when the set's e1RM beats the exercise's all-time best", () => {
    const set = strengthSet({ id: "s1", weight: 100, reps: 6 });

    expect(
      classifySetCompletion({ set, exerciseSets: [set], priorBestE1RM: priorBest })
    ).toBe("pr");
  });

  it("is an ordinary set when the e1RM only matches the best", () => {
    const set = strengthSet({ id: "s1", weight: 100, reps: 5 });

    expect(
      classifySetCompletion({ set, exerciseSets: [set], priorBestE1RM: priorBest })
    ).toBe("set");
  });

  // Mirrors the home model: a PR needs a previous max to beat, so a first-ever
  // exercise cannot ring the PR haptic on every set.
  it("is never a PR without history for the exercise", () => {
    const set = strengthSet({ id: "s1", weight: 200, reps: 10 });

    expect(
      classifySetCompletion({ set, exerciseSets: [set], priorBestE1RM: null })
    ).toBe("set");
  });

  it("must beat the session's earlier sets too, so one PR does not make every later set a PR", () => {
    const earlier = strengthSet({ id: "s1", weight: 110, reps: 5 });
    const later = strengthSet({ id: "s2", weight: 105, reps: 5 });

    expect(
      classifySetCompletion({
        set: later,
        exerciseSets: [earlier, later],
        priorBestE1RM: priorBest,
      })
    ).toBe("set");
  });

  it("ignores incomplete session sets when working out the bar to beat", () => {
    const pending = strengthSet({ id: "s1", weight: 150, reps: 5, completed: false });
    const set = strengthSet({ id: "s2", weight: 105, reps: 5 });

    expect(
      classifySetCompletion({
        set,
        exerciseSets: [pending, set],
        priorBestE1RM: priorBest,
      })
    ).toBe("pr");
  });

  // The bar comes from raw sets with the client's own formula, not the e1RM RPC:
  // the RPC uses Epley and the app uses Brzycki, and comparing across them
  // misses real PRs under 10 reps and invents them above.
  it("takes the baseline from the best completed set per exercise, on the same formula", () => {
    const row = (exerciseId: string, weight: number, reps: number) => ({
      exerciseId,
      exerciseName: exerciseId,
      weight,
      reps,
      workoutId: "w",
      workoutCreatedAt: "2026-01-01T00:00:00Z",
    });

    const best = bestE1RMByExerciseId([
      row("squat", 100, 5),
      row("squat", 90, 10),
      row("bench", 80, 3),
      { ...row("bench", 200, 1), weight: null },
    ]);

    expect(best.squat).toBe(Math.max(calculateOneRepMax(100, 5), calculateOneRepMax(90, 10)));
    expect(best.bench).toBe(calculateOneRepMax(80, 3));
    expect(best.deadlift).toBeUndefined();
  });

  it("treats bodyweight, timed and cardio sets as ordinary sets", () => {
    const bodyweight = strengthSet({ id: "s1", weight: 0, reps: 20 });
    const timed = strengthSet({
      id: "s2",
      weight: 20,
      reps: null,
      time: secondsToTime(30),
    });
    const cardio: CardioSet = {
      id: "s3",
      exerciseId: "ex-2",
      time: secondsToTime(1200),
      completed: true,
    };

    for (const set of [bodyweight, timed, cardio]) {
      expect(
        classifySetCompletion({ set, exerciseSets: [set], priorBestE1RM: 1 })
      ).toBe("set");
    }
  });
});
