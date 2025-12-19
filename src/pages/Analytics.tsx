import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { Link } from "react-router-dom";
import { Exercise } from "@/lib/types/workout";
import { useAuth } from '@/state/auth/AuthProvider';
import StrengthBenchmarks from '@/domains/fitness/view/benchmarks/StrengthBenchmarks';
import CalisthenicBenchmarks from '@/domains/fitness/view/benchmarks/CalisthenicBenchmarks';
import OneRepMax from '@/domains/fitness/view/analytics/OneRepMax';
import RecentWorkouts from '@/domains/fitness/view/analytics/RecentWorkouts';
import Volume from '@/domains/fitness/view/analytics/Volume';
import PerformanceOverview from '@/domains/fitness/view/analytics/PerformanceOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/core/tabs";
import { getUserWeight, getDailyProteinIntake, DailyProteinIntake, UserWeight, getWeeklyZone2CardioMinutes, WeeklyZone2CardioData } from "@/domains/fitness/model/fitnessRepository";
import { ProgressBar } from "@/components/core/ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
import SunMoonProgress from '@/components/core/charts/SunMoonProgress';
import { getDailySunExposure } from '@/domains/fitness/model/fitnessRepository';

// LocalStorage Key for persistence
const ANALYTICS_VIEW_STORAGE_KEY = 'selectedAnalyticsView_v2';

// Define Benchmark Type
type BenchmarkType = 'Strength' | 'Calisthenics';

// Define Analysis Type
type AnalysisType = 'E1RM' | 'Volume' | 'Benchmarks';

// Format date for display (e.g., in Recent Workouts)
const formatDate = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  // Ensure the date is valid before formatting
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString(undefined, { // Use locale-sensitive formatting
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const Analytics = () => {
  // Get user object for ID
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch list of all exercises (needed for ExerciseProgressAnalysis)
  const { data: exercises = [] as Exercise[], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => (await fetchExercisesFromDB()) as Exercise[],
    staleTime: Infinity,
  });

  // State for selected benchmark type (now used within the Benchmarks tab)
  const [selectedBenchmarkType, setSelectedBenchmarkType] = useState<BenchmarkType>('Strength');
  // State for selected analysis type - Initialize from localStorage
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>(() => {
    try {
      const storedView = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
      // Ensure stored value is a valid AnalysisType
      if (storedView === 'E1RM' || storedView === 'Volume' || storedView === 'Benchmarks') {
        return storedView;
      }
    } catch (error) {
      console.error("Error reading analysis view from localStorage:", error);
    }
    return 'E1RM'; // Default to E1RM
  });

  // Effect to save selected analysis type to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, selectedAnalysisType);
    } catch (error) {
      console.error("Error saving analysis view to localStorage:", error);
    }
  }, [selectedAnalysisType]);

  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: userWeightData, isLoading: isLoadingUserWeight } = useQuery<
    UserWeight | null,
    Error
  >(
    {
      queryKey: ['userWeight', userId],
      queryFn: async () => {
        if (!userId) return null;
        return getUserWeight(userId);
      },
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    }
  );

  const { data: dailyProteinData, isLoading: isLoadingDailyProtein } = useQuery<
    DailyProteinIntake | null,
    Error
  >(
    {
      queryKey: ['dailyProteinIntake', userId, todayDate],
      queryFn: async () => {
        if (!userId) return null;
        return getDailyProteinIntake(userId, todayDate);
      },
      enabled: !!userId,
      staleTime: 1 * 60 * 1000,
      refetchInterval: 1 * 60 * 1000,
    }
  );

  const { data: dailySunExposure } = useQuery<{ total_hours: number } | null, Error>({
    queryKey: ['dailySunExposure', userId, todayDate],
    queryFn: async () => {
      if (!userId) return null;
      return getDailySunExposure(userId, todayDate);
    },
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

  const sunExposureGoalHours = 2; // default
  const zone2CardioGoalMinutes = 150; // default

  return (
    <div className="container mx-auto p-4 max-w-4xl">

      <main className="space-y-8">
        {/* Top analytics: Volume and wellness widgets */}
        <section className="space-y-6">
          <div>
            <Volume userId={user?.id} />
          </div>
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

        <PerformanceOverview />

        <div className="pt-6">
          <Tabs value={selectedAnalysisType} onValueChange={(value) => setSelectedAnalysisType(value as AnalysisType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="E1RM">Estimated 1RM</TabsTrigger>
              <TabsTrigger value="Volume">Volume</TabsTrigger>
              <TabsTrigger value="Benchmarks">Benchmarks</TabsTrigger>
            </TabsList>
            <TabsContent value="E1RM">
              <OneRepMax
                userId={user?.id}
                exercises={exercises}
                isLoadingExercises={isLoadingExercises}
                errorExercises={errorExercises}
              />
            </TabsContent>
            <TabsContent value="Volume">
              <Volume
                userId={user?.id}
              />
            </TabsContent>
            <TabsContent value="Benchmarks">
              {selectedBenchmarkType === 'Strength' ? (
                <StrengthBenchmarks
                  currentType={selectedBenchmarkType}
                  onTypeChange={setSelectedBenchmarkType}
                />
              ) : (
                <CalisthenicBenchmarks
                  currentType={selectedBenchmarkType}
                  onTypeChange={setSelectedBenchmarkType}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Render the new RecentWorkouts component */}
        <div className="mt-8">
          <RecentWorkouts />
        </div>
      </main>
    </div>
  );
};

export default Analytics;
