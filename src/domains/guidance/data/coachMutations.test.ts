import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canRevertCoachChange,
  coachMutationPayloadSchemas,
  coachMutationRegistry,
  revertCoachChange,
  type CoachMutationDeps,
} from "@/domains/guidance/data/coachMutations";
import type { CoachChangeLogEntry } from "@/domains/guidance/data/changeLogRepository";
import type { Workout } from "@/lib/types/workout";
import type { AppDispatch } from "@/state/store";

vi.mock("@/domains/periodization/data/repository", () => ({
  saveDraftedProgram: vi.fn(),
  applyProgramEdits: vi.fn(),
  revertProgramCreation: vi.fn(),
  revertProgramEdits: vi.fn(),
}));

import {
  applyProgramEdits,
  revertProgramCreation,
  revertProgramEdits,
  saveDraftedProgram,
} from "@/domains/periodization/data/repository";

const dispatch = vi.fn() as unknown as AppDispatch;

const makeDeps = (overrides: Partial<CoachMutationDeps> = {}): CoachMutationDeps => ({
  userId: "user-1",
  dispatch,
  currentWorkout: null,
  ...overrides,
});

const activeWorkout = { id: "workout-1", exercises: [] } as unknown as Workout;

const snapshotRow = {
  id: "row-1",
  mesocycle_session_id: "session-1",
  exercise_id: "exercise-1",
  exercise_order: 0,
  target_sets: 3,
  target_reps: "8-12",
  load_increment_kg: 2.5,
  notes: null,
};

const makeEntry = (
  overrides: Partial<CoachChangeLogEntry>
): CoachChangeLogEntry =>
  ({
    id: "entry-1",
    user_id: "user-1",
    summary: "test change",
    created_at: "2026-07-01T00:00:00Z",
    reverted_at: null,
    change_type: "program_created",
    payload: {},
    ...overrides,
  }) as CoachChangeLogEntry;

beforeEach(() => {
  vi.clearAllMocks();
});

// The registry's core invariant: the payload `apply` records is readable by
// `revert` through the same schema. If apply's write shape and revert's read
// shape drift, these round-trips fail before any user hits it.
describe("apply → payload → revert round-trip", () => {
  it("program_created: records exactly what revertProgramCreation needs", async () => {
    vi.mocked(saveDraftedProgram).mockResolvedValue({
      mesocycle: { id: "meso-2", name: "Hypertrophy Block" },
      previousActiveMesocycleId: "meso-1",
    } as never);

    const outcome = await coachMutationRegistry.program_created.apply(
      { draftedProgram: { name: "Hypertrophy Block" } },
      makeDeps()
    );

    // What apply wrote parses through the mutation's own schema…
    const parsed = coachMutationPayloadSchemas.program_created.parse(
      outcome.payload
    );
    // …and revert forwards it to the inverse repo op, restoring the
    // previously-active program.
    await coachMutationRegistry.program_created.revert(parsed, makeDeps());
    expect(revertProgramCreation).toHaveBeenCalledWith("user-1", {
      mesocycleId: "meso-2",
      previousActiveMesocycleId: "meso-1",
    });
    expect(outcome.summary).toContain("Hypertrophy Block");
  });

  it("program_edited: revert replays the snapshot apply captured, not the ops", async () => {
    vi.mocked(applyProgramEdits).mockResolvedValue({
      snapshot: [snapshotRow],
      protocolBefore: "custom",
    } as never);

    const outcome = await coachMutationRegistry.program_edited.apply(
      {
        mesocycleId: "meso-2",
        summary: "Swapped squat for leg press",
        resolvedOps: [{ kind: "replace_exercise" }],
      },
      makeDeps()
    );

    const parsed = coachMutationPayloadSchemas.program_edited.parse(
      outcome.payload
    );
    await coachMutationRegistry.program_edited.revert(parsed, makeDeps());
    expect(revertProgramEdits).toHaveBeenCalledWith("user-1", {
      mesocycleId: "meso-2",
      snapshot: [snapshotRow],
      protocolBefore: "custom",
    });
  });

  it("workout_edited: apply dispatches the actions, revert dispatches the recorded inverse", async () => {
    const deps = makeDeps({ currentWorkout: activeWorkout });
    const outcome = await coachMutationRegistry.workout_edited.apply(
      {
        workoutId: "workout-1",
        summary: "Added curls",
        actions: [{ kind: "delete", workoutExerciseId: "we-1" }],
        inverseActions: [
          { kind: "add", workoutExercise: { id: "we-1" } },
        ],
      },
      deps
    );
    expect(dispatch).toHaveBeenCalledTimes(1);

    vi.mocked(dispatch).mockClear();
    const parsed = coachMutationPayloadSchemas.workout_edited.parse(
      outcome.payload
    );
    await coachMutationRegistry.workout_edited.revert(parsed, deps);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

describe("workout_edited guards", () => {
  it("apply refuses (and dispatches nothing) when the workout is not active", async () => {
    await expect(
      coachMutationRegistry.workout_edited.apply(
        {
          workoutId: "workout-1",
          summary: "Added curls",
          actions: [{ kind: "delete", workoutExerciseId: "we-1" }],
          inverseActions: [],
        },
        makeDeps({ currentWorkout: null })
      )
    ).rejects.toThrow("no longer active");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("revert refuses when a different workout is active", async () => {
    await expect(
      revertCoachChange(
        makeEntry({
          change_type: "workout_edited",
          payload: { workoutId: "workout-1", inverseActions: [] },
        }),
        makeDeps({
          currentWorkout: { id: "workout-2" } as unknown as Workout,
        })
      )
    ).rejects.toThrow("cannot be undone");
  });
});

describe("canRevertCoachChange", () => {
  const programEntry = makeEntry({
    change_type: "program_created",
    payload: { mesocycleId: "meso-2", previousActiveMesocycleId: null },
  });

  it("is false once the entry is reverted", () => {
    expect(
      canRevertCoachChange(
        { ...programEntry, reverted_at: "2026-07-01T01:00:00Z" },
        makeDeps()
      )
    ).toBe(false);
  });

  it("is false for a malformed legacy payload instead of exploding on click", () => {
    expect(
      canRevertCoachChange(
        makeEntry({
          change_type: "program_edited",
          payload: { mesocycleId: "meso-2" }, // missing snapshot/protocolBefore
        }),
        makeDeps()
      )
    ).toBe(false);
  });

  it("gates workout edits on the matching workout still being active", () => {
    const entry = makeEntry({
      change_type: "workout_edited",
      payload: { workoutId: "workout-1", inverseActions: [] },
    });
    expect(
      canRevertCoachChange(entry, makeDeps({ currentWorkout: activeWorkout }))
    ).toBe(true);
    expect(canRevertCoachChange(entry, makeDeps())).toBe(false);
  });

  it("accepts program entries whose payload parses", () => {
    expect(canRevertCoachChange(programEntry, makeDeps())).toBe(true);
  });
});

describe("legacy payload tolerance", () => {
  it("program_created rows missing previousActiveMesocycleId revert to no previous program", async () => {
    await revertCoachChange(
      makeEntry({
        change_type: "program_created",
        payload: { mesocycleId: "meso-2" }, // legacy: key dropped by JSON
      }),
      makeDeps()
    );
    expect(revertProgramCreation).toHaveBeenCalledWith("user-1", {
      mesocycleId: "meso-2",
      previousActiveMesocycleId: null,
    });
  });
});
