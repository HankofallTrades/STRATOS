import type {
  ActiveMesocycleProgram,
  MesocycleProtocol,
  MesocycleSessionTemplate,
} from "@/domains/periodization/data/types";
import { createCustomMesocycleSession } from "@/domains/periodization/data/repository";
import type { SessionFocus, WorkoutExercise } from "@/lib/types/workout";
import type { AppDispatch } from "@/state/store";
import {
  startWorkout,
  type StartWorkoutPayload,
} from "@/state/workout/workoutSlice";

import { buildExercisesFromSessionTemplate } from "./workoutScreen";

// Workout start: every way a session begins crosses this one interface. The
// caller says what it wants (an intent); this module derives the reducer
// payload, loads template exercises, creates a custom session row when asked,
// and refuses to start over a workout already in progress. Navigation and
// cache invalidation stay with the caller, as they do for Workout commit.

/** What a generator or the Coach hands over: a session already planned. */
export interface WorkoutPlanStart {
  sessionFocus: SessionFocus;
  initialExercises: WorkoutExercise[];
  mesocycleId?: string;
  mesocycleSessionId?: string;
  mesocycleWeek?: number;
  mesocycleProtocol?: MesocycleProtocol;
}

export type WorkoutStartIntent =
  | { kind: "quick"; sessionFocus?: SessionFocus }
  | {
      kind: "program-session";
      activeProgram: ActiveMesocycleProgram;
      sessionTemplate: MesocycleSessionTemplate;
    }
  | {
      kind: "custom-session";
      activeProgram: ActiveMesocycleProgram;
      sessionFocus?: SessionFocus;
    }
  | { kind: "plan"; plan: WorkoutPlanStart };

export interface WorkoutStartDeps {
  dispatch: AppDispatch;
  ownerUserId: string | null;
  currentWorkoutId: string | null;
}

export type WorkoutStartOutcome =
  | { status: "started"; createdSessionId?: string }
  | { status: "already-active" }
  | { status: "failed"; error: unknown };

const formatTodayIsoDate = () => new Date().toISOString().split("T")[0];

const programFields = (
  activeProgram: ActiveMesocycleProgram
): Pick<StartWorkoutPayload, "mesocycleId" | "mesocycleWeek" | "mesocycleProtocol"> => ({
  mesocycleId: activeProgram.mesocycle.id,
  mesocycleWeek: activeProgram.current_week,
  mesocycleProtocol: activeProgram.mesocycle.protocol,
});

const resolvePayload = async (
  intent: WorkoutStartIntent,
  deps: WorkoutStartDeps
): Promise<{ payload: StartWorkoutPayload; createdSessionId?: string }> => {
  switch (intent.kind) {
    case "quick":
      return { payload: { sessionFocus: intent.sessionFocus } };

    case "program-session": {
      const { activeProgram, sessionTemplate } = intent;
      return {
        payload: {
          ...programFields(activeProgram),
          mesocycleSessionId: sessionTemplate.id,
          sessionFocus:
            sessionTemplate.session_focus ?? activeProgram.mesocycle.goal_focus,
          initialExercises: await buildExercisesFromSessionTemplate(
            sessionTemplate,
            deps.ownerUserId ?? ""
          ),
        },
      };
    }

    case "custom-session": {
      const { activeProgram } = intent;
      if (!deps.ownerUserId) {
        throw new Error("User is required to create a custom session.");
      }
      const sessionFocus = intent.sessionFocus ?? activeProgram.mesocycle.goal_focus;
      const nextOrder = activeProgram.sessions.length + 1;
      const created = await createCustomMesocycleSession(deps.ownerUserId, {
        mesocycle_id: activeProgram.mesocycle.id,
        name: `Custom Session ${nextOrder} (${formatTodayIsoDate()})`,
        session_focus: sessionFocus,
      });
      return {
        createdSessionId: created.id,
        payload: {
          ...programFields(activeProgram),
          mesocycleSessionId: created.id,
          sessionFocus,
        },
      };
    }

    case "plan":
      return { payload: { ...intent.plan } };
  }
};

export const startWorkoutSession = async (
  intent: WorkoutStartIntent,
  deps: WorkoutStartDeps
): Promise<WorkoutStartOutcome> => {
  if (deps.currentWorkoutId !== null) {
    return { status: "already-active" };
  }

  let resolved: Awaited<ReturnType<typeof resolvePayload>>;
  try {
    resolved = await resolvePayload(intent, deps);
  } catch (error) {
    return { status: "failed", error };
  }

  deps.dispatch(
    startWorkout({ ...resolved.payload, ownerUserId: deps.ownerUserId })
  );
  return resolved.createdSessionId
    ? { status: "started", createdSessionId: resolved.createdSessionId }
    : { status: "started" };
};
