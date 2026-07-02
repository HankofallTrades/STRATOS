import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  insertCoachChange,
  type CoachChangeType,
} from "@/domains/guidance/data/changeLogRepository";
import {
  coachMutationRegistry,
  type CoachMutationApplyInputs,
} from "@/domains/guidance/data/coachMutations";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";

// The one apply path for confirm-only Coach mutations. Looks the command up in
// the mutation registry, runs its forward op, then does the shared tail once:
// record to the change log (warn, don't roll back, if that fails), invalidate
// the keys the command declares, toast its success message. Errors thrown by
// the command are user-facing.
export const useCoachMutations = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const applyMutation = useCallback(
    async <T extends CoachChangeType>(
      changeType: T,
      input: CoachMutationApplyInputs[T]
    ) => {
      if (!userId) {
        toast.error("You need to be signed in to apply Coach changes.");
        return;
      }
      const deps = { userId, dispatch, currentWorkout };
      const descriptor = coachMutationRegistry[changeType];
      try {
        const outcome = await descriptor.apply(input as never, deps);
        try {
          await insertCoachChange(
            userId,
            changeType,
            outcome.summary,
            outcome.payload
          );
          queryClient.invalidateQueries({
            queryKey: ["coachChangeLog", userId],
          });
        } catch {
          toast.warning(
            "The change was applied but could not be added to the change log."
          );
        }
        for (const queryKey of descriptor.invalidates(userId)) {
          queryClient.invalidateQueries({ queryKey });
        }
        toast.success(outcome.successMessage);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply the change."
        );
      }
    },
    [currentWorkout, dispatch, queryClient, userId]
  );

  return { applyMutation };
};
