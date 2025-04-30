import React, { useState, useMemo, useEffect } from 'react';
import { useAppSelector } from "@/hooks/redux"; // Import Redux hooks
import { selectWorkoutHistory } from "@/state/history/historySlice"; // Restore history slice import for stats calculation
import { useQuery } from '@tanstack/react-query'; // Add TanStack Query import
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Add Supabase function import
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Calendar, Award } from "lucide-react"; // Removed BarChart, TrendingUp
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { Exercise } from "@/lib/types/workout"; // Removed ExerciseSet, Workout, WorkoutExercise as they are not used directly for display
import { useAuth } from '@/state/auth/AuthProvider'; // Import useAuth to get user ID easily
import StrengthBenchmarks from '@/components/features/Benchmarks/StrengthBenchmarks'; 
import CalisthenicBenchmarks from '@/components/features/Benchmarks/CalisthenicBenchmarks';
import { Barbell } from "@phosphor-icons/react";
import ExerciseProgressAnalysis from '@/components/features/Analytics/ExerciseProgressAnalysis'; // Import the new component

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
  // Get workout history for stats calculation
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  // Get user object for ID
  const { user } = useAuth(); 
  
  // Fetch list of all exercises for the dropdown selector (Keep this here)
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
    staleTime: Infinity, // Exercises list rarely changes, cache indefinitely
  });
  
  // Recalculate OVERALL stats based on Redux state 
  const stats = useMemo(() => {
    const totalWorkouts = workoutHistory?.length ?? 0; 
    const totalTime = workoutHistory?.reduce((sum, workout) => sum + workout.duration, 0) ?? 0;
    const averageTime = totalWorkouts > 0 ? totalTime / totalWorkouts : 0;

    const exerciseCounts: Record<string, number> = {};
    workoutHistory?.forEach(workout => {
      workout.exercises.forEach(ex => {
        exerciseCounts[ex.exerciseId] = (exerciseCounts[ex.exerciseId] || 0) + 1;
      });
    });

    let mostCommonExerciseId = "";
    let mostCommonCount = 0;
    Object.entries(exerciseCounts).forEach(([id, count]) => {
      if (count > mostCommonCount) {
        mostCommonExerciseId = id;
        mostCommonCount = count;
      }
    });
    
    return { totalWorkouts, totalTime, averageTime, mostCommonExerciseId };
  }, [workoutHistory]); 

  // Find the most common exercise name (remains unchanged)
  const mostCommonExercise = useMemo(() => {
      if (isLoadingExercises || !exercises) return null;
      return exercises.find(ex => ex.id === stats.mostCommonExerciseId);
  }, [exercises, stats.mostCommonExerciseId, isLoadingExercises]);

  // State for selected benchmark type
  const [selectedBenchmarkType, setSelectedBenchmarkType] = useState<BenchmarkType>('Strength');

  return (
    <div className="container mx-auto p-4 max-w-4xl"> {/* Increased max-width */}
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Your Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
      </header>

      <main className="space-y-8"> {/* Added space between main sections */}
        <h2 className="text-2xl font-semibold mb-4">Performance Overview</h2> {/* Added heading */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"> {/* Changed to 4 cols */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-fitnessBlue" />
                Total Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalWorkouts}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 text-fitnessBlue" />
                Total Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatTime(stats.totalTime)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Barbell className="mr-2 h-4 w-4 text-fitnessBlue" />
                Avg. Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatTime(Math.round(stats.averageTime))}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Award className="mr-2 h-4 w-4 text-fitnessBlue" />
                Top Exercise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold truncate" title={mostCommonExercise ? mostCommonExercise.name : "None"}> {/* Made text smaller, added truncate */}
                {isLoadingExercises ? 'Loading...' : (mostCommonExercise ? mostCommonExercise.name : "None")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Render the new ExerciseProgressAnalysis component */}
        <ExerciseProgressAnalysis 
            userId={user?.id}
            exercises={exercises}
            isLoadingExercises={isLoadingExercises}
            errorExercises={errorExercises}
        />

        {/* Benchmark Section - Conditionally render based on state */}
        <div className="mt-8"> {/* Add some margin top */} 
          <h2 className="text-2xl font-semibold mb-4">Benchmarks</h2> {/* Added heading */} 
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

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
          {/* Handle cases where exercises might still be loading */}
          {workoutHistory.length > 0 ? (
            <div className="space-y-4">
              {[...workoutHistory].slice(0, 5).map((workout, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>Workout on {formatDate(workout.date)}</span> {/* Keep formatDate here */}
                      <span className="text-sm font-normal flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatTime(workout.duration)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workout.exercises.map((ex, i) => {
                        // Find exercise name using the fetched data (still needed here)
                        const exercise = exercises.find(e => e.id === ex.exerciseId);
                        return (
                          <div key={i} className="text-sm">
                            <p className="font-medium">{isLoadingExercises ? 'Loading...' : (exercise?.name || "Unknown exercise")}</p>
                            <p className="text-gray-600">
                              {ex.sets.filter(s => s.completed).length} sets completed
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No workout history available yet. Complete a workout to see it here!</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
