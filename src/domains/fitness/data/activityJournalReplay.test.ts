import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StrengthSet, Workout, WorkoutExercise } from "@/lib/types/workout";
import type { AppDispatch, RootState } from "@/state/store";
import workoutReducer, { setCompleted, startWorkout } from "@/state/workout/workoutSlice";

import type { ActivityJournalEntry } from "./activityJournal";
import { reconcileActivityJournal, type ActivityJournalReplayResult } from "./activityJournalReplay";

// Keep the real bridge adapter in the path: mocking readActivityJournal would
// hide the bug where a rejected native call was turned into an empty journal.
const native = vi.hoisted(() => ({
  journal: vi.fn<() => Promise<{ entries: ActivityJournalEntry[] }>>(),
  clearJournal: vi.fn<() => Promise<void>>(),
  isNativePlatform: vi.fn(() => true),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: native.isNativePlatform },
  registerPlugin: () => native,
}));

const recoveredWorkout = (result: ActivityJournalReplayResult): Workout | null => {
  expect(result.status).toBe("reconciled");
  if (result.status !== "reconciled") throw new Error("Reconciliation failed");
  return result.workout;
};

// Exercise ordering and read failures through the real bridge. What an entry
// means is activityJournal.test.ts's business; one completion is enough here.

const squatSet = (id: string): StrengthSet => ({
  id,
  exerciseId: "ex-1",
  weight: 0,
  reps: 0,
  time: null,
  completed: false,
});

const squat = (): WorkoutExercise => ({
  id: "we-1",
  exerciseId: "ex-1",
  exercise: { id: "ex-1", name: "Squat" },
  sets: [squatSet("set-1"), squatSet("set-2")],
});

const completion: ActivityJournalEntry = {
  id: "journal-1",
  kind: "set-completed",
  setKind: "strength",
  setId: "set-1",
  workoutExerciseId: "we-1",
  at: "2026-09-21T10:00:00.000Z",
  target: { reps: 5, weight: 100, timeSeconds: null, distanceKm: null },
};

const completedSetIds = (workout: Workout | null): string[] =>
  (workout?.exercises ?? []).flatMap(exercise =>
    exercise.sets.filter(set => set.completed).map(set => set.id)
  );

/**
 * A store with a workout on screen, or none at all.
 *
 * Its dispatch is recorded, because the workout that comes out the far side
 * cannot tell one completion from two: the reducer is idempotent, so a set
 * logged twice looks exactly like a set logged once. Everything that listens
 * for the action — the rest timer, the haptic — does not have that luxury.
 */
const activeStore = (withWorkout = true) => {
  const store = configureStore({ reducer: { workout: workoutReducer } });
  if (withWorkout) {
    store.dispatch(startWorkout({ initialExercises: [squat()] }));
  }
  const dispatched: { type: string }[] = [];
  const dispatch = ((action: { type: string }) => {
    dispatched.push(action);
    return store.dispatch(action);
  }) as unknown as AppDispatch;

  return {
    deps: { dispatch, getState: store.getState as unknown as () => RootState },
    completionsDispatched: () =>
      dispatched.filter(action => action.type === setCompleted.type).length,
  };
};

/** A promise whose resolution this test controls. */
const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(settle => {
    resolve = settle;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
  native.isNativePlatform.mockReturnValue(true);
  native.journal.mockResolvedValue({ entries: [] });
  native.clearJournal.mockResolvedValue(undefined);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("reconcileActivityJournal — Finish snapshot", () => {
  it("hands back a workout that already holds the lock screen's last set", async () => {
    // The gesture the whole ticket is about: log the last set on the lock
    // screen, open the app, hit Finish. The snapshot is taken from what this
    // returns, so a set that is still only in the journal here is a set that
    // never reaches the database.
    native.journal.mockResolvedValue({ entries: [completion] });
    const { deps } = activeStore();

    const workout = await reconcileActivityJournal(deps);

    expect(completedSetIds(recoveredWorkout(workout))).toEqual(["set-1"]);
  });

  it("waits for a replay that is already in flight", async () => {
    // Foreground starts a replay; Finish is tapped one bridge round trip
    // later. Reading the store without waiting would snapshot the workout as
    // it was before the replay's dispatches landed.
    const read = deferred<{ entries: ActivityJournalEntry[] }>();
    native.journal.mockReturnValueOnce(read.promise);
    const { deps } = activeStore();

    const reconciling = reconcileActivityJournal(deps);
    const settling = reconcileActivityJournal(deps);
    read.resolve({ entries: [completion] });

    const workout = await settling;
    await reconciling;

    expect(completedSetIds(recoveredWorkout(workout))).toEqual(["set-1"]);
  });

  it("logs the set once when a replay and a finish overlap", async () => {
    // Both passes see the same entry if the clear has not landed yet. The set
    // must end up completed once — a second completion would restart the rest
    // timer and fire the haptic for a set the user logged minutes ago.
    native.journal.mockResolvedValue({ entries: [completion] });
    const { deps, completionsDispatched } = activeStore();

    const reconciling = reconcileActivityJournal(deps);
    const workout = await reconcileActivityJournal(deps);
    await reconciling;

    expect(completedSetIds(recoveredWorkout(workout))).toEqual(["set-1"]);
    expect(completionsDispatched()).toBe(1);
  });

  it("returns the workout untouched when the journal is empty", async () => {
    const { deps } = activeStore();

    const workout = await reconcileActivityJournal(deps);

    expect(completedSetIds(recoveredWorkout(workout))).toEqual([]);
    expect(native.clearJournal).not.toHaveBeenCalled();
  });
});

describe("reconcileActivityJournal", () => {
  it("clears only through the last entry it read", async () => {
    // A Done tap can land between the read and the clear. Naming the last
    // entry replayed is what keeps that tap for the next pass.
    native.journal.mockResolvedValue({ entries: [completion] });

    await reconcileActivityJournal(activeStore().deps);

    expect(native.clearJournal).toHaveBeenCalledWith({ throughId: "journal-1" });
  });

  it("leaves the journal alone when there is no workout to replay into", async () => {
    // A journal from a session that has not been reopened yet. Clearing it
    // here would throw away sets the user logged.
    native.journal.mockResolvedValue({ entries: [completion] });

    await reconcileActivityJournal(activeStore(false).deps);

    expect(native.clearJournal).not.toHaveBeenCalled();
  });

  it("does not replay a second time what the first pass already cleared", async () => {
    // Mount and a foreground event land together. Serialising them means the
    // second pass reads a journal the first one has already emptied, rather
    // than dispatching the same completion again.
    const journal = [completion];
    native.journal.mockImplementation(async () => ({ entries: journal }));
    native.clearJournal.mockImplementation(async () => {
      journal.length = 0;
    });
    const { deps } = activeStore();

    await Promise.all([
      reconcileActivityJournal(deps),
      reconcileActivityJournal(deps),
    ]);

    expect(native.journal).toHaveBeenCalledTimes(2);
    expect(native.clearJournal).toHaveBeenCalledTimes(1);
  });
});


describe("Activity Journal read failures", () => {
  it.each([new Error("journal unreadable"), { code: "UNIMPLEMENTED" }])(
    "refuses a Finish snapshot when native reading fails: %s",
    async error => {
      native.journal.mockRejectedValue(error);
      const { deps, completionsDispatched } = activeStore();
      const before = deps.getState();

      const result = await reconcileActivityJournal(deps);

      expect(result).toEqual({ status: "failed", error, failureStarted: true });
      expect(result).not.toHaveProperty("workout");
      expect(deps.getState()).toBe(before);
      expect(completionsDispatched()).toBe(0);
      expect(native.clearJournal).not.toHaveBeenCalled();
    }
  );

  it("does not treat a missing entries field as an empty journal", async () => {
    native.journal.mockResolvedValue({} as { entries: ActivityJournalEntry[] });
    expect(await reconcileActivityJournal(activeStore().deps)).toMatchObject({ status: "failed" });
    expect(native.clearJournal).not.toHaveBeenCalled();
  });

  it("recovers on the next queued pass after a failed foreground read", async () => {
    native.journal.mockRejectedValueOnce(new Error("read failed"));
    native.journal.mockResolvedValueOnce({ entries: [completion] });
    const { deps, completionsDispatched } = activeStore();

    const foreground = reconcileActivityJournal(deps);
    const finish = reconcileActivityJournal(deps);

    expect(await foreground).toMatchObject({ status: "failed" });
    expect(completedSetIds(recoveredWorkout(await finish))).toEqual(["set-1"]);
    expect(completionsDispatched()).toBe(1);
    expect(native.clearJournal).toHaveBeenCalledWith({ throughId: "journal-1" });
  });

  it("reports a foreground failure once until a successful read ends the episode", async () => {
    const { deps } = activeStore();
    native.journal.mockRejectedValue(new Error("read failed"));

    expect(await reconcileActivityJournal(deps)).toMatchObject({ failureStarted: true });
    expect(await reconcileActivityJournal(deps)).toMatchObject({ failureStarted: false });
    native.journal.mockResolvedValueOnce({ entries: [] });
    expect(await reconcileActivityJournal(deps)).toMatchObject({ status: "reconciled" });
    expect(await reconcileActivityJournal(deps)).toMatchObject({ failureStarted: true });
  });

  it("keeps failure episodes separate for different workouts", async () => {
    const { deps } = activeStore();
    native.journal.mockRejectedValue(new Error("read failed"));
    await reconcileActivityJournal(deps);
    deps.dispatch(startWorkout({ initialExercises: [squat()] }));

    expect(await reconcileActivityJournal(deps)).toMatchObject({ failureStarted: true });
  });

  it("needs no native journal on the web", async () => {
    native.isNativePlatform.mockReturnValue(false);
    const { deps } = activeStore();

    expect(completedSetIds(recoveredWorkout(await reconcileActivityJournal(deps)))).toEqual([]);
    expect(native.journal).not.toHaveBeenCalled();
  });
});
