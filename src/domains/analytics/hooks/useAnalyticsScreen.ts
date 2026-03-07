import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchAnalyticsExercises,
} from "@/domains/analytics/data/analyticsRepository";
import {
  ANALYTICS_ACCENT,
  ANALYTICS_ACCENT_HIGHLIGHT,
  getProteinGoal,
  getTodayDateKey,
  persistSelectedAnalysisType,
  readSelectedAnalysisType,
  type AnalysisType,
  type BenchmarkType,
} from "@/domains/analytics/data/analyticsScreen";
import {
  DailyProteinIntake,
  getDailyProteinIntake,
  getDailySunExposure,
  getUserWeight,
  getWeeklyZone2CardioMinutes,
  type UserWeight,
  type WeeklyZone2CardioData,
} from "@/domains/fitness/data/fitnessRepository";
import { useAuth } from "@/state/auth/AuthProvider";

export const useAnalyticsScreen = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [selectedBenchmarkType, setSelectedBenchmarkType] =
    useState<BenchmarkType>("Strength");
  const [selectedAnalysisType, setSelectedAnalysisType] =
    useState<AnalysisType>(readSelectedAnalysisType);

  useEffect(() => {
    persistSelectedAnalysisType(selectedAnalysisType);
  }, [selectedAnalysisType]);

  const todayDate = useMemo(() => getTodayDateKey(), []);

  const {
    data: exercises = [],
    isLoading: isLoadingExercises,
    error: errorExercises,
  } = useQuery({
    queryKey: ["exercises"],
    queryFn: fetchAnalyticsExercises,
    staleTime: Infinity,
  });

  const { data: userWeightData } = useQuery<UserWeight | null, Error>({
    queryKey: ["userWeight", userId],
    queryFn: async () => (userId ? getUserWeight(userId) : null),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyProteinData } = useQuery<DailyProteinIntake | null, Error>({
    queryKey: ["dailyProteinIntake", userId, todayDate],
    queryFn: async () => (userId ? getDailyProteinIntake(userId, todayDate) : null),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 1 * 60 * 1000,
  });

  const { data: dailySunExposure } = useQuery<{ total_hours: number } | null, Error>({
    queryKey: ["dailySunExposure", userId, todayDate],
    queryFn: async () => (userId ? getDailySunExposure(userId, todayDate) : null),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });

  const { data: weeklyZone2Cardio } = useQuery<WeeklyZone2CardioData | null, Error>({
    queryKey: ["weeklyZone2Cardio", userId],
    queryFn: async () => {
      if (!userId) return null;

      try {
        return await getWeeklyZone2CardioMinutes(userId);
      } catch {
        return { total_minutes: 0 } as WeeklyZone2CardioData;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const proteinGoal = useMemo(
    () => getProteinGoal(userWeightData?.weight_kg),
    [userWeightData?.weight_kg]
  );

  const currentProtein = dailyProteinData?.total_protein || 0;
  const currentSunHours = dailySunExposure?.total_hours || 0;
  const currentZone2Minutes = weeklyZone2Cardio?.total_minutes || 0;
  const sunExposureGoalHours = 2;
  const zone2CardioGoalMinutes = 150;

  return {
    accentColor: ANALYTICS_ACCENT,
    accentHighlightColor: ANALYTICS_ACCENT_HIGHLIGHT,
    currentProtein,
    currentSunHours,
    currentZone2Minutes,
    errorExercises,
    exercises,
    isLoadingExercises,
    proteinGoal,
    proteinMeta:
      proteinGoal > 0 ? `${proteinGoal}g goal` : "Set bodyweight goal",
    selectedAnalysisType,
    selectedBenchmarkType,
    setSelectedAnalysisType,
    setSelectedBenchmarkType,
    sunExposureGoalHours,
    sunMeta: `${sunExposureGoalHours}h today`,
    userId,
    zone2CardioGoalMinutes,
    zone2Meta: `${zone2CardioGoalMinutes} min week`,
  };
};
