import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  startWorkoutSession,
  type WorkoutStartDeps,
} from "@/domains/fitness/data/workoutStart";
import type {
  ActiveMesocycleProgram,
  MesocycleSessionTemplate,
} from "@/domains/periodization/data/types";
import type { WorkoutExercise } from "@/lib/types/workout";
import type { AppDispatch } from "@/state/store";

vi.mock("@/domains/fitness/data/workoutScreen", () => ({
  buildExercisesFromSessionTemplate: vi.fn(),
}));

vi.mock("@/domains/periodization/data/repository", () => ({
  createCustomMesocycleSession: vi.fn(),
}));

import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import { createCustomMesocycleSession } from "@/domains/periodization/data/repository";

const dispatch = vi.fn() as unknown as AppDispatch;

const deps: WorkoutStartDeps = {
  dispatch,
  ownerUserId: "user-1",
  currentWorkoutId: null,
};

const sessionTemplate = {
  id: "session-2",
  session_focus: "strength",
  exercises: [],
} as unknown as MesocycleSessionTemplate;

const activeProgram = {
  mesocycle: { id: "meso-1", goal_focus: "hypertrophy", protocol: "custom" },
  current_week: 3,
  sessions: [{ id: "session-1" }, sessionTemplate],
} as unknown as ActiveMesocycleProgram;

const templateExercises = [
  { id: "we-1", exerciseId: "ex-1", sets: [] },
] as unknown as WorkoutExercise[];

/** The reducer payload the last dispatch carried. */
const dispatchedPayload = () => {
  const [action] = vi.mocked(dispatch).mock.calls.at(-1) as unknown as [
    { type: string; payload: Record<string, unknown> },
  ];
  expect(action.type).toBe("workout/startWorkout");
  return action.payload;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildExercisesFromSessionTemplate).mockResolvedValue(templateExercises);
  vi.mocked(createCustomMesocycleSession).mockResolvedValue({
    id: "session-new",
  } as Awaited<ReturnType<typeof createCustomMesocycleSession>>);
});

describe("startWorkoutSession", () => {
  it("refuses to start over a workout already in progress", async () => {
    const outcome = await startWorkoutSession(
      { kind: "quick" },
      { ...deps, currentWorkoutId: "workout-live" }
    );

    expect(outcome).toEqual({ status: "already-active" });
    expect(dispatch).not.toHaveBeenCalled();
    expect(createCustomMesocycleSession).not.toHaveBeenCalled();
  });

  it("quick start carries only the chosen focus and the owner", async () => {
    const outcome = await startWorkoutSession(
      { kind: "quick", sessionFocus: "zone2" },
      deps
    );

    expect(outcome).toEqual({ status: "started" });
    expect(dispatchedPayload()).toEqual({
      sessionFocus: "zone2",
      ownerUserId: "user-1",
    });
  });

  it("program session loads the template's exercises and pins every mesocycle field", async () => {
    await startWorkoutSession(
      { kind: "program-session", activeProgram, sessionTemplate },
      deps
    );

    expect(buildExercisesFromSessionTemplate).toHaveBeenCalledWith(
      sessionTemplate,
      "user-1"
    );
    expect(dispatchedPayload()).toEqual({
      ownerUserId: "user-1",
      sessionFocus: "strength",
      initialExercises: templateExercises,
      mesocycleId: "meso-1",
      mesocycleSessionId: "session-2",
      mesocycleWeek: 3,
      mesocycleProtocol: "custom",
    });
  });

  it("program session falls back to the block's goal focus when the template has none", async () => {
    await startWorkoutSession(
      {
        kind: "program-session",
        activeProgram,
        sessionTemplate: { ...sessionTemplate, session_focus: null },
      },
      deps
    );

    expect(dispatchedPayload().sessionFocus).toBe("hypertrophy");
  });

  it("custom session creates the row first, then starts against its id", async () => {
    const outcome = await startWorkoutSession(
      { kind: "custom-session", activeProgram, sessionFocus: "speed" },
      deps
    );

    expect(createCustomMesocycleSession).toHaveBeenCalledWith("user-1", {
      mesocycle_id: "meso-1",
      name: expect.stringMatching(/^Custom Session 3 \(\d{4}-\d{2}-\d{2}\)$/),
      session_focus: "speed",
    });
    expect(outcome).toEqual({ status: "started", createdSessionId: "session-new" });
    expect(dispatchedPayload()).toEqual({
      ownerUserId: "user-1",
      sessionFocus: "speed",
      mesocycleId: "meso-1",
      mesocycleSessionId: "session-new",
      mesocycleWeek: 3,
      mesocycleProtocol: "custom",
    });
  });

  it("custom session reports failure and starts nothing when the row cannot be created", async () => {
    const error = new Error("Mesocycle not found.");
    vi.mocked(createCustomMesocycleSession).mockRejectedValueOnce(error);

    const outcome = await startWorkoutSession(
      { kind: "custom-session", activeProgram },
      deps
    );

    expect(outcome).toEqual({ status: "failed", error });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("custom session needs a signed-in owner", async () => {
    const outcome = await startWorkoutSession(
      { kind: "custom-session", activeProgram },
      { ...deps, ownerUserId: null }
    );

    expect(outcome.status).toBe("failed");
    expect(createCustomMesocycleSession).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("a plan starts as handed over, with the owner stamped at start time", async () => {
    await startWorkoutSession(
      {
        kind: "plan",
        plan: {
          sessionFocus: "recovery",
          initialExercises: templateExercises,
          mesocycleId: "meso-1",
        },
      },
      deps
    );

    expect(dispatchedPayload()).toEqual({
      sessionFocus: "recovery",
      initialExercises: templateExercises,
      mesocycleId: "meso-1",
      ownerUserId: "user-1",
    });
  });
});
