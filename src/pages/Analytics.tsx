import React, { useState, useMemo, useEffect } from 'react';
import { useAppSelector } from "@/hooks/redux"; // Import Redux hooks
import { selectWorkoutHistory } from "@/state/history/historySlice"; // Restore history slice import for stats calculation
import { useQuery } from '@tanstack/react-query'; // Add TanStack Query import
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Add Supabase function import
import { fetchMaxE1RMHistory } from '@/lib/integrations/supabase/history'; // Import the new history fetcher
import { supabase } from "@/lib/integrations/supabase/client"; // Import supabase client
import { formatTime } from '@/lib/utils/timeUtils';
import { BarChart, Clock, Calendar, Dumbbell, Award, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/core/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { Exercise, ExerciseSet, Workout, WorkoutExercise } from "@/lib/types/workout";
import { EquipmentType } from "@/lib/types/enums"; // Import EquipmentType
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';
import { Checkbox } from "@/components/core/checkbox"; // Import Checkbox
import { Label } from "@/components/core/label"; // Import Label
import { DailyMaxE1RM } from '@/lib/types/analytics'; // Import the type for RPC result

// Define the structure for processed data points
interface DataPoint {
  date: string; // Keep date as string for easier charting
  e1RM: number;
  variation?: string | null;
  equipmentType?: EquipmentType | string | null; // Allow string for 'Unknown'
}

// Define the structure for the processed history
interface ProcessedHistory {
  [combinationKey: string]: DataPoint[]; // Key: "Variation|EquipmentType"
}

// Define the structure for filter options
interface FilterOptions {
  variations: string[];
  equipmentTypes: string[];
}

// Define the structure for selected filters
interface SelectedFilters {
  variations: string[];
  equipmentTypes: string[];
}

// Define the structure for the chart data (grouped by combination)
interface ChartData {
  [combinationKey: string]: { workout_date: string; max_e1rm: number }[]; // Key: "Variation|EquipmentType"
}

// Helper function to create a unique key for combination
const getCombinationKey = (
    variation?: string | null, 
    equipmentType?: string | null // Now just string as returned from DB
): string => {
    // Treat null, undefined, empty string, or "Standard" as 'Default' variation key
    const varPart = (!variation || variation.toLowerCase() === 'standard') ? 'Default' : variation;
    const eqPart = equipmentType || 'Default';
    return `${varPart}|${eqPart}`;
};

// Format date for display (e.g., in Tooltip)
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

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]; // We focus on the first item in the payload array
    const name = dataPoint.name; // Now "Variation - EquipmentType"
    const value = dataPoint.value; // max_e1rm
    const date = label; // workout_date passed as label

    // Split by hyphen now
    const parts = name.split(' - ');
    const variation = parts[0] || 'Unknown'; 
    const equipmentType = parts[1] || 'Unknown';

    // Handle display names for "Default" (which now covers null/undefined/"Standard" variation)
    const variationDisplay = variation === 'Default' ? 'Standard' : variation;
    const equipmentDisplay = equipmentType === 'Default' ? 'Default' : equipmentType; // Keep displaying 'Default' if that's the key part

    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded shadow-lg text-sm"> {/* Added more padding and shadow */}
        <p className="label font-semibold mb-1">{`Date: ${formatDate(date)}`}</p>
        <p className="intro text-fitnessIndigo font-medium">{`Est. 1RM: ${value.toFixed(1)} kg`}</p> {/* Added color */}
        <p className="desc text-gray-700">{`Variation: ${variationDisplay}`}</p>
        <p className="desc text-gray-700">{`Equipment: ${equipmentDisplay}`}</p>
      </div>
    );
  }

  return null;
};

const Analytics = () => {
  // Get workout history for stats calculation
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  
  // Fetch user ID directly
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
      const fetchUser = async () => {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) {
              console.error("Error fetching user for analytics:", error);
          } else {
              setUserId(user?.id ?? null);
          }
      };
      fetchUser();
  }, []); // Run once on mount

  // Fetch list of all exercises for the dropdown selector
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
  });
  
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [allCombinationKeys, setAllCombinationKeys] = useState<string[]>([]);
  const [activeCombinationKeys, setActiveCombinationKeys] = useState<string[]>([]);

  // Fetch max e1RM history using TanStack Query and the Supabase function
  const { 
      data: maxE1RMHistory = [], 
      isLoading: isLoadingHistory, 
      error: errorHistory 
  } = useQuery({
      queryKey: ['maxE1RMHistory', selectedExercise?.id, userId],
      queryFn: async () => {
          if (!userId || !selectedExercise?.id) return []; 
          return fetchMaxE1RMHistory(userId, selectedExercise.id);
      },
      enabled: !!userId && !!selectedExercise?.id, // Only run query when user and exercise are selected
      staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
  });

  // Process the fetched maxE1RMHistory to group by combination and update keys
  useEffect(() => {
      if (!maxE1RMHistory || maxE1RMHistory.length === 0) {
          setAllCombinationKeys([]);
          setActiveCombinationKeys([]);
          return;
      }

      const uniqueKeys = new Set<string>();
      const keyFrequency: Record<string, number> = {};

      maxE1RMHistory.forEach(item => {
          const key = getCombinationKey(item.variation, item.equipment_type);
          uniqueKeys.add(key);
          keyFrequency[key] = (keyFrequency[key] || 0) + 1;
      });

      // Sort keys: prioritize "Default" variations, then sort alphabetically
      const sortedKeys = Array.from(uniqueKeys).sort((a, b) => {
          const aIsDefault = a.startsWith('Default|');
          const bIsDefault = b.startsWith('Default|');

          if (aIsDefault && !bIsDefault) {
              return -1; // a comes first
          }
          if (!aIsDefault && bIsDefault) {
              return 1; // b comes first
          }
          // If both are default or both are not, sort alphabetically
          return a.localeCompare(b);
      });
      setAllCombinationKeys(sortedKeys);

      // Find the most frequent key to activate by default
      let mostFrequentKey: string | null = null;
      let maxFreq = 0;
      Object.entries(keyFrequency).forEach(([key, freq]) => {
          if (freq > maxFreq) {
              maxFreq = freq;
              mostFrequentKey = key;
          }
      });
      
      setActiveCombinationKeys(mostFrequentKey ? [mostFrequentKey] : (sortedKeys.length > 0 ? [sortedKeys[0]] : []));
  }, [maxE1RMHistory]); 

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

  // Format date for XAxis
  const formatAxisDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Simple format like MM/DD
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  // Prepare data for the chart, grouped by combination key
  const chartData = useMemo((): ChartData => {
      const groupedData: ChartData = {};

      maxE1RMHistory.forEach(item => {
          const key = getCombinationKey(item.variation, item.equipment_type);
          if (!groupedData[key]) {
              groupedData[key] = [];
          }
          // Add the data point (date and max_e1rm)
          groupedData[key].push({ 
              workout_date: item.workout_date, 
              max_e1rm: item.max_e1rm 
          });
      });

      // Sort data points within each combination by date
      Object.keys(groupedData).forEach(key => {
          groupedData[key].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime());
      });

      return groupedData;
  }, [maxE1RMHistory]);

  // Define colors for chart lines (add more if needed)
  const lineColors = [
    "#3B82F6", // Use fitnessBlue for the first line
    "#82ca9d", 
    "#ffc658", 
    "#ff7300", 
    "#387908", 
    "#0088FE", 
    "#00C49F", 
    "#FFBB28", 
    "#FF8042", 
    "#a4de6c",
  ];

  return (
    <div className="container mx-auto p-4 max-w-4xl"> {/* Increased max-width */}
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessIndigo">Your Analytics</h1>
        <p className="text-gray-600 mb-6">Track your progress and visualize your gains</p>
      </header>

      <main>
        <h2 className="text-2xl font-semibold mb-6">Performance Overview</h2> {/* Added heading */}
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
                <Dumbbell className="mr-2 h-4 w-4 text-fitnessBlue" />
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

        <h2 className="text-2xl font-semibold mb-4">Exercise Progress Analysis</h2> {/* Changed heading */}
        {isLoadingExercises ? (
           <p className="text-gray-500 italic">Loading exercises...</p>
        ) : errorExercises ? (
           <p className="text-red-500 italic">Error loading exercises.</p>
        ) : exercises.length > 0 ? (
          <Card className="mb-8"> {/* Wrap selection and chart in a card */}
            <CardHeader>
                 <CardTitle>Select Exercise</CardTitle>
                 <CardDescription>Choose an exercise to analyze its progress over time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6"> {/* Add spacing */}
                <div>
                  {/* <label className="block text-sm font-medium mb-2">Select an exercise</label> */}
                  <select
                    className="w-full p-2 border rounded-md bg-white shadow-sm"
                    value={selectedExercise?.id || ""}
                    onChange={(e) => {
                      const selected = exercises.find(ex => ex.id === e.target.value);
                      setSelectedExercise(selected || null);
                    }}
                  >
                    <option value="">-- Select an Exercise --</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedExercise && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                       <TrendingUp className="mr-2 h-5 w-5" /> Estimated 1RM Progression
                    </h3>
                    {/* Add Loading/Error states for history query */}
                    {isLoadingHistory ? (
                       <p className="text-gray-500 italic text-center py-10">Loading history...</p> 
                    ) : errorHistory ? (
                       <p className="text-red-500 italic text-center py-10">Error loading history: {errorHistory.message}</p> 
                    ) : maxE1RMHistory.length > 0 && Object.keys(chartData).length > 0 ? ( // Check if there's processed data
                       <ResponsiveContainer width="100%" height={400}>
                           {/* Use the derived chartData */}
                           <LineChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}> 
                               <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.25)" /> 
                               {/* Update XAxis dataKey */}
                               <XAxis 
                                   dataKey="workout_date" 
                                   tickFormatter={formatAxisDate} 
                                   domain={['dataMin', 'dataMax']}
                                   type="category" 
                                   allowDuplicatedCategory={true}
                                   tick={{ fontSize: 12 }}
                                   padding={{ left: 10, right: 10 }} 
                               />
                               <YAxis 
                                   // Rename label, use max_e1rm
                                   label={{ value: 'Max e1RM (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dx: -10 }} 
                                   tick={{ fontSize: 12 }}
                                   domain={['auto', 'auto']} 
                                   dataKey="max_e1rm" // Point YAxis to the correct data key implicitly if needed
                               />
                               {/* Use the custom tooltip */}
                               <Tooltip 
                                    content={<CustomTooltip />} // Use the custom component
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} // Customize cursor
                               />
                               {/* Legend logic remains largely the same, using allCombinationKeys and activeCombinationKeys */}
                               <Legend 
                                  onClick={(data) => {
                                      const key = data.value.replace(' - ', '|'); 
                                      setActiveCombinationKeys(prevKeys => 
                                          prevKeys.includes(key) ? prevKeys.filter(k => k !== key) : [...prevKeys, key]
                                      );
                                  }}
                                  formatter={(value, entry) => {
                                      const key = value.replace(' - ', '|'); 
                                      const isActive = activeCombinationKeys.includes(key);
                                      const color = isActive ? entry.color : '#9ca3af'; 
                                      return <span style={{ color, cursor: 'pointer' }}>{value}</span>;
                                  }}
                                  payload={
                                      allCombinationKeys.map((key, index) => ({
                                          id: key,
                                          type: 'line',
                                          value: key.replace('|', ' - '), 
                                          color: lineColors[index % lineColors.length], 
                                      }))
                                  }
                                  wrapperStyle={{ paddingTop: '20px' }} 
                               />
                               {/* Map over the chartData (grouped data) */}
                               {Object.entries(chartData).map(([key, dataPoints]) => {
                                    const colorIndex = allCombinationKeys.indexOf(key); 
                                    // Only render lines for active keys
                                    if (!activeCombinationKeys.includes(key)) return null; 
                                    return (
                                        <Line 
                                            key={key} 
                                            type="monotone" 
                                            data={dataPoints} // Use the grouped data points
                                            dataKey="max_e1rm" // Use the correct data key
                                            name={key.replace('|', ' - ')} 
                                            stroke={lineColors[colorIndex % lineColors.length]} 
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }} 
                                        />
                                    );
                               })}
                           </LineChart>
                       </ResponsiveContainer>
                    ) : (
                      // Updated message for no data after successful fetch
                      <p className="text-gray-500 italic text-center py-10">
                          No estimated 1RM history found for this exercise. Complete some sets!
                      </p>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        ) : (
          <p className="text-gray-500 italic">No exercises defined yet. Add some via the workout screen.</p>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Workouts</h2>
          {/* Handle cases where exercises might still be loading */}
          {workoutHistory.length > 0 ? (
            <div className="space-y-4">
              {[...workoutHistory].slice(0, 5).map((workout, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>Workout on {formatDate(workout.date)}</span>
                      <span className="text-sm font-normal flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatTime(workout.duration)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workout.exercises.map((ex, i) => {
                        // Find exercise name using the fetched data
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
