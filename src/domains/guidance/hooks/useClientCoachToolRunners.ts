import { useMemo } from "react";

import type { CoachClientToolRunners } from "@/domains/guidance/agent/tools";
import { useProgramActions } from "@/domains/guidance/hooks/useProgramActions";
import { useProposeWorkout } from "@/domains/guidance/hooks/useProposeWorkout";

// The client-executed Coach tools keyed by name. The send loop looks a tool up
// here instead of switching on its name. Typed as `CoachClientToolRunners`
// (a Record over the registry's client tools), so adding a client tool to the
// registry without wiring a runner here is a compile error.
export const useClientCoachToolRunners = (): CoachClientToolRunners => {
  const proposeWorkout = useProposeWorkout();
  const {
    getProgramContext,
    proposeProgram,
    proposeProgramEdit,
    proposeActiveWorkoutEdit,
  } = useProgramActions();

  return useMemo(
    () => ({
      propose_workout: proposeWorkout,
      get_program_context: getProgramContext,
      propose_program: proposeProgram,
      propose_program_edit: proposeProgramEdit,
      propose_active_workout_edit: proposeActiveWorkoutEdit,
    }),
    [
      getProgramContext,
      proposeActiveWorkoutEdit,
      proposeProgram,
      proposeProgramEdit,
      proposeWorkout,
    ]
  );
};
