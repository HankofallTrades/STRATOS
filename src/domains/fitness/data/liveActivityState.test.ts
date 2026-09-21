import { describe, expect, it } from "vitest";

import type { SetPlan, SetPlanEntry } from "./setPlan";
import {
  areLiveActivityPlansEqual,
  buildLiveActivityPlan,
  currentLiveActivitySet,
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
  targetWeight: 80,
  targetReps: 8,
  targetTimeSeconds: null,
  targetDistanceKm: null,
  action: "none",
  completed: false,
  ...overrides,
});

const plan = (...entries: SetPlanEntry[]): SetPlan => entries;

describe("buildLiveActivityPlan", () => {
  it("hands over every set of the session, not just the current one", () => {
    // The lock screen has to advance with the webview suspended, so it cannot
    // be given one set and asked to come back for the next.
    const built = buildLiveActivityPlan(
      plan(entry({ position: 1 }), entry({ position: 2 }), entry({ position: 3 }))
    );

    expect(built.map(set => set.position)).toEqual([1, 2, 3]);
  });

  it("carries what a set would log, not the recommendation it came from", () => {
    const [set] = buildLiveActivityPlan(
      plan(
        entry({
          position: 1,
          exerciseName: "Romanian Deadlift",
          suggestedWeight: null,
          suggestedReps: null,
          targetWeight: 100,
          targetReps: 6,
        })
      )
    );

    expect(set).toEqual({
      setId: "set-1",
      workoutExerciseId: "we-1",
      exerciseName: "Romanian Deadlift",
      kind: "strength",
      setNumber: 1,
      position: 1,
      targetReps: 6,
      targetWeight: 100,
      targetTimeSeconds: null,
      targetDistanceKm: null,
      completed: false,
      loggable: true,
    });
  });

  it("gives a timed set its duration target and no reps", () => {
    const [set] = buildLiveActivityPlan(
      plan(
        entry({
          position: 1,
          kind: "time",
          exerciseName: "Plank",
          targetReps: null,
          targetWeight: 0,
          targetTimeSeconds: 60,
        })
      )
    );

    expect(set).toMatchObject({ kind: "time", targetReps: null, targetTimeSeconds: 60 });
  });
});

// The lock screen cannot show a refusal or ask for a missing number, so a set
// the replay would throw away must not offer a button at all. These mirror the
// refusal rules in setCompletion.ts.
describe("buildLiveActivityPlan — what can be logged", () => {
  const loggable = (overrides: Partial<SetPlanEntry>) =>
    buildLiveActivityPlan(plan(entry({ position: 1, ...overrides })))[0].loggable;

  it("offers a strength set with reps behind it", () => {
    expect(loggable({ targetReps: 8 })).toBe(true);
  });

  it("refuses a strength set with no reps, so a fresh unprogrammed set has no button", () => {
    expect(loggable({ targetReps: null })).toBe(false);
    expect(loggable({ targetReps: 0 })).toBe(false);
  });

  it("offers a strength set with reps but no weight — an unloaded set is a real set", () => {
    expect(loggable({ targetReps: 8, targetWeight: null })).toBe(true);
  });

  it("turns on the hold for a timed set, not on its reps", () => {
    expect(loggable({ kind: "time", targetReps: null, targetTimeSeconds: 45 })).toBe(true);
    expect(loggable({ kind: "time", targetReps: 8, targetTimeSeconds: null })).toBe(false);
    expect(loggable({ kind: "time", targetReps: null, targetTimeSeconds: 0 })).toBe(false);
  });

  it("turns on the duration for a cardio set", () => {
    expect(loggable({ kind: "cardio", targetReps: null, targetTimeSeconds: 600 })).toBe(true);
    expect(loggable({ kind: "cardio", targetReps: null, targetTimeSeconds: null })).toBe(false);
  });
});

describe("currentLiveActivitySet", () => {
  const current = (setPlan: SetPlan) => currentLiveActivitySet(buildLiveActivityPlan(setPlan));

  it("points at the first set when nothing is logged yet", () => {
    expect(current(plan(entry({ position: 1 }), entry({ position: 2 })))?.position).toBe(1);
  });

  it("advances to the first set that is still open, not the one after the last logged", () => {
    // Sets can be logged out of order, so "next" is the first gap rather than
    // one past the highest completed position.
    const set = current(
      plan(
        entry({ position: 1, completed: false }),
        entry({ position: 2, completed: true }),
        entry({ position: 3, completed: false })
      )
    );

    expect(set?.position).toBe(1);
  });

  it("carries the exercise and its set number, so the lock screen can say which set of which lift", () => {
    const set = current(
      plan(
        entry({ position: 1, completed: true }),
        entry({ position: 2, completed: true }),
        entry({
          position: 3,
          setNumber: 1,
          exerciseName: "Romanian Deadlift",
          workoutExerciseId: "we-2",
          targetWeight: 100,
          targetReps: 6,
        })
      )
    );

    expect(set).toMatchObject({
      exerciseName: "Romanian Deadlift",
      setNumber: 1,
      position: 3,
      targetWeight: 100,
      targetReps: 6,
    });
  });

  it("holds on the last set once every set is logged, rather than going blank mid-session", () => {
    // The activity ends when the workout is finished or discarded, not when the
    // planned sets run out — the user may still add an exercise.
    const set = current(
      plan(
        entry({ position: 1, completed: true }),
        entry({ position: 2, completed: true, exerciseName: "Row" })
      )
    );

    expect(set).toMatchObject({ exerciseName: "Row", position: 2 });
  });

  it("has nothing to show for a session with no sets", () => {
    expect(current(plan())).toBeNull();
  });
});

describe("areLiveActivityPlansEqual", () => {
  const base = buildLiveActivityPlan(plan(entry({ position: 1 }), entry({ position: 2 })));

  it("treats two reads of an unchanged session as the same", () => {
    const again = buildLiveActivityPlan(plan(entry({ position: 1 }), entry({ position: 2 })));

    expect(areLiveActivityPlansEqual(base, again)).toBe(true);
  });

  it("sees a logged set as a change worth pushing", () => {
    const advanced = buildLiveActivityPlan(
      plan(entry({ position: 1, completed: true }), entry({ position: 2 }))
    );

    expect(areLiveActivityPlansEqual(base, advanced)).toBe(false);
  });

  it("sees a moved target as a change even when the set has not", () => {
    const reweighted = buildLiveActivityPlan(
      plan(entry({ position: 1, targetWeight: 82.5 }), entry({ position: 2 }))
    );

    expect(areLiveActivityPlansEqual(base, reweighted)).toBe(false);
  });

  // A set added mid-session moves "of 12" on the lock screen even when the set
  // it is showing has not changed at all.
  it("sees an added set as a change", () => {
    const grown = buildLiveActivityPlan(
      plan(entry({ position: 1 }), entry({ position: 2 }), entry({ position: 3 }))
    );

    expect(areLiveActivityPlansEqual(base, grown)).toBe(false);
  });

  it("treats two empty plans as the same and an empty against a real one as different", () => {
    expect(areLiveActivityPlansEqual(null, null)).toBe(true);
    expect(areLiveActivityPlansEqual(null, base)).toBe(false);
  });
});
