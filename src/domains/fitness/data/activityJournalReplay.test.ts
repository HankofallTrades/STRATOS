import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StrengthSet, Workout, WorkoutExercise } from "@/lib/types/workout";
import type { AppDispatch, RootState } from "@/state/store";
import workoutReducer, { setCompleted, startWorkout } from "@/state/workout/workoutSlice";

vi.mock("@/lib/native/liveActivity", () => ({
  readActivityJournal: vi.fn(async () => []),
  clearActivityJournal: vi.fn(async () => {}),
}));

import { clearActivityJournal, readActivityJournal } from "@/lib/native/liveActivity";

import type { ActivityJournalEntry } from "./activityJournal";
import {
  reconcileActivityJournal,
  reconciledWorkoutForFinish,
} from "./activityJournalReplay";

// Replay is async and Finish is tappable the whole time it runs. These tests
// are about that ordering and nothing else: what a journal *means* is
// activityJournal.test.ts's business, so there is one entry here and it is
// always a plain completion.

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
  vi.clearAllMocks();
  vi.mocked(readActivityJournal).mockResolvedValue([]);
  vi.mocked(clearActivityJournal).mockResolvedValue(undefined);
});

describe("reconciledWorkoutForFinish", () => {
  it("hands back a workout that already holds the lock screen's last set", async () => {
    // The gesture the whole ticket is about: log the last set on the lock
    // screen, open the app, hit Finish. The snapshot is taken from what this
    // returns, so a set that is still only in the journal here is a set that
    // never reaches the database.
    vi.mocked(readActivityJournal).mockResolvedValue([completion]);
    const { deps } = activeStore();

    const workout = await reconciledWorkoutForFinish(deps);

    expect(completedSetIds(workout)).toEqual(["set-1"]);
  });

  it("waits for a replay that is already in flight", async () => {
    // Foreground starts a replay; Finish is tapped one bridge round trip
    // later. Reading the store without waiting would snapshot the workout as
    // it was before the replay's dispatches landed.
    const read = deferred<ActivityJournalEntry[]>();
    vi.mocked(readActivityJournal).mockReturnValueOnce(read.promise);
    const { deps } = activeStore();

    const reconciling = reconcileActivityJournal(deps);
    const settling = reconciledWorkoutForFinish(deps);
    read.resolve([completion]);

    const workout = await settling;
    await reconciling;

    expect(completedSetIds(workout)).toEqual(["set-1"]);
  });

  it("logs the set once when a replay and a finish overlap", async () => {
    // Both passes see the same entry if the clear has not landed yet. The set
    // must end up completed once — a second completion would restart the rest
    // timer and fire the haptic for a set the user logged minutes ago.
    vi.mocked(readActivityJournal).mockResolvedValue([completion]);
    const { deps, completionsDispatched } = activeStore();

    const reconciling = reconcileActivityJournal(deps);
    const workout = await reconciledWorkoutForFinish(deps);
    await reconciling;

    expect(completedSetIds(workout)).toEqual(["set-1"]);
    expect(completionsDispatched()).toBe(1);
  });

  it("returns the workout untouched when the journal is empty", async () => {
    const { deps } = activeStore();

    const workout = await reconciledWorkoutForFinish(deps);

    expect(completedSetIds(workout)).toEqual([]);
    expect(clearActivityJournal).not.toHaveBeenCalled();
  });
});

describe("reconcileActivityJournal", () => {
  it("clears only through the last entry it read", async () => {
    // A Done tap can land between the read and the clear. Naming the last
    // entry replayed is what keeps that tap for the next pass.
    vi.mocked(readActivityJournal).mockResolvedValue([completion]);

    await reconcileActivityJournal(activeStore().deps);

    expect(clearActivityJournal).toHaveBeenCalledWith("journal-1");
  });

  it("leaves the journal alone when there is no workout to replay into", async () => {
    // A journal from a session that has not been reopened yet. Clearing it
    // here would throw away sets the user logged.
    vi.mocked(readActivityJournal).mockResolvedValue([completion]);

    await reconcileActivityJournal(activeStore(false).deps);

    expect(clearActivityJournal).not.toHaveBeenCalled();
  });

  it("does not replay a second time what the first pass already cleared", async () => {
    // Mount and a foreground event land together. Serialising them means the
    // second pass reads a journal the first one has already emptied, rather
    // than dispatching the same completion again.
    const journal = [completion];
    vi.mocked(readActivityJournal).mockImplementation(async () => journal);
    vi.mocked(clearActivityJournal).mockImplementation(async () => {
      journal.length = 0;
    });
    const { deps } = activeStore();

    await Promise.all([
      reconcileActivityJournal(deps),
      reconcileActivityJournal(deps),
    ]);

    expect(readActivityJournal).toHaveBeenCalledTimes(2);
    expect(clearActivityJournal).toHaveBeenCalledTimes(1);
  });
});
