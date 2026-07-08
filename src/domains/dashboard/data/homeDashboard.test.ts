import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchUserProfile } from "@/domains/account/data/accountRepository";
import {
  fetchRecentCompletedWeightedSetsForPr,
  fetchRecentWorkoutsSummary,
} from "@/domains/analytics/data/analyticsRepository";
import { fetchMovementHabitCompletionDates } from "@/domains/habits/data/repository";
import { fetchHomeDashboardSnapshot } from "@/domains/dashboard/data/homeDashboard";

vi.mock("@/domains/account/data/accountRepository", () => ({
  fetchUserProfile: vi.fn(),
}));

vi.mock("@/domains/analytics/data/analyticsRepository", () => ({
  fetchRecentCompletedWeightedSetsForPr: vi.fn(),
  fetchRecentWorkoutsSummary: vi.fn(),
}));

vi.mock("@/domains/habits/data/repository", () => ({
  fetchMovementHabitCompletionDates: vi.fn(),
}));

const recentWorkouts = [
  {
    workout_id: "workout-1",
    workout_created_at: "2026-07-08T08:00:00.000Z",
    duration_seconds: 1800,
    total_completed_sets: 6,
    exercise_names: ["Bench Press"],
  },
];

describe("fetchHomeDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUserProfile).mockResolvedValue(null);
    vi.mocked(fetchRecentWorkoutsSummary).mockResolvedValue(recentWorkouts);
    vi.mocked(fetchRecentCompletedWeightedSetsForPr).mockResolvedValue([]);
    vi.mocked(fetchMovementHabitCompletionDates).mockResolvedValue([
      "2026-07-07",
    ]);
  });

  it("fetches movement completion dates without waiting for a UI-derived habit id", async () => {
    const snapshot = await fetchHomeDashboardSnapshot("user-1");

    expect(fetchMovementHabitCompletionDates).toHaveBeenCalledWith("user-1", 365);
    expect(snapshot.movementCompletionDates).toEqual(["2026-07-07"]);
  });

  it("reuses recent workout summaries for PR analysis instead of refetching them", async () => {
    await fetchHomeDashboardSnapshot("user-1");

    expect(fetchRecentWorkoutsSummary).toHaveBeenCalledTimes(1);
    expect(fetchRecentCompletedWeightedSetsForPr).toHaveBeenCalledWith(
      "user-1",
      recentWorkouts
    );
  });
});
