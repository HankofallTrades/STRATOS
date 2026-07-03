import { describe, expect, it } from "vitest";

import type { Exercise } from "@/lib/types/workout";

import {
  filterCandidateExercises,
  selectRecoveryExercises,
} from "./workoutCandidates";

const exercise = (
  overrides: Partial<Exercise> & { id: string; name: string }
): Exercise => ({
  exercise_type: "strength",
  ...overrides,
});

describe("filterCandidateExercises", () => {
  const pool: Exercise[] = [
    exercise({ id: "squat", name: "Squat", compatible_equipment: ["Barbell", "Bodyweight"] }),
    exercise({ id: "legpress", name: "Leg Press", compatible_equipment: ["Machine"] }),
    exercise({ id: "mystery", name: "Mystery", compatible_equipment: [] }),
  ];

  it("keeps exercises whose equipment intersects availableEquipment", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("squat");
    expect(result.map((e) => e.id)).not.toContain("legpress");
  });

  it("treats empty compatible_equipment as unknown and keeps the exercise", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("mystery");
  });

  it("matches equipment case-insensitively", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("squat");
  });

  it("drops exercises whose primary muscles are avoided, keeps secondary involvement", () => {
    const primaryMap = { squat: ["Quadriceps", "Glutes"], legpress: ["Quadriceps", "Glutes"] };
    const result = filterCandidateExercises(pool, { avoidMuscles: ["Quadriceps"] }, primaryMap);
    expect(result.map((e) => e.id)).toEqual(["mystery"]);
  });

  it("keeps exercises with no primary-muscle data", () => {
    const result = filterCandidateExercises(pool, { avoidMuscles: ["Quadriceps"] }, {});
    expect(result).toHaveLength(3);
  });

  it("applies no filtering when constraints are empty", () => {
    expect(filterCandidateExercises(pool, {}, {})).toHaveLength(3);
  });
});

describe("selectRecoveryExercises", () => {
  const pool: Exercise[] = [
    exercise({ id: "plank", name: "Plank", exercise_category: "stability", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "pallof", name: "Pallof Press", exercise_category: "stability", compatible_equipment: ["Cable"] }),
    exercise({ id: "downdog", name: "Downward Dog", exercise_category: "mobility", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "pigeon", name: "Pigeon Pose", exercise_category: "mobility", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "squat", name: "Squat", exercise_category: "weights", compatible_equipment: ["Barbell"] }),
  ];

  it("returns only mobility/stability exercises", () => {
    const result = selectRecoveryExercises(pool, 3, {}, {});
    expect(
      result.every(
        (e) => e.exercise_category === "mobility" || e.exercise_category === "stability"
      )
    ).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("honors equipment constraints", () => {
    const result = selectRecoveryExercises(pool, 4, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).not.toContain("pallof");
  });

  it("honors avoidMuscles against primary muscles", () => {
    const result = selectRecoveryExercises(
      pool,
      4,
      { avoidMuscles: ["Hamstrings"] },
      { downdog: ["Hamstrings", "Calves"] }
    );
    expect(result.map((e) => e.id)).not.toContain("downdog");
  });

  it("returns fewer when the pool is smaller than count", () => {
    expect(selectRecoveryExercises(pool, 10, {}, {})).toHaveLength(4);
  });
});
