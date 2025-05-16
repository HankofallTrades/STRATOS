import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { Link } from "react-router-dom";
import { Exercise } from "@/lib/types/workout";
import { useAuth } from '@/state/auth/AuthProvider';
import StrengthBenchmarks from '@/components/features/Benchmarks/StrengthBenchmarks';
import CalisthenicBenchmarks from '@/components/features/Benchmarks/CalisthenicBenchmarks';
import OneRepMax from '@/components/features/Analytics/OneRepMax';
import PerformanceOverview from '@/components/features/Analytics/PerformanceOverview';
import RecentWorkouts from '@/components/features/Analytics/RecentWorkouts';
import Volume from '@/components/features/Analytics/Volume';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/core/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/core/tabs";
import { getUserWeight, getDailyProteinIntake, DailyProteinIntake, UserWeight } from "@/lib/integrations/supabase/nutrition";
import { ProgressBar } from "@/components/core/ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";

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
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
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

  const proteinGoal = useMemo(() => {
    if (userWeightData?.weight_kg) {
      return Math.round(userWeightData.weight_kg * 2);
    }
    return 0;
  }, [userWeightData]);

  const currentProtein = dailyProteinData?.total_protein || 0;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
      </header>

      <main className="space-y-8">
        <h2 className="text-2xl font-semibold mb-4">Performance Overview</h2>
        <PerformanceOverview />

        {/* Protein Intake Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Daily Protein Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isLoadingUserWeight || isLoadingDailyProtein) && <p>Loading protein data...</p>}
            {!isLoadingUserWeight && !userWeightData?.weight_kg && !isLoadingDailyProtein && (
              <p className="text-sm text-muted-foreground">
                Set your weight in your profile to calculate your protein goal (2g per kg).
                {/* Optional: Link to profile/settings page */}
              </p>
            )}
            {proteinGoal > 0 && (
              <>
                <ProgressBar value={currentProtein} max={proteinGoal} />
                <p className="text-center text-muted-foreground">
                  {currentProtein} / {proteinGoal} g logged today
                </p>
              </>
            )}
            {proteinGoal === 0 && !isLoadingUserWeight && userWeightData?.weight_kg && (
                 <p className="text-center text-muted-foreground">
                  Current Protein: {currentProtein} g (Goal not set due to missing weight)
                </p>
            )}
          </CardContent>
        </Card>

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
