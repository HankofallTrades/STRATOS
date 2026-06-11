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
  type WorkoutEditAction,
} from "@/domains/guidance/data/workoutEditActions";
import { buildExerciseDraft } from "@/domains/guidance/hooks/useWorkoutGenerator";
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
import type { Exercise } from "@/lib/types/workout";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

const normalizeName = (value: string) => value.trim().toLowerCase();

const findExerciseByName = (
  catalog: Exercise[],
  name: string
): Exercise | null =>
  catalog.find(
    (exercise) => normalizeName(exercise.name) === normalizeName(name)
  ) ?? null;

const strengthCatalog = (catalog: Exercise[]): Exercise[] =>
  catalog.filter((exercise) => exercise.exercise_type !== "cardio");

const formatCatalogByArchetype = (
  catalog: Exercise[],
  archetypeMap: Map<string, string>
): string => {
  const grouped = new Map<string, string[]>();
  for (const exercise of strengthCatalog(catalog)) {
    const archetype =
      (exercise.archetype_id && archetypeMap.get(exercise.archetype_id)) ||
      "Other";
    grouped.set(archetype, [...(grouped.get(archetype) ?? []), exercise.name]);
  }
  return Array.from(grouped.entries())
    .map(([archetype, names]) => `${archetype}: ${names.sort().join(", ")}`)
    .join("; ");
};

const formatProgramSummary = (program: ActiveMesocycleProgram | null): string => {
  if (!program) return "No active program.";
  const sessions = program.sessions
    .map(
      (session) =>
        `${session.name}: ${
          session.exercises
            .map((row) => row.exercise?.name ?? "unknown")
            .join(", ") || "no exercises"
        }`
    )
    .join(" | ");
  return `Active program: "${program.mesocycle.name}" (protocol ${program.mesocycle.protocol}, week ${program.current_week} of ${program.mesocycle.duration_weeks}, goal ${program.mesocycle.goal_focus}). Sessions — ${sessions}. Next session: ${program.next_session_name ?? "unknown"}.`;
};

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
    return { exercises, archetypeMap };
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
      const [{ exercises, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      const message = `${formatProgramSummary(program)}\nExercise catalog (use these exact names) — ${formatCatalogByArchetype(exercises, archetypeMap)}`;
      return { message };
    }, [loadActiveProgram, loadCatalog]);

  const proposeProgram = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramInputSchema.parse(rawInput);
      const { exercises, archetypeMap } = await loadCatalog();

      const unresolved: string[] = [];
      const sessions = input.sessions.map((session) => ({
        name: session.name,
        sessionFocus: session.sessionFocus ?? null,
        setsPerExercise: session.setsPerExercise ?? null,
        repRange: session.repRange ?? null,
        progressionRule: session.progressionRule ?? null,
        exercises: session.exercises.map((exercise) => {
          const resolved = findExerciseByName(exercises, exercise.exerciseName);
          if (!resolved) unresolved.push(exercise.exerciseName);
          return {
            exerciseId: resolved?.id ?? "",
            exerciseName: resolved?.name ?? exercise.exerciseName,
            targetSets: exercise.targetSets ?? null,
            targetReps: exercise.targetReps ?? null,
            loadIncrementKg: exercise.loadIncrementKg ?? null,
            notes: exercise.notes ?? null,
          };
        }),
      }));

      if (unresolved.length > 0) {
        throw new Error(
          `These exercise names are not in the catalog: ${[...new Set(unresolved)].join(", ")}. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
        );
      }

      const draftedProgram: DraftedProgramInput = {
        name: input.name,
        goalFocus: input.goalFocus,
        durationWeeks: input.durationWeeks,
        notes: input.notes ?? null,
        sessions,
      };

      return {
        message: `Drafted "${input.name}" (${input.durationWeeks} weeks, ${sessions.length} sessions). The user must apply it before it becomes active.`,
        artifact: {
          type: "program_draft",
          title: input.name,
          rationale: input.rationale,
          goalFocus: input.goalFocus,
          durationWeeks: input.durationWeeks,
          sessions: sessions.map((session) => ({
            name: session.name,
            exercises: session.exercises.map((exercise) => ({
              name: exercise.exerciseName,
              targetSets: exercise.targetSets,
              targetReps: exercise.targetReps,
            })),
          })),
          apply: {
            draftedProgram: draftedProgram as unknown as Record<string, unknown>,
          },
        },
      };
    },
    [loadCatalog]
  );

  const proposeProgramEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeProgramEditInputSchema.parse(rawInput);
      const [{ exercises, archetypeMap }, program] = await Promise.all([
        loadCatalog(),
        loadActiveProgram(),
      ]);
      if (!program) {
        throw new Error(
          "There is no active program to edit. Propose a new program instead."
        );
      }

      const resolvedOps: ResolvedProgramEditOp[] = [];
      const changes: Array<{
        label: string;
        before: string | null;
        after: string | null;
      }> = [];

      for (const op of input.ops) {
        const session = program.sessions.find(
          (candidate) =>
            normalizeName(candidate.name) === normalizeName(op.sessionName)
        );
        if (!session) {
          throw new Error(
            `Session "${op.sessionName}" is not in the active program. Sessions: ${program.sessions.map((candidate) => candidate.name).join(", ")}.`
          );
        }

        if (op.op === "add_exercise") {
          const resolved = findExerciseByName(exercises, op.exerciseName);
          if (!resolved) {
            throw new Error(
              `"${op.exerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          resolvedOps.push({
            op: "add_exercise",
            sessionId: session.id,
            exerciseId: resolved.id,
            targetSets: op.targetSets ?? null,
            targetReps: op.targetReps ?? null,
          });
          changes.push({
            label: `${session.name}: add ${resolved.name}`,
            before: null,
            after: resolved.name,
          });
          continue;
        }

        const row = session.exercises.find(
          (candidate) =>
            normalizeName(candidate.exercise?.name ?? "") ===
            normalizeName(op.exerciseName)
        );
        if (!row) {
          throw new Error(
            `"${op.exerciseName}" is not in session "${session.name}". That session has: ${session.exercises.map((candidate) => candidate.exercise?.name ?? "unknown").join(", ")}.`
          );
        }

        if (op.op === "replace_exercise") {
          const replacement = findExerciseByName(exercises, op.newExerciseName);
          if (!replacement) {
            throw new Error(
              `"${op.newExerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          resolvedOps.push({
            op: "replace_exercise",
            sessionId: session.id,
            rowId: row.id,
            newExerciseId: replacement.id,
          });
          changes.push({
            label: `${session.name}: replace`,
            before: row.exercise?.name ?? op.exerciseName,
            after: replacement.name,
          });
        } else if (op.op === "remove_exercise") {
          resolvedOps.push({
            op: "remove_exercise",
            sessionId: session.id,
            rowId: row.id,
          });
          changes.push({
            label: `${session.name}: remove`,
            before: row.exercise?.name ?? op.exerciseName,
            after: null,
          });
        } else {
          resolvedOps.push({
            op: "update_targets",
            sessionId: session.id,
            rowId: row.id,
            ...(typeof op.targetSets !== "undefined"
              ? { targetSets: op.targetSets }
              : {}),
            ...(typeof op.targetReps !== "undefined"
              ? { targetReps: op.targetReps }
              : {}),
            ...(typeof op.loadIncrementKg !== "undefined"
              ? { loadIncrementKg: op.loadIncrementKg }
              : {}),
          });
          const beforeText = `${row.target_sets ?? "?"}x${row.target_reps ?? "?"}`;
          const afterText = `${op.targetSets ?? row.target_sets ?? "?"}x${op.targetReps ?? row.target_reps ?? "?"}`;
          changes.push({
            label: `${session.name}: ${row.exercise?.name ?? op.exerciseName} targets`,
            before: beforeText,
            after: afterText,
          });
        }
      }

      const convertsToCoachProtocol = program.mesocycle.protocol !== "coach";
      const summary = changes.map((change) => change.label).join("; ");

      return {
        message: `Proposed ${changes.length} edit(s) to "${program.mesocycle.name}". The user must apply them.${convertsToCoachProtocol ? " Applying converts the program to coach-managed (off its fixed template)." : ""}`,
        artifact: {
          type: "program_edit",
          title: `Edit ${program.mesocycle.name}`,
          rationale: input.rationale,
          convertsToCoachProtocol,
          changes,
          apply: {
            mesocycleId: program.mesocycle.id,
            summary,
            resolvedOps: resolvedOps as unknown as Array<Record<string, unknown>>,
          },
        },
      };
    },
    [loadActiveProgram, loadCatalog]
  );

  const proposeActiveWorkoutEdit = useCallback(
    async (rawInput: Record<string, unknown>): Promise<CoachToolResultPayload> => {
      const input = proposeActiveWorkoutEditInputSchema.parse(rawInput);
      if (!currentWorkout) {
        throw new Error("There is no workout in progress to edit.");
      }
      const { exercises, archetypeMap } = await loadCatalog();

      const actions: WorkoutEditAction[] = [];
      const inverseActions: WorkoutEditAction[] = [];
      const changes: Array<{ label: string }> = [];

      for (const op of input.ops) {
        if (op.op === "add_exercise") {
          const resolved = findExerciseByName(exercises, op.exerciseName);
          if (!resolved) {
            throw new Error(
              `"${op.exerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          const draft = buildExerciseDraft(resolved);
          actions.push({ kind: "add", workoutExercise: draft });
          inverseActions.unshift({ kind: "delete", workoutExerciseId: draft.id });
          changes.push({ label: `Add ${resolved.name}` });
          continue;
        }

        const target = currentWorkout.exercises.find(
          (candidate) =>
            normalizeName(candidate.exercise.name) ===
            normalizeName(op.exerciseName)
        );
        if (!target) {
          throw new Error(
            `"${op.exerciseName}" is not in the current workout. It has: ${currentWorkout.exercises.map((candidate) => candidate.exercise.name).join(", ")}.`
          );
        }

        if (op.op === "swap_exercise") {
          const replacement = findExerciseByName(exercises, op.newExerciseName);
          if (!replacement) {
            throw new Error(
              `"${op.newExerciseName}" is not in the catalog. Use exact names from — ${formatCatalogByArchetype(exercises, archetypeMap)}`
            );
          }
          const draft = { ...buildExerciseDraft(replacement), id: target.id };
          actions.push({ kind: "replace", workoutExercise: draft });
          inverseActions.unshift({ kind: "replace", workoutExercise: target });
          changes.push({
            label: `Swap ${target.exercise.name} → ${replacement.name}`,
          });
        } else {
          actions.push({ kind: "delete", workoutExerciseId: target.id });
          inverseActions.unshift({ kind: "add", workoutExercise: target });
          changes.push({ label: `Remove ${target.exercise.name}` });
        }
      }

      const summary = changes.map((change) => change.label).join("; ");

      return {
        message: `Proposed ${changes.length} change(s) to the current workout. The user must apply them.`,
        artifact: {
          type: "workout_edit",
          title: "Adjust current workout",
          rationale: input.rationale,
          changes,
          apply: {
            workoutId: currentWorkout.id,
            summary,
            actions: actions as unknown as Array<Record<string, unknown>>,
            inverseActions: inverseActions as unknown as Array<
              Record<string, unknown>
            >,
          },
        },
      };
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
