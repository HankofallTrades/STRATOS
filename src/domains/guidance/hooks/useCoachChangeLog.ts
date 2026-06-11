import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listCoachChanges,
  markCoachChangeReverted,
  type CoachChangeLogEntry,
} from "@/domains/guidance/data/changeLogRepository";
import {
  applyWorkoutEditActions,
  type WorkoutEditAction,
} from "@/domains/guidance/data/workoutEditActions";
import {
  revertProgramCreation,
  revertProgramEdits,
} from "@/domains/periodization/data/repository";
import type {
  MesocycleProtocol,
  SessionExerciseSnapshotRow,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

export const useCoachChangeLog = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const changesQuery = useQuery({
    queryKey: ["coachChangeLog", userId],
    queryFn: () => listCoachChanges(userId as string),
    enabled: Boolean(userId),
  });

  const canRevert = (entry: CoachChangeLogEntry): boolean => {
    if (entry.reverted_at) return false;
    if (entry.change_type !== "workout_edited") return true;
    const workoutId = entry.payload.workoutId as string | undefined;
    return Boolean(workoutId && currentWorkout?.id === workoutId);
  };

  const revertMutation = useMutation({
    mutationFn: async (entry: CoachChangeLogEntry) => {
      if (!userId) throw new Error("Not signed in.");
      if (entry.reverted_at) throw new Error("This change was already reverted.");

      if (entry.change_type === "program_created") {
        await revertProgramCreation(userId, {
          mesocycleId: entry.payload.mesocycleId as string,
          previousActiveMesocycleId:
            (entry.payload.previousActiveMesocycleId as string | null) ?? null,
        });
      } else if (entry.change_type === "program_edited") {
        await revertProgramEdits(userId, {
          mesocycleId: entry.payload.mesocycleId as string,
          snapshot: entry.payload.snapshot as SessionExerciseSnapshotRow[],
          protocolBefore: entry.payload.protocolBefore as MesocycleProtocol,
        });
      } else {
        const workoutId = entry.payload.workoutId as string | undefined;
        if (!workoutId || currentWorkout?.id !== workoutId) {
          throw new Error(
            "That workout is no longer active, so this change cannot be undone."
          );
        }
        applyWorkoutEditActions(
          dispatch,
          entry.payload.inverseActions as unknown as WorkoutEditAction[]
        );
      }

      await markCoachChangeReverted(entry.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coachChangeLog", userId] });
      queryClient.invalidateQueries({
        queryKey: ["activeMesocycleProgram", userId],
      });
      toast.success("Change reverted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to revert.");
    },
  });

  return {
    changes: changesQuery.data ?? [],
    isLoading: changesQuery.isLoading,
    canRevert,
    revert: revertMutation.mutate,
    isReverting: revertMutation.isPending,
  };
};
