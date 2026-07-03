import { fetchUserProfile, type ProfileRow } from "@/domains/account/data/accountRepository";
import {
  fetchRecentCompletedWeightedSetsForPr,
  fetchRecentWorkoutsSummary,
  type CompletedWeightedSetForPr,
  type RecentWorkoutSummary,
} from "@/domains/analytics/data/analyticsRepository";
import { getHabitCompletionDates } from "@/domains/habits/data/repository";

// I/O boundary for the home dashboard: one batched snapshot fetch. All pure
// derivation lives in homeModel.ts (buildHomeModel).

export interface HomeDashboardSnapshot {
  movementCompletionDates: string[];
  profile: ProfileRow | null;
  recentPrRows: CompletedWeightedSetForPr[];
  recentWorkouts: RecentWorkoutSummary[];
}

export const fetchHomeDashboardSnapshot = async (
  userId: string,
  movementHabitId: string | null
): Promise<HomeDashboardSnapshot> => {
  const [profile, recentWorkouts, recentPrRows, movementCompletionDates] =
    await Promise.all([
      fetchUserProfile(userId),
      fetchRecentWorkoutsSummary(userId, 5),
      fetchRecentCompletedWeightedSetsForPr(userId),
      movementHabitId
        ? getHabitCompletionDates(userId, movementHabitId, 365)
        : Promise.resolve([]),
    ]);

  return {
    movementCompletionDates,
    profile,
    recentPrRows,
    recentWorkouts,
  };
};
