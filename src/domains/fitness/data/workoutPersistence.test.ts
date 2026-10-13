import { describe, expect, it } from "vitest";
import type { Workout } from "@/lib/types/workout";
import { buildCompletedWorkoutForHistory } from "./workoutPersistence";

describe("completed workout persistence", () => {
  it("clears pair membership when only one member has logged sets", () => {
    const workout: Workout = {
      id: "workout", date: "2026-10-13", duration: 60, completed: true,
      exercises: [
        { id: "a", exerciseId: "bench", exercise: { id: "bench", name: "Bench" }, supersetId: "pair", sets: [{ id: "a1", exerciseId: "bench", weight: 60, reps: 8, completed: true }] },
        { id: "b", exerciseId: "row", exercise: { id: "row", name: "Row" }, supersetId: "pair", sets: [{ id: "b1", exerciseId: "row", weight: 40, reps: 8, completed: false }] },
      ],
    };
    const saved = buildCompletedWorkoutForHistory(workout);
    expect(saved.exercises.map(ex => [ex.id, ex.supersetId])).toEqual([["a", null]]);
    expect(workout.exercises[0].supersetId).toBe("pair");
  });

  it("retains paired instances when the same exercise also appears ungrouped", () => {
    const workout: Workout = {
      id: "workout", date: "2026-10-13", duration: 60, completed: true,
      exercises: [
        { id: "a", exerciseId: "bench", exercise: { id: "bench", name: "Bench" }, supersetId: "pair", sets: [{ id: "a1", exerciseId: "bench", weight: 60, reps: 8, completed: true }] },
        { id: "b", exerciseId: "row", exercise: { id: "row", name: "Row" }, supersetId: "pair", sets: [{ id: "b1", exerciseId: "row", weight: 40, reps: 8, completed: true }] },
        { id: "c", exerciseId: "bench", exercise: { id: "bench", name: "Bench" }, sets: [{ id: "c1", exerciseId: "bench", weight: 70, reps: 5, completed: true }] },
      ],
    };
    const saved = buildCompletedWorkoutForHistory(workout);
    expect(saved.exercises.map(ex => [ex.id, ex.supersetId ?? null, ex.sets.map(set => set.id)]))
      .toEqual([["a", "pair", ["a1"]], ["b", "pair", ["b1"]], ["c", null, ["c1"]]]);
  });
});
