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
  getRecoverySnapshot,
  type RecoverySnapshot,
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

  const { data: recoverySnapshot } = useQuery<RecoverySnapshot | null, Error>({
    queryKey: ["analyticsRecoverySnapshot", userId, todayDate],
    queryFn: async () => (userId ? getRecoverySnapshot(userId, todayDate) : null),
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const proteinGoal = useMemo(
    () => getProteinGoal(recoverySnapshot?.userWeight?.weight_kg),
    [recoverySnapshot?.userWeight?.weight_kg]
  );

  const currentProtein = recoverySnapshot?.dailyProtein?.total_protein || 0;
  const currentSunHours = recoverySnapshot?.dailySunExposure?.total_hours || 0;
  const currentZone2Minutes = recoverySnapshot?.weeklyZone2Cardio?.total_minutes || 0;
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
