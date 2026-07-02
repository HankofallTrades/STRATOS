import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listCoachChanges,
  markCoachChangeReverted,
  type CoachChangeLogEntry,
} from "@/domains/guidance/data/changeLogRepository";
import {
  canRevertCoachChange,
  revertCoachChange,
} from "@/domains/guidance/data/coachMutations";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

// Change-log surface: listing plus revert. Revert dispatches through the Coach
// mutation registry (data/coachMutations.ts), which parses the stored payload
// with the same schema `apply` wrote it with and runs the command's inverse —
// this hook never inspects a payload itself.
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
    if (!userId) return false;
    return canRevertCoachChange(entry, { userId, dispatch, currentWorkout });
  };

  const revertMutation = useMutation({
    mutationFn: async (entry: CoachChangeLogEntry) => {
      if (!userId) throw new Error("Not signed in.");
      if (entry.reverted_at) throw new Error("This change was already reverted.");
      await revertCoachChange(entry, { userId, dispatch, currentWorkout });
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
