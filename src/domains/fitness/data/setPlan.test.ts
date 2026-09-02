import { describe, expect, it } from "vitest";

import type { Exercise, ExerciseSet, WorkoutExercise } from "@/lib/types/workout";
import { secondsToTime } from "@/lib/types/workout";

import { buildRecommendedStrengthSetPerformances } from "./recommendations";
import type { HistoricalStrengthSetPerformance } from "./recommendations";
import {
  areSetPlanRecommendationsEqual,
  buildSetPlan,
  getExerciseSetPlanRecommendations,
} from "./setPlan";

const exercise = (overrides: Partial<Exercise> & { id: string; name: string }): Exercise => ({
  exercise_type: "strength",
  ...overrides,
});

const strengthSet = (id: string, exerciseId: string): ExerciseSet => ({
  id,
  exerciseId,
  weight: 0,
  reps: 0,
  time: null,
  completed: false,
});

const timedSet = (id: string, exerciseId: string, seconds: number): ExerciseSet => ({
  id,
  exerciseId,
  weight: 0,
  reps: null,
  time: secondsToTime(seconds),
  completed: false,
});

const workoutExercise = (
  id: string,
  ex: Exercise,
  sets: ExerciseSet[]
): WorkoutExercise => ({
  id,
  exerciseId: ex.id,
  exercise: ex,
  sets,
});

const history = (
  set_number: number,
  weight: number,
  reps: number | null
): HistoricalStrengthSetPerformance => ({
  set_number,
  weight,
  reps,
  time_seconds: null,
});

describe("buildSetPlan", () => {
  it("returns no entries for an empty workout", () => {
    // A session with nothing in it must not hand the lock screen a phantom set.
    expect(
      buildSetPlan({
        exercises: [],
        sessionFocus: "hypertrophy",
        historyByWorkoutExerciseId: {},
      })
    ).toEqual([]);
  });

  it("numbers every set across the whole session, not per exercise", () => {
    // The session-wide position is the reason this plan exists: the native layer
    // has to answer "set 3 of 4" without being able to walk the workout state.
    const bench = exercise({ id: "bench", name: "Bench Press" });
    const row = exercise({ id: "row", name: "Barbell Row" });

    const setPlan = buildSetPlan({
      exercises: [
        workoutExercise("we-bench", bench, [
          strengthSet("s1", "bench"),
          strengthSet("s2", "bench"),
        ]),
        workoutExercise("we-row", row, [
          strengthSet("s3", "row"),
          strengthSet("s4", "row"),
        ]),
      ],
      sessionFocus: "hypertrophy",
      historyByWorkoutExerciseId: {
        "we-bench": [history(1, 100, 16)],
        "we-row": [history(1, 60, 10)],
      },
    });

    expect(setPlan.map(entry => entry.position)).toEqual([1, 2, 3, 4]);
    // Set numbers restart per exercise, because that is what progression uses.
    expect(setPlan.map(entry => entry.setNumber)).toEqual([1, 2, 1, 2]);
    expect(setPlan.map(entry => entry.exerciseName)).toEqual([
      "Bench Press",
      "Bench Press",
      "Barbell Row",
      "Barbell Row",
    ]);
  });

  it("carries the same suggestion the recommendation logic produces", () => {
    // The plan must not become a second, drifting copy of the progression rules.
    const bench = exercise({ id: "bench", name: "Bench Press" });
    const historicalSets = [history(1, 100, 16)];

    const setPlan = buildSetPlan({
      exercises: [
        workoutExercise("we-bench", bench, [
          strengthSet("s1", "bench"),
          strengthSet("s2", "bench"),
        ]),
      ],
      sessionFocus: "hypertrophy",
      historyByWorkoutExerciseId: { "we-bench": historicalSets },
    });

    const expected = buildRecommendedStrengthSetPerformances({
      focus: "hypertrophy",
      currentSetCount: 2,
      historicalSets,
    });

    expect(setPlan[0].suggestedWeight).toBe(expected[1]?.weight);
    expect(setPlan[0].suggestedReps).toBe(expected[1]?.reps);
    expect(setPlan[0].action).toBe(expected[1]?.action);
    expect(setPlan[1].suggestedWeight).toBe(expected[2]?.weight);
  });

  it("suggests nothing for an exercise with no history", () => {
    // A first-time lift has nothing to progress from, so the lock screen should
    // show the exercise with a blank target rather than an invented one.
    const squat = exercise({ id: "squat", name: "Back Squat" });

    const setPlan = buildSetPlan({
      exercises: [workoutExercise("we-squat", squat, [strengthSet("s1", "squat")])],
      sessionFocus: "strength",
      historyByWorkoutExerciseId: {},
    });

    expect(setPlan).toHaveLength(1);
    expect(setPlan[0].kind).toBe("strength");
    expect(setPlan[0].suggestedWeight).toBeNull();
    expect(setPlan[0].suggestedReps).toBeNull();
    expect(setPlan[0].action).toBe("none");
  });

  it("plans a time-only exercise as a duration, never as reps and weight", () => {
    // A plank has no rep target. Handing one to the lock screen would render a
    // set the user cannot perform as described.
    const plank = exercise({ id: "plank", name: "Plank", is_static: true });

    const setPlan = buildSetPlan({
      exercises: [workoutExercise("we-plank", plank, [timedSet("s1", "plank", 45)])],
      sessionFocus: "hypertrophy",
      historyByWorkoutExerciseId: { "we-plank": [history(1, 0, null)] },
    });

    expect(setPlan[0].kind).toBe("time");
    expect(setPlan[0].suggestedTimeSeconds).toBe(45);
    expect(setPlan[0].suggestedReps).toBeNull();
    expect(setPlan[0].suggestedWeight).toBeNull();
  });

  it("plans breathwork as a duration too", () => {
    // Breathwork is timed but is not flagged static, so category has to be part
    // of the test for what a suggestion can mean.
    const breathing = exercise({
      id: "box",
      name: "Box Breathing",
      exercise_category: "breathwork",
    });

    const setPlan = buildSetPlan({
      exercises: [workoutExercise("we-box", breathing, [timedSet("s1", "box", 300)])],
      sessionFocus: "recovery",
      historyByWorkoutExerciseId: {},
    });

    expect(setPlan[0].kind).toBe("time");
    expect(setPlan[0].suggestedTimeSeconds).toBe(300);
    expect(setPlan[0].suggestedReps).toBeNull();
  });

  it("plans cardio as a duration too", () => {
    const run = exercise({ id: "run", name: "Treadmill", exercise_type: "cardio" });

    const setPlan = buildSetPlan({
      exercises: [
        workoutExercise("we-run", run, [
          { id: "s1", exerciseId: "run", time: secondsToTime(600), completed: false },
        ]),
      ],
      sessionFocus: "zone2",
      historyByWorkoutExerciseId: {},
    });

    expect(setPlan[0].kind).toBe("cardio");
    expect(setPlan[0].suggestedTimeSeconds).toBe(600);
    expect(setPlan[0].suggestedWeight).toBeNull();
  });
});

describe("getExerciseSetPlanRecommendations", () => {
  it("reproduces exactly what the workout screen computed per row", () => {
    // This is the guarantee that makes the prefactor invisible to the user: the
    // screen reads its suggestions back out of the plan and sees no change.
    const bench = exercise({ id: "bench", name: "Bench Press" });
    const plank = exercise({ id: "plank", name: "Plank", is_static: true });
    const historicalSets = [history(1, 100, 9), history(2, 100, 8)];

    const setPlan = buildSetPlan({
      exercises: [
        workoutExercise("we-bench", bench, [
          strengthSet("s1", "bench"),
          strengthSet("s2", "bench"),
        ]),
        workoutExercise("we-plank", plank, [timedSet("s3", "plank", 45)]),
      ],
      sessionFocus: "hypertrophy",
      historyByWorkoutExerciseId: { "we-bench": historicalSets },
    });

    expect(getExerciseSetPlanRecommendations(setPlan, "we-bench")).toEqual(
      buildRecommendedStrengthSetPerformances({
        focus: "hypertrophy",
        currentSetCount: 2,
        historicalSets,
      })
    );

    // Timed exercises got an empty record before this change, and still do.
    expect(getExerciseSetPlanRecommendations(setPlan, "we-plank")).toEqual({});
  });

  it("returns an empty record when there is no history to progress from", () => {
    const squat = exercise({ id: "squat", name: "Back Squat" });

    const setPlan = buildSetPlan({
      exercises: [workoutExercise("we-squat", squat, [strengthSet("s1", "squat")])],
      sessionFocus: "strength",
      historyByWorkoutExerciseId: {},
    });

    expect(getExerciseSetPlanRecommendations(setPlan, "we-squat")).toEqual({});
  });
});

describe("areSetPlanRecommendationsEqual", () => {
  const suggestion = { weight: 100, reps: 10, time_seconds: null, action: "increase_reps" as const };

  it("treats identical suggestions as unchanged", () => {
    // This is what stops a set edit from re-rendering every row in the session.
    expect(areSetPlanRecommendationsEqual({ 1: suggestion }, { 1: { ...suggestion } })).toBe(true);
  });

  it("notices a changed weight, so a moved suggestion still reaches the screen", () => {
    expect(
      areSetPlanRecommendationsEqual({ 1: suggestion }, { 1: { ...suggestion, weight: 105 } })
    ).toBe(false);
  });

  it("notices a set appearing or disappearing", () => {
    expect(areSetPlanRecommendationsEqual({ 1: suggestion }, {})).toBe(false);
    expect(
      areSetPlanRecommendationsEqual({ 1: suggestion }, { 1: suggestion, 2: suggestion })
    ).toBe(false);
  });

  it("distinguishes a missing suggestion from a null one", () => {
    expect(areSetPlanRecommendationsEqual({ 1: null }, { 2: null })).toBe(false);
  });
});
