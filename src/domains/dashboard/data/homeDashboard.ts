import { fetchUserProfile, type ProfileRow } from "@/domains/account/data/accountRepository";
import {
  fetchRecentCompletedWeightedSetsForPr,
  fetchRecentWorkoutsSummary,
  type CompletedWeightedSetForPr,
  type RecentWorkoutSummary,
} from "@/domains/analytics/data/analyticsRepository";
import { fetchMovementHabitCompletionDates } from "@/domains/habits/data/repository";

// I/O boundary for the home dashboard: one batched snapshot fetch. All pure
// derivation lives in homeModel.ts (buildHomeModel).

export interface HomeDashboardSnapshot {
  movementCompletionDates: string[];
  profile: ProfileRow | null;
  recentPrRows: CompletedWeightedSetForPr[];
  recentWorkouts: RecentWorkoutSummary[];
}

const RECENT_WORKOUT_DISPLAY_LIMIT = 5;
const RECENT_WORKOUT_PR_LIMIT = 12;

export const fetchHomeDashboardSnapshot = async (
  userId: string
): Promise<HomeDashboardSnapshot> => {
  const recentWorkoutsPromise = fetchRecentWorkoutsSummary(
    userId,
    RECENT_WORKOUT_PR_LIMIT
  );
  const recentPrRowsPromise = recentWorkoutsPromise.then(recentWorkouts =>
    fetchRecentCompletedWeightedSetsForPr(userId, recentWorkouts)
  );

  const [
    profile,
    recentWorkoutsForPr,
    recentPrRows,
    movementCompletionDates,
  ] = await Promise.all([
    fetchUserProfile(userId),
    recentWorkoutsPromise,
    recentPrRowsPromise,
    fetchMovementHabitCompletionDates(userId, 365),
  ]);

  return {
    movementCompletionDates,
    profile,
    recentPrRows,
    recentWorkouts: recentWorkoutsForPr.slice(0, RECENT_WORKOUT_DISPLAY_LIMIT),
  };
};
