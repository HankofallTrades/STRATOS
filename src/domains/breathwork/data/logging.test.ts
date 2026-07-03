import { describe, expect, it } from "vitest";

import type { Exercise } from "@/lib/types/workout";
import { buildBreathworkWorkoutExercise, findBreathworkExercise } from "./logging";

const globalBox: Exercise = {
  id: "ex-1",
  name: "Box Breathing",
  created_by_user_id: null,
};
const userBox: Exercise = {
  id: "ex-2",
  name: "Box Breathing",
  created_by_user_id: "user-1",
};

describe("findBreathworkExercise", () => {
  it("prefers the global catalog row over a user copy", () => {
    expect(findBreathworkExercise([userBox, globalBox], "Box Breathing")).toBe(globalBox);
  });

  it("returns null when the exercise is missing (migration not applied)", () => {
    expect(findBreathworkExercise([userBox], "Coherent Breathing")).toBeNull();
  });
});

describe("buildBreathworkWorkoutExercise", () => {
  it("wraps the elapsed time in one completed time-only set", () => {
    const entry = buildBreathworkWorkoutExercise(globalBox, 185);
    expect(entry.exerciseId).toBe("ex-1");
    expect(entry.exercise).toBe(globalBox);
    expect(entry.sets).toHaveLength(1);
    expect(entry.sets[0]).toMatchObject({
      exerciseId: "ex-1",
      weight: 0,
      reps: null,
      completed: true,
      time: { hours: 0, minutes: 3, seconds: 5 },
    });
    expect(entry.id).not.toBe(entry.sets[0].id);
  });
});
