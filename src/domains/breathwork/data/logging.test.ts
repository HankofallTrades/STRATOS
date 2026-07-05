import { describe, expect, it } from "vitest";

import type { Exercise, WorkoutExercise } from "@/lib/types/workout";
import {
  applyBreathworkCompletion,
  buildBreathworkWorkoutExercise,
  findBreathworkExercise,
} from "./logging";

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

const breathworkExercise = (
  sets: WorkoutExercise["sets"]
): WorkoutExercise => ({
  id: "we-1",
  exerciseId: "ex-1",
  exercise: globalBox,
  sets,
});

describe("applyBreathworkCompletion", () => {
  it("fills the placeholder set added when the exercise enters the session", () => {
    const before = breathworkExercise([
      { id: "set-1", exerciseId: "ex-1", weight: 0, reps: null, time: { hours: 0, minutes: 0, seconds: 30 }, completed: false },
    ]);
    const after = applyBreathworkCompletion(before, 185);
    expect(after.sets).toHaveLength(1);
    expect(after.sets[0]).toMatchObject({
      id: "set-1",
      weight: 0,
      reps: null,
      completed: true,
      time: { hours: 0, minutes: 3, seconds: 5 },
    });
  });

  it("appends a new completed set when every set is already done", () => {
    const before = breathworkExercise([
      { id: "set-1", exerciseId: "ex-1", weight: 0, reps: null, time: { hours: 0, minutes: 3, seconds: 0 }, completed: true },
    ]);
    const after = applyBreathworkCompletion(before, 120);
    expect(after.sets).toHaveLength(2);
    expect(after.sets[0].id).toBe("set-1");
    expect(after.sets[1]).toMatchObject({
      exerciseId: "ex-1",
      completed: true,
      time: { hours: 0, minutes: 2, seconds: 0 },
    });
    expect(after.sets[1].id).not.toBe("set-1");
  });
});
