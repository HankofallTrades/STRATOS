import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkoutExercise } from "@/lib/types/workout";
import type { ActivityJournalEntry } from "../data/activityJournal";
import workoutReducer, { startWorkout } from "@/state/workout/workoutSlice";
import { useWorkoutPersistence } from "./useWorkout";

const adapters = vi.hoisted(() => ({
    journal: vi.fn<() => Promise<{ entries: ActivityJournalEntry[] }>>(),
    clearJournal: vi.fn(async () => {}),
    commit: vi.fn(async () => ({ status: "saved" })),
    toast: vi.fn(),
    navigate: vi.fn(),
    getStore: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => true },
    registerPlugin: () => adapters,
}));
vi.mock("react-redux", () => ({ useStore: () => adapters.getStore() }));
vi.mock("@/hooks/redux", () => ({
    useAppDispatch: () => adapters.getStore().dispatch,
    useAppSelector: (selector: (state: unknown) => unknown) => selector(adapters.getStore().getState()),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: adapters.toast }));
vi.mock("react-router-dom", () => ({ useNavigate: () => adapters.navigate }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("@/state/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("../data/workoutCommit", () => ({ commitFinalizedWorkout: adapters.commit }));
vi.mock("../data/queryInvalidation", () => ({ invalidateWorkoutDependentQueries: vi.fn() }));

const exercise = (completed: boolean): WorkoutExercise => ({
    id: "we-1",
    exerciseId: "ex-1",
    exercise: { id: "ex-1", name: "Squat" },
    sets: [{ id: "set-1", exerciseId: "ex-1", weight: 40, reps: 8, time: null, completed }],
});

const activeStore = (completed: boolean) => {
    const store = configureStore({ reducer: { workout: workoutReducer } });
    store.dispatch(startWorkout({ initialExercises: [exercise(completed)] }));
    adapters.getStore.mockReturnValue(store);
    return store;
};

beforeEach(() => {
    vi.clearAllMocks();
    adapters.journal.mockResolvedValue({ entries: [] });
    vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("Finish after Activity Journal reading", () => {
    it.each([false, true])("keeps the workout open on read failure (visible completed set: %s)", async completed => {
        const store = activeStore(completed);
        const before = store.getState();
        adapters.journal.mockRejectedValue(new Error("journal unreadable"));

        const result = await useWorkoutPersistence().saveWorkout();

        // This must neither commit the visible sets nor offer to discard an
        // apparently empty workout whose only logged set may still be native.
        expect(result).toEqual({ success: false, reason: "journal_read_failed" });
        expect(store.getState()).toBe(before);
        expect(adapters.commit).not.toHaveBeenCalled();
        expect(adapters.clearJournal).not.toHaveBeenCalled();
        expect(adapters.navigate).not.toHaveBeenCalled();
        expect(adapters.toast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Couldn't recover lock-screen sets",
        }));
    });

    it("saves the recovered last set when Finish is tried again", async () => {
        const store = activeStore(false);
        const { saveWorkout } = useWorkoutPersistence();
        adapters.journal.mockRejectedValueOnce(new Error("read failed"));
        await saveWorkout();
        adapters.journal.mockResolvedValueOnce({ entries: [{
            id: "journal-1", kind: "set-completed", setKind: "strength",
            setId: "set-1", workoutExerciseId: "we-1", at: "2026-10-19T10:00:00Z",
            target: { reps: 9, weight: 42, timeSeconds: null, distanceKm: null },
        }] });

        expect(await saveWorkout()).toEqual({ success: true });
        expect(adapters.commit).toHaveBeenCalledTimes(1);
        expect(adapters.commit).toHaveBeenCalledWith(expect.objectContaining({
            workout: expect.objectContaining({ exercises: [expect.objectContaining({
                sets: [expect.objectContaining({ reps: 9, weight: 42, completed: true })],
            })] }),
        }), expect.anything());
        expect(store.getState().workout.currentWorkout).toBeNull();
    });

    it("still identifies an empty workout after a successful empty read", async () => {
        activeStore(false);
        expect(await useWorkoutPersistence().saveWorkout()).toEqual({ success: false, reason: "no_completed_sets" });
        expect(adapters.commit).not.toHaveBeenCalled();
    });
});
