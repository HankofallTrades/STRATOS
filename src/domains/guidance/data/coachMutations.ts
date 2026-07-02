import { z } from "zod";

import type {
  ProgramDraftApply,
  ProgramEditApply,
  WorkoutEditApply,
} from "@/domains/guidance/agent/contracts";
import type {
  CoachChangeLogEntry,
  CoachChangeType,
} from "@/domains/guidance/data/changeLogRepository";
import {
  applyWorkoutEditActions,
  type WorkoutEditAction,
} from "@/domains/guidance/data/workoutEditActions";
import {
  applyProgramEdits,
  revertProgramCreation,
  revertProgramEdits,
  saveDraftedProgram,
} from "@/domains/periodization/data/repository";
import type {
  DraftedProgramInput,
  ResolvedProgramEditOp,
} from "@/domains/periodization";
import type { AppDispatch } from "@/state/store";
import type { Workout } from "@/lib/types/workout";

// Coach mutation registry: every confirm-only Coach mutation is one command
// descriptor owning its apply, its inverse, its revertibility rule, and the
// change-log payload both sides share. The payload is written by `apply` and
// read back by `revert` through the same zod schema, so a drift between what
// apply records and what revert expects is a compile error (and a malformed
// legacy row is a clean parse failure, not a corrupt revert).

// ---------------------------------------------------------------------------
// Payload schemas — the single source for what each change type records.

const sessionExerciseSnapshotRowSchema = z.object({
  id: z.string(),
  mesocycle_session_id: z.string(),
  exercise_id: z.string(),
  exercise_order: z.number(),
  target_sets: z.number().nullable(),
  target_reps: z.string().nullable(),
  load_increment_kg: z.number().nullable(),
  notes: z.string().nullable(),
});

export const coachMutationPayloadSchemas = {
  program_created: z.object({
    mesocycleId: z.string(),
    // Legacy rows may omit the key entirely (JSON drops undefined).
    previousActiveMesocycleId: z.string().nullish(),
  }),
  program_edited: z.object({
    mesocycleId: z.string(),
    // Recorded for audit; revert replays the snapshot, not the ops.
    ops: z.array(z.record(z.unknown())),
    snapshot: z.array(sessionExerciseSnapshotRowSchema),
    protocolBefore: z.enum(["occams", "custom", "coach"]),
  }),
  workout_edited: z.object({
    workoutId: z.string(),
    inverseActions: z.array(z.record(z.unknown())),
  }),
} as const satisfies Record<CoachChangeType, z.ZodTypeAny>;

export type CoachMutationPayloads = {
  [T in CoachChangeType]: z.infer<(typeof coachMutationPayloadSchemas)[T]>;
};

// ---------------------------------------------------------------------------
// Command descriptors.

/** What each mutation's `apply` receives — the artifact's confirm payload. */
export interface CoachMutationApplyInputs {
  program_created: ProgramDraftApply;
  program_edited: ProgramEditApply;
  workout_edited: WorkoutEditApply;
}

export interface CoachMutationDeps {
  userId: string;
  dispatch: AppDispatch;
  currentWorkout: Workout | null;
}

export interface CoachMutationOutcome<T extends CoachChangeType> {
  summary: string;
  payload: CoachMutationPayloads[T];
  successMessage: string;
}

interface CoachMutationDescriptor<T extends CoachChangeType> {
  payloadSchema: (typeof coachMutationPayloadSchemas)[T];
  /** Forward op. Throws an Error whose message is user-facing (toast). */
  apply: (
    input: CoachMutationApplyInputs[T],
    deps: CoachMutationDeps
  ) => Promise<CoachMutationOutcome<T>>;
  /** Inverse op, fed the parsed payload `apply` recorded. */
  revert: (
    payload: CoachMutationPayloads[T],
    deps: CoachMutationDeps
  ) => Promise<void> | void;
  canRevert: (payload: CoachMutationPayloads[T], deps: CoachMutationDeps) => boolean;
  /** Query keys the hook invalidates after a successful apply. */
  invalidates: (userId: string) => unknown[][];
}

export const coachMutationRegistry = {
  program_created: {
    payloadSchema: coachMutationPayloadSchemas.program_created,
    apply: async (input, deps) => {
      const draft = input.draftedProgram as unknown as DraftedProgramInput;
      const result = await saveDraftedProgram(deps.userId, draft);
      return {
        summary: `Created program "${result.mesocycle.name}"`,
        payload: {
          mesocycleId: result.mesocycle.id,
          previousActiveMesocycleId: result.previousActiveMesocycleId,
        },
        successMessage: `"${result.mesocycle.name}" is now your active program.`,
      };
    },
    revert: (payload, deps) =>
      revertProgramCreation(deps.userId, {
        mesocycleId: payload.mesocycleId,
        previousActiveMesocycleId: payload.previousActiveMesocycleId ?? null,
      }),
    canRevert: () => true,
    invalidates: (userId) => [["activeMesocycleProgram", userId]],
  },
  program_edited: {
    payloadSchema: coachMutationPayloadSchemas.program_edited,
    apply: async (input, deps) => {
      const ops = input.resolvedOps as unknown as ResolvedProgramEditOp[];
      const result = await applyProgramEdits(deps.userId, input.mesocycleId, ops);
      return {
        summary: input.summary,
        payload: {
          mesocycleId: input.mesocycleId,
          ops: input.resolvedOps,
          snapshot: result.snapshot,
          protocolBefore: result.protocolBefore,
        },
        successMessage: "Program updated.",
      };
    },
    revert: (payload, deps) =>
      revertProgramEdits(deps.userId, {
        mesocycleId: payload.mesocycleId,
        snapshot: payload.snapshot,
        protocolBefore: payload.protocolBefore,
      }),
    canRevert: () => true,
    invalidates: (userId) => [["activeMesocycleProgram", userId]],
  },
  workout_edited: {
    payloadSchema: coachMutationPayloadSchemas.workout_edited,
    apply: async (input, deps) => {
      if (!deps.currentWorkout || deps.currentWorkout.id !== input.workoutId) {
        throw new Error("That workout is no longer active.");
      }
      applyWorkoutEditActions(
        deps.dispatch,
        input.actions as unknown as WorkoutEditAction[]
      );
      return {
        summary: input.summary,
        payload: {
          workoutId: input.workoutId,
          inverseActions: input.inverseActions,
        },
        successMessage: "Workout updated.",
      };
    },
    revert: (payload, deps) => {
      if (!deps.currentWorkout || deps.currentWorkout.id !== payload.workoutId) {
        throw new Error(
          "That workout is no longer active, so this change cannot be undone."
        );
      }
      applyWorkoutEditActions(
        deps.dispatch,
        payload.inverseActions as unknown as WorkoutEditAction[]
      );
    },
    canRevert: (payload, deps) => deps.currentWorkout?.id === payload.workoutId,
    invalidates: () => [],
  },
} as const satisfies { [T in CoachChangeType]: CoachMutationDescriptor<T> };

// ---------------------------------------------------------------------------
// Dispatchers over the registry — the only places a stored payload is parsed.

/** Revertible = not yet reverted, payload parses, and the command agrees. */
export const canRevertCoachChange = (
  entry: CoachChangeLogEntry,
  deps: CoachMutationDeps
): boolean => {
  if (entry.reverted_at) return false;
  const parsed = coachMutationPayloadSchemas[entry.change_type].safeParse(
    entry.payload
  );
  if (!parsed.success) return false;
  return coachMutationRegistry[entry.change_type].canRevert(
    parsed.data as never,
    deps
  );
};

/** Parse the stored payload through the mutation's schema, then run its inverse. */
export const revertCoachChange = async (
  entry: CoachChangeLogEntry,
  deps: CoachMutationDeps
): Promise<void> => {
  const descriptor = coachMutationRegistry[entry.change_type];
  const payload = descriptor.payloadSchema.parse(entry.payload);
  await descriptor.revert(payload as never, deps);
};
