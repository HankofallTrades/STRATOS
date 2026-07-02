import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { CoachToolResultPayload } from "@/domains/guidance/agent/contracts";
import {
  proposeActiveWorkoutEditInputSchema,
  proposeProgramEditInputSchema,
  proposeProgramInputSchema,
} from "@/domains/guidance/agent/tools";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import {
  buildActiveWorkoutEdit,
  buildProgramContextMessage,
  buildProgramDraft,
  buildProgramEdit,
} from "@/domains/guidance/data/toolBuilders";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
import type { ActiveMesocycleProgram } from "@/domains/periodization";
import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

// React seam for the client Coach propose/context tools: this hook fetches the
// catalog/program/workout deps and hands them to the pure builders in
// data/toolBuilders.ts. The builders own the logic (and the tests); this hook
// owns the I/O. Applying a proposed artifact is a Coach mutation and lives in
// useCoachMutations / data/coachMutations.ts.
export const useProgramActions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const loadCatalog = useCallback(async () => {
    const [exercises, archetypes] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["exercises"],
        queryFn: fetchGuidanceExercises,
        staleTime: Infinity,
      }),
      queryClient.ensureQueryData({
        queryKey: ["movementArchetypes"],
        queryFn: fetchMovementArchetypes,
        staleTime: Infinity,
      }),
    ]);
    const archetypeMap = new Map(
      archetypes.map((archetype) => [archetype.id, archetype.name])
    );
    return { catalog: exercises, archetypeMap };
  }, [queryClient]);

  const loadActiveProgram =
    useCallback(async (): Promise<ActiveMesocycleProgram | null> => {
      if (!userId) return null;
      return queryClient.ensureQueryData({
        queryKey: ["activeMesocycleProgram", userId],
        queryFn: () => getActiveMesocycleProgram(userId),
        staleTime: 60 * 1000,
      });
    }, [queryClient, userId]);

  const getProgramContext =
    useCallback(async (): Promise<CoachToolResultPayload> => {
      const [{ catalog, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      return buildProgramContextMessage({ catalog, archetypeMap, program });
    }, [loadActiveProgram, loadCatalog]);

  const proposeProgram = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramInputSchema.parse(rawInput);
      const { catalog, archetypeMap } = await loadCatalog();
      return buildProgramDraft(input, { catalog, archetypeMap });
    },
    [loadCatalog]
  );

  const proposeProgramEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramEditInputSchema.parse(rawInput);
      const [{ catalog, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      return buildProgramEdit(input, { catalog, archetypeMap, program });
    },
    [loadActiveProgram, loadCatalog]
  );

  const proposeActiveWorkoutEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeActiveWorkoutEditInputSchema.parse(rawInput);
      const { catalog, archetypeMap } = await loadCatalog();
      return buildActiveWorkoutEdit(input, {
        catalog,
        archetypeMap,
        currentWorkout,
      });
    },
    [currentWorkout, loadCatalog]
  );

  return {
    getProgramContext,
    proposeProgram,
    proposeProgramEdit,
    proposeActiveWorkoutEdit,
  };
};
