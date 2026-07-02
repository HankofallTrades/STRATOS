import { beforeEach, describe, expect, it, vi } from "vitest";

import { commitFinalizedWorkout } from "@/domains/fitness/data/workoutCommit";
import type { FinalizedWorkoutSnapshot } from "@/domains/fitness/data/workoutPersistence";
import type { Workout } from "@/lib/types/workout";
import type { AppDispatch } from "@/state/store";

vi.mock("@/domains/fitness/data/fitnessRepository", () => ({
  saveWorkoutToDb: vi.fn(),
}));

vi.mock("@/domains/fitness/data/offlineQueue", () => ({
  enqueueWorkout: vi.fn(),
  getQueuedWorkouts: vi.fn(() => []),
  removeQueuedWorkout: vi.fn(),
}));

import { saveWorkoutToDb } from "@/domains/fitness/data/fitnessRepository";
import {
  enqueueWorkout,
  getQueuedWorkouts,
  removeQueuedWorkout,
} from "@/domains/fitness/data/offlineQueue";

const dispatch = vi.fn() as unknown as AppDispatch;

// One exercise with one completed set so buildCompletedWorkoutForHistory keeps it.
const workout = {
  id: "local-1",
  exercises: [
    {
      id: "we-1",
      exerciseId: "ex-1",
      sets: [{ id: "set-1", completed: true, exerciseId: "ex-1" }],
    },
  ],
} as unknown as Workout;

const snapshot: FinalizedWorkoutSnapshot = {
  workout,
  durationInSeconds: 1800,
  workoutType: "strength",
};

const deps = { userId: "user-1", dispatch };

const dispatchedHistoryWorkout = () =>
  (vi.mocked(dispatch).mock.calls[0]?.[0] as { payload: Workout }).payload;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getQueuedWorkouts).mockReturnValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Node's global navigator has no onLine, which isLikelyNetworkError reads
  // as offline; mirror a browser that is online so message-based
  // classification is what's under test.
  vi.stubGlobal("navigator", { onLine: true });
});

describe("commitFinalizedWorkout", () => {
  it("saved: history gets the SERVER id, and any queued copy is removed", async () => {
    vi.mocked(saveWorkoutToDb).mockResolvedValue({ workoutId: "server-9" });

    const outcome = await commitFinalizedWorkout(snapshot, deps);

    expect(outcome).toEqual({ status: "saved", workoutId: "server-9" });
    // The id swap is the contract: history must reference the persisted row,
    // not the local draft id, or later reads point at nothing.
    expect(dispatchedHistoryWorkout().id).toBe("server-9");
    expect(removeQueuedWorkout).toHaveBeenCalledWith("local-1");
  });

  it("network failure on a fresh save: queues it and settles history with the local id", async () => {
    vi.mocked(saveWorkoutToDb).mockRejectedValue(new Error("Failed to fetch"));

    const outcome = await commitFinalizedWorkout(snapshot, deps);

    expect(outcome).toEqual({ status: "queued" });
    expect(enqueueWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "local-1",
        userId: "user-1",
        durationInSeconds: 1800,
        workoutType: "strength",
      })
    );
    // Offline saves still show up in history immediately, under the local id.
    expect(dispatchedHistoryWorkout().id).toBe("local-1");
  });

  it("network failure on an already-queued entry (replay): touches nothing", async () => {
    vi.mocked(saveWorkoutToDb).mockRejectedValue(new Error("Failed to fetch"));
    vi.mocked(getQueuedWorkouts).mockReturnValue([
      { id: "local-1" } as never,
    ]);

    const outcome = await commitFinalizedWorkout(snapshot, deps);

    // Re-queueing would reset queue order; re-dispatching would duplicate the
    // history entry settled when it was first queued.
    expect(outcome).toEqual({ status: "queued" });
    expect(enqueueWorkout).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("non-network failure: reports it and leaves queue and history untouched", async () => {
    const error = new Error("row violates row-level security policy");
    vi.mocked(saveWorkoutToDb).mockRejectedValue(error);

    const outcome = await commitFinalizedWorkout(snapshot, deps);

    expect(outcome).toEqual({ status: "failed", error });
    expect(enqueueWorkout).not.toHaveBeenCalled();
    expect(removeQueuedWorkout).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
