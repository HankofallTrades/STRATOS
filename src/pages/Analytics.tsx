import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { Link } from "react-router-dom";
import { Exercise } from "@/lib/types/workout";
import { useAuth } from '@/state/auth/AuthProvider';
import StrengthBenchmarks from '@/components/features/Benchmarks/StrengthBenchmarks';
import CalisthenicBenchmarks from '@/components/features/Benchmarks/CalisthenicBenchmarks';
import ExerciseProgressAnalysis from '@/components/features/Analytics/ExerciseProgressAnalysis';
import PerformanceOverview from '@/components/features/Analytics/PerformanceOverview';
import RecentWorkouts from '@/components/features/Analytics/RecentWorkouts';

// Define Benchmark Type
type BenchmarkType = 'Strength' | 'Calisthenics';

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
  
  // State for selected benchmark type
  const [selectedBenchmarkType, setSelectedBenchmarkType] = useState<BenchmarkType>('Strength');

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
      </header>

      <main className="space-y-8">
        <h2 className="text-2xl font-semibold mb-4">Performance Overview</h2>
        <PerformanceOverview />

        {/* Render the ExerciseProgressAnalysis component */}
        <ExerciseProgressAnalysis
            userId={user?.id}
            exercises={exercises}
            isLoadingExercises={isLoadingExercises}
            errorExercises={errorExercises}
        />

        {/* Benchmark Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Benchmarks</h2>
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
