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
import { Card, CardContent } from "@/components/core/card";

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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
      </header>

      <main className="space-y-8">
        <h2 className="text-2xl font-semibold mb-4">Performance Overview</h2>
        <PerformanceOverview />

        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>

        {/* Render the new RecentWorkouts component */}
        <div className="mt-8">
            <RecentWorkouts />
        </div>
      </main>
    </div>
  );
};

export default Analytics;
