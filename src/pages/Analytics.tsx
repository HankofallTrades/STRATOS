import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { Exercise } from "@/lib/types/workout";
import { useAuth } from '@/state/auth/AuthProvider';
import StrengthBenchmarks from '@/domains/analytics/view/benchmarks/StrengthBenchmarks';
import CalisthenicBenchmarks from '@/domains/analytics/view/benchmarks/CalisthenicBenchmarks';
import OneRepMax from '@/domains/analytics/view/OneRepMax';
import RecentWorkouts from '@/domains/analytics/view/RecentWorkouts';
import Volume from '@/domains/analytics/view/Volume';
import PerformanceOverview from '@/domains/analytics/view/PerformanceOverview';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/core/tabs";
import {
  getUserWeight,
  getDailyProteinIntake,
  DailyProteinIntake,
  UserWeight,
  getWeeklyZone2CardioMinutes,
  WeeklyZone2CardioData,
  getDailySunExposure
} from "@/domains/fitness/model/fitnessRepository";
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
import SunMoonProgress from '@/components/core/charts/SunMoonProgress';

// LocalStorage Key for persistence
const ANALYTICS_VIEW_STORAGE_KEY = 'selectedAnalyticsView_v2';

// Define Benchmark Type
type BenchmarkType = 'Strength' | 'Calisthenics';

// Define Analysis Type
type AnalysisType = 'E1RM' | 'Volume' | 'Benchmarks';

const Analytics = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: exercises = [] as Exercise[], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => (await fetchExercisesFromDB()) as Exercise[],
    staleTime: Infinity,
  });

  const [selectedBenchmarkType, setSelectedBenchmarkType] = useState<BenchmarkType>('Strength');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>(() => {
    try {
      const storedView = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
      if (storedView === 'E1RM' || storedView === 'Volume' || storedView === 'Benchmarks') {
        return storedView as AnalysisType;
      }
    } catch (error) {
      console.error("Error reading analysis view from localStorage:", error);
    }
    return 'E1RM';
  });

  useEffect(() => {
    try {
      localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, selectedAnalysisType);
    } catch (error) {
      console.error("Error saving analysis view to localStorage:", error);
    }
  }, [selectedAnalysisType]);

  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: userWeightData } = useQuery<UserWeight | null, Error>({
    queryKey: ['userWeight', userId],
    queryFn: async () => userId ? getUserWeight(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyProteinData } = useQuery<DailyProteinIntake | null, Error>({
    queryKey: ['dailyProteinIntake', userId, todayDate],
    queryFn: async () => userId ? getDailyProteinIntake(userId, todayDate) : null,
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 1 * 60 * 1000,
  });

  const { data: dailySunExposure } = useQuery<{ total_hours: number } | null, Error>({
    queryKey: ['dailySunExposure', userId, todayDate],
    queryFn: async () => userId ? getDailySunExposure(userId, todayDate) : null,
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });

  const { data: weeklyZone2Cardio } = useQuery<WeeklyZone2CardioData | null, Error>({
    queryKey: ['weeklyZone2Cardio', userId],
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

  const proteinGoal = useMemo(() => {
    if (userWeightData?.weight_kg) {
      return Math.round(userWeightData.weight_kg * 2);
    }
    return 0;
  }, [userWeightData]);

  const currentProtein = dailyProteinData?.total_protein || 0;
  const currentSunHours = dailySunExposure?.total_hours || 0;
  const currentZone2Minutes = weeklyZone2Cardio?.total_minutes || 0;

  const sunExposureGoalHours = 2;
  const zone2CardioGoalMinutes = 150;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <main className="space-y-8">
        {/* Main Analytics Tabs at the top */}
        <div className="pt-2">
          <Tabs value={selectedAnalysisType} onValueChange={(value) => setSelectedAnalysisType(value as AnalysisType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="E1RM">Estimated 1RM</TabsTrigger>
              <TabsTrigger value="Volume">Volume</TabsTrigger>
              <TabsTrigger value="Benchmarks">Benchmarks</TabsTrigger>
            </TabsList>
            <TabsContent value="E1RM">
              <OneRepMax
                userId={userId}
                exercises={exercises}
                isLoadingExercises={isLoadingExercises}
                errorExercises={errorExercises}
              />
            </TabsContent>
            <TabsContent value="Volume">
              <Volume
                userId={userId}
              />
            </TabsContent>
            <TabsContent value="Benchmarks">
              {selectedBenchmarkType === 'Strength' ? (
                <StrengthBenchmarks
                  userId={userId}
                  exercises={exercises}
                  currentType={selectedBenchmarkType}
                  onTypeChange={setSelectedBenchmarkType}
                />
              ) : (
                <CalisthenicBenchmarks
                  userId={userId}
                  exercises={exercises}
                  currentType={selectedBenchmarkType}
                  onTypeChange={setSelectedBenchmarkType}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Performance Overview in the middle */}
        <PerformanceOverview userId={userId} exercises={exercises} />

        {/* Daily Progress Rings */}
        <section className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
            <div className="flex flex-col items-center">
              <CircularProgressDisplay
                currentValue={currentProtein}
                goalValue={proteinGoal}
                label="Today's Protein"
                unit="g"
                size={140}
                barSize={12}
                showTooltip={!!userId && proteinGoal > 0}
                showCenterText={true}
              />
            </div>
            <SunMoonProgress
              currentHours={currentSunHours}
              goalHours={sunExposureGoalHours}
              size={140}
              barSize={10}
              label="Daily Sun Exposure"
            />
            <div className="flex flex-col items-center">
              <CircularProgressDisplay
                currentValue={currentZone2Minutes}
                goalValue={zone2CardioGoalMinutes}
                label="Weekly Endurance"
                unit="min"
                size={140}
                barSize={12}
                defaultColor="#16A34A"
                highlightColor="#059669"
                showTooltip={true}
                showCenterText={true}
              />
            </div>
          </div>
        </section>

        {/* Recent Workouts at the bottom */}
        <div className="mt-8">
          <RecentWorkouts userId={userId} />
        </div>
      </main>
    </div>
  );
};

export default Analytics;
