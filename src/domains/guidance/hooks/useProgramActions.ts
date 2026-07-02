import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  CoachToolResultPayload,
  ProgramDraftApply,
  ProgramEditApply,
  WorkoutEditApply,
} from "@/domains/guidance/agent/contracts";
import {
  proposeActiveWorkoutEditInputSchema,
  proposeProgramEditInputSchema,
  proposeProgramInputSchema,
} from "@/domains/guidance/agent/tools";
import { insertCoachChange } from "@/domains/guidance/data/changeLogRepository";
import {
  fetchGuidanceExercises,
  fetchMovementArchetypes,
} from "@/domains/guidance/data/guidanceRepository";
import {
  applyWorkoutEditActions,
  buildActiveWorkoutEdit,
  buildProgramContextMessage,
  buildProgramDraft,
  buildProgramEdit,
  type WorkoutEditAction,
} from "@/domains/guidance/data/toolBuilders";
import {
  applyProgramEdits,
  getActiveMesocycleProgram,
  saveDraftedProgram,
} from "@/domains/periodization/data/repository";
import type {
  ActiveMesocycleProgram,
  DraftedProgramInput,
  ResolvedProgramEditOp,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

// React seam for the client Coach tools: this hook fetches the catalog/program/
// workout deps and hands them to the pure builders in data/toolBuilders.ts. The
// builders own the logic (and the tests); this hook owns the I/O and the
// confirm-only apply handlers.
export const useProgramActions = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
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

  const recordChange = useCallback(
    async (
      changeType: "program_created" | "program_edited" | "workout_edited",
      summary: string,
      payload: Record<string, unknown>
    ) => {
      if (!userId) return;
      try {
        await insertCoachChange(userId, changeType, summary, payload);
        queryClient.invalidateQueries({ queryKey: ["coachChangeLog", userId] });
      } catch {
        toast.warning(
          "The change was applied but could not be added to the change log."
        );
      }
    },
    [queryClient, userId]
  );

  const applyProgramDraft = useCallback(
    async (apply: ProgramDraftApply) => {
      if (!userId) {
        toast.error("You need to be signed in to apply a program.");
        return;
      }
      try {
        const draft = apply.draftedProgram as unknown as DraftedProgramInput;
        const result = await saveDraftedProgram(userId, draft);
        await recordChange(
          "program_created",
          `Created program "${result.mesocycle.name}"`,
          {
            mesocycleId: result.mesocycle.id,
            previousActiveMesocycleId: result.previousActiveMesocycleId,
          }
        );
        queryClient.invalidateQueries({
          queryKey: ["activeMesocycleProgram", userId],
        });
        toast.success(`"${result.mesocycle.name}" is now your active program.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply the program."
        );
      }
    },
    [queryClient, recordChange, userId]
  );

  const applyProgramEdit = useCallback(
    async (apply: ProgramEditApply) => {
      if (!userId) {
        toast.error("You need to be signed in to apply program edits.");
        return;
      }
      try {
        const ops = apply.resolvedOps as unknown as ResolvedProgramEditOp[];
        const result = await applyProgramEdits(userId, apply.mesocycleId, ops);
        await recordChange("program_edited", apply.summary, {
          mesocycleId: apply.mesocycleId,
          ops: apply.resolvedOps,
          snapshot: result.snapshot,
          protocolBefore: result.protocolBefore,
        });
        queryClient.invalidateQueries({
          queryKey: ["activeMesocycleProgram", userId],
        });
        toast.success("Program updated.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to apply program edits."
        );
      }
    },
    [queryClient, recordChange, userId]
  );

  const applyWorkoutEdit = useCallback(
    async (apply: WorkoutEditApply) => {
      if (!currentWorkout || currentWorkout.id !== apply.workoutId) {
        toast.error("That workout is no longer active.");
        return;
      }
      applyWorkoutEditActions(
        dispatch,
        apply.actions as unknown as WorkoutEditAction[]
      );
      await recordChange("workout_edited", apply.summary, {
        workoutId: apply.workoutId,
        inverseActions: apply.inverseActions,
      });
      toast.success("Workout updated.");
    },
    [currentWorkout, dispatch, recordChange]
  );

  return {
    getProgramContext,
    proposeProgram,
    proposeProgramEdit,
    proposeActiveWorkoutEdit,
    applyProgramDraft,
    applyProgramEdit,
    applyWorkoutEdit,
  };
};
