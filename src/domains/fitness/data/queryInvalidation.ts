import type { QueryClient } from "@tanstack/react-query";

const ACTIVE_MESOCYCLE_QUERY_KEY = "activeMesocycleProgram";

export const invalidateWorkoutDependentQueries = async (
  queryClient: QueryClient,
  userId: string
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["homeRecentWorkouts", userId] }),
    queryClient.invalidateQueries({ queryKey: ["homeRecentPrRows", userId] }),
    queryClient.invalidateQueries({ queryKey: ["movementStreak", userId] }),
    queryClient.invalidateQueries({ queryKey: ["recentWorkoutsSummary", userId] }),
    queryClient.invalidateQueries({ queryKey: ["performanceStats", userId] }),
    queryClient.invalidateQueries({ queryKey: ["weeklyArchetypeSets_v2", userId] }),
    queryClient.invalidateQueries({ queryKey: ["weeklyZone2Cardio", userId] }),
    queryClient.invalidateQueries({ queryKey: ["lastSet", userId] }),
    queryClient.invalidateQueries({
      queryKey: [ACTIVE_MESOCYCLE_QUERY_KEY, userId],
    }),
  ]);
};
