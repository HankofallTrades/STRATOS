import React from 'react';
import { useWorkout } from '@/state/workout/WorkoutContext';
import { formatTime } from '@/lib/utils/timeUtils';
import { BarChart, Clock, Calendar, Dumbbell, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/core/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { useState } from "react";
import { Exercise } from "@/lib/types/workout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';

const Analytics = () => {
  const { workoutHistory, exercises } = useWorkout();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Calculate total workouts, total time, and average workout duration
  const totalWorkouts = workoutHistory.length;
  const totalTime = workoutHistory.reduce((sum, workout) => sum + workout.duration, 0);
  const averageTime = totalWorkouts > 0 ? totalTime / totalWorkouts : 0;

  // Calculate most common exercise
  const exerciseCounts: Record<string, number> = {};
  workoutHistory.forEach(workout => {
    workout.exercises.forEach(ex => {
      if (exerciseCounts[ex.exerciseId]) {
        exerciseCounts[ex.exerciseId]++;
      } else {
        exerciseCounts[ex.exerciseId] = 1;
      }
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

  const mostCommonExercise = exercises.find(ex => ex.id === mostCommonExerciseId);

  // Get exercise history (to show progress for a specific exercise)
  const getExerciseHistory = (exerciseId: string) => {
    const history: { date: Date; maxWeight: number }[] = [];
    
    workoutHistory.forEach(workout => {
      const exerciseEntry = workout.exercises.find(ex => ex.exerciseId === exerciseId);
      
      if (exerciseEntry) {
        // Find the set with the highest weight
        let maxWeight = 0;
        exerciseEntry.sets.forEach(set => {
          if (set.completed && set.weight > maxWeight) {
            maxWeight = set.weight;
          }
        });
        
        if (maxWeight > 0) {
          history.push({
            date: new Date(workout.date),
            maxWeight,
          });
        }
      }
    });
    
    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Your Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
        
        <nav className="flex gap-4 mb-8">
          <Link to="/">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-fitnessBlue text-fitnessBlue hover:bg-fitnessBlue/10"
            >
              <Dumbbell size={18} />
              <span>Workout</span>
            </Button>
          </Link>
          <Link to="/analytics">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-fitnessIndigo text-fitnessIndigo hover:bg-fitnessIndigo/10"
            >
              <BarChart size={18} />
              <span>Analytics</span>
            </Button>
          </Link>
        </nav>
      </header>

      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-fitnessBlue" />
                Total Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalWorkouts}</p>
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
              <p className="text-3xl font-bold">{formatTime(totalTime)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Dumbbell className="mr-2 h-4 w-4 text-fitnessBlue" />
                Avg. Workout Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatTime(Math.round(averageTime))}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <Award className="mr-2 h-4 w-4 text-fitnessBlue" />
                Most Common Exercise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {mostCommonExercise ? mostCommonExercise.name : "None"}
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">Exercise Progress</h2>
        {exercises.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium mb-2">Select an exercise to view progress</label>
              <select
                className="w-full p-2 border rounded-md bg-white"
                value={selectedExercise?.id || ""}
                onChange={(e) => {
                  const selected = exercises.find(ex => ex.id === e.target.value);
                  setSelectedExercise(selected || null);
                }}
              >
                <option value="">Select an exercise</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedExercise && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedExercise.name}</CardTitle>
                  <CardDescription>
                    {selectedExercise.oneRepMax 
                      ? `Estimated 1RM: ${Math.round(selectedExercise.oneRepMax)} kg` 
                      : "No 1RM data available yet"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getExerciseHistory(selectedExercise.id).length > 0 ? (
                      getExerciseHistory(selectedExercise.id).map((entry, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{formatDate(entry.date)}</span>
                          <span className="font-medium">{entry.maxWeight} kg</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No history available for this exercise</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">No exercises available yet. Start a workout to track your progress!</p>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
          {workoutHistory.length > 0 ? (
            <div className="space-y-4">
              {[...workoutHistory].reverse().slice(0, 5).map((workout, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>Workout on {formatDate(new Date(workout.date))}</span>
                      <span className="text-sm font-normal flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatTime(workout.duration)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workout.exercises.map((ex, i) => {
                        const exercise = exercises.find(e => e.id === ex.exerciseId);
                        return (
                          <div key={i} className="text-sm">
                            <p className="font-medium">{exercise?.name || "Unknown exercise"}</p>
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
