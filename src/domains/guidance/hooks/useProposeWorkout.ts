import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { CoachToolResultPayload } from "@/domains/guidance/agent/contracts";
import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";

export const useProposeWorkout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);

  return useCallback(async (
    input: Record<string, unknown> = {}
  ): Promise<CoachToolResultPayload> => {
    const { createWorkoutProposal } = await import("./useWorkoutGenerator");

    return createWorkoutProposal({
      input,
      queryClient,
      userId: user?.id ?? null,
      workoutHistory,
    });
  }, [queryClient, user?.id, workoutHistory]);
};
