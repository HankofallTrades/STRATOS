import { describe, expect, it } from "vitest";

import type { SetPlan, SetPlanEntry } from "./setPlan";
import {
  areLiveActivityStatesEqual,
  buildLiveActivityState,
} from "./liveActivityState";

const entry = (overrides: Partial<SetPlanEntry> & { position: number }): SetPlanEntry => ({
  setId: `set-${overrides.position}`,
  workoutExerciseId: "we-1",
  exerciseId: "ex-1",
  exerciseName: "Bench Press",
  kind: "strength",
  setNumber: overrides.position,
  suggestedWeight: 80,
  suggestedReps: 8,
  suggestedTimeSeconds: null,
  action: "none",
  completed: false,
  ...overrides,
});

const plan = (...entries: SetPlanEntry[]): SetPlan => entries;

describe("buildLiveActivityState", () => {
  it("points at the first set when nothing is logged yet", () => {
    const state = buildLiveActivityState(
      plan(
        entry({ position: 1 }),
        entry({ position: 2 }),
        entry({ position: 3, exerciseName: "Row" })
      )
    );

    expect(state).toEqual({
      exerciseName: "Bench Press",
      kind: "strength",
      setNumber: 1,
      position: 1,
      totalSets: 3,
      suggestedReps: 8,
      suggestedWeight: 80,
      suggestedTimeSeconds: null,
    });
  });

  it("advances to the first set that is still open, not the one after the last logged", () => {
    // Sets can be logged out of order, so "next" is the first gap rather than
    // one past the highest completed position.
    const state = buildLiveActivityState(
      plan(
        entry({ position: 1, completed: false }),
        entry({ position: 2, completed: true }),
        entry({ position: 3, completed: false })
      )
    );

    expect(state?.position).toBe(1);
  });

  it("carries the exercise and its set number, so the lock screen can say which set of which lift", () => {
    const state = buildLiveActivityState(
      plan(
        entry({ position: 1, completed: true }),
        entry({ position: 2, completed: true }),
        entry({
          position: 3,
          setNumber: 1,
          exerciseName: "Romanian Deadlift",
          workoutExerciseId: "we-2",
          suggestedWeight: 100,
          suggestedReps: 6,
        })
      )
    );

    expect(state).toMatchObject({
      exerciseName: "Romanian Deadlift",
      setNumber: 1,
      position: 3,
      totalSets: 3,
      suggestedWeight: 100,
      suggestedReps: 6,
    });
  });

  it("holds on the last set once every set is logged, rather than going blank mid-session", () => {
    // The activity ends when the workout is finished or discarded, not when the
    // planned sets run out — the user may still add an exercise.
    const state = buildLiveActivityState(
      plan(
        entry({ position: 1, completed: true }),
        entry({ position: 2, completed: true, exerciseName: "Row" })
      )
    );

    expect(state).toMatchObject({
      exerciseName: "Row",
      position: 2,
      totalSets: 2,
    });
  });

  it("has nothing to show for a session with no sets", () => {
    expect(buildLiveActivityState(plan())).toBeNull();
  });

  it("gives a timed set its duration target and no reps or weight", () => {
    const state = buildLiveActivityState(
      plan(
        entry({
          position: 1,
          kind: "time",
          exerciseName: "Plank",
          suggestedReps: null,
          suggestedWeight: null,
          suggestedTimeSeconds: 60,
        })
      )
    );

    expect(state).toMatchObject({
      kind: "time",
      suggestedReps: null,
      suggestedWeight: null,
      suggestedTimeSeconds: 60,
    });
  });
});

describe("areLiveActivityStatesEqual", () => {
  const base = buildLiveActivityState(plan(entry({ position: 1 }), entry({ position: 2 })));

  it("treats two reads of an unchanged session as the same", () => {
    const again = buildLiveActivityState(plan(entry({ position: 1 }), entry({ position: 2 })));

    expect(areLiveActivityStatesEqual(base, again)).toBe(true);
  });

  it("sees a logged set as a change worth pushing", () => {
    const advanced = buildLiveActivityState(
      plan(entry({ position: 1, completed: true }), entry({ position: 2 }))
    );

    expect(areLiveActivityStatesEqual(base, advanced)).toBe(false);
  });

  it("sees a moved suggestion as a change even when the set has not", () => {
    const reweighted = buildLiveActivityState(
      plan(entry({ position: 1, suggestedWeight: 82.5 }), entry({ position: 2 }))
    );

    expect(areLiveActivityStatesEqual(base, reweighted)).toBe(false);
  });

  it("treats two empty states as the same and an empty against a real one as different", () => {
    expect(areLiveActivityStatesEqual(null, null)).toBe(true);
    expect(areLiveActivityStatesEqual(null, base)).toBe(false);
  });
});
