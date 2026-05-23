import type { MesocycleSessionTemplate } from "@/domains/periodization";
import type { SessionFocus } from "@/lib/types/workout";

interface BaseStartPayload {
  ownerUserId: string | null;
  sessionFocus?: SessionFocus;
}

interface ProgramSessionInput {
  ownerUserId: string | null;
  activeProgram: {
    mesocycle: {
      id: string;
      goal_focus: SessionFocus;
      protocol: string;
    };
    current_week: number;
  };
  sessionTemplate: Pick<MesocycleSessionTemplate, "id" | "session_focus">;
  initialExercises?: unknown[];
}

export const createBaseWorkoutStartPayload = ({
  ownerUserId,
  sessionFocus,
}: BaseStartPayload) => ({
  ownerUserId,
  sessionFocus,
});

export const createProgramWorkoutStartPayload = ({
  ownerUserId,
  activeProgram,
  sessionTemplate,
  initialExercises,
}: ProgramSessionInput) => ({
  ownerUserId,
  sessionFocus: (sessionTemplate.session_focus ??
    activeProgram.mesocycle.goal_focus) as SessionFocus,
  mesocycleId: activeProgram.mesocycle.id,
  mesocycleSessionId: sessionTemplate.id,
  mesocycleWeek: activeProgram.current_week,
  mesocycleProtocol: activeProgram.mesocycle.protocol,
  ...(initialExercises ? { initialExercises } : {}),
});
