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

// Define structure for unified chart data point
interface UnifiedDataPoint {
  workout_date: string;
  [combinationKey: string]: number | string | undefined | null; // Allows string for date, number for e1RM
}

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
    const date = label; // workout_date passed as label

    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded shadow-lg text-sm space-y-1"> {/* Added space-y-1 */}
        <p className="label font-semibold mb-1">{`Date: ${formatDate(date)}`}</p>
        {/* Iterate through all items in payload */} 
        {payload.map((entry: any, index: number) => {
          const name = entry.name; // "Variation - EquipmentType"
          const value = entry.value; // max_e1rm
          const color = entry.color; // Get line color

          // Ensure name and value exist before processing
          if (name == null || value == null) {
            return null; // Don't render if data is missing
          }

          // Split by hyphen now
          const parts = name.split(' - ');
          const variation = parts[0] || 'Unknown'; 
          const equipmentType = parts[1] || 'Unknown';

          // Handle display names for "Default"
          const variationDisplay = variation === 'Default' ? 'Standard' : variation;
          const equipmentDisplay = equipmentType === 'Default' ? 'Default' : equipmentType; 
          
          return (
            <div key={index} className="tooltip-entry"> {/* Wrap each entry */} 
              <p className="intro font-medium" style={{ color: color }}> {/* Use line color */} 
                {`${variationDisplay} (${equipmentDisplay}): ~${value.toFixed(1)} kg`}
              </p>
              {/* <p className="desc text-gray-700">{`Variation: ${variationDisplay}`}</p>
              <p className="desc text-gray-700">{`Equipment: ${equipmentDisplay}`}</p> */}
            </div>
          );
        })}
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
  
  // Prepare UNIFIED data for the chart
  const chartData = useMemo((): UnifiedDataPoint[] => {
      if (!maxE1RMHistory || maxE1RMHistory.length === 0) return [];

      // 1. Get all unique dates and sort them
      const allDates = Array.from(new Set(maxE1RMHistory.map(item => item.workout_date)))
                            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // 2. Create base structure: { workout_date: date }
      const unifiedData: UnifiedDataPoint[] = allDates.map(date => ({ workout_date: date }));

      // 3. Populate with e1RM data for each combination
      maxE1RMHistory.forEach(item => {
          const key = getCombinationKey(item.variation, item.equipment_type);
          const dateIndex = unifiedData.findIndex(d => d.workout_date === item.workout_date);
          if (dateIndex !== -1) {
              // Add the e1RM value under its combination key
              unifiedData[dateIndex][key] = item.max_e1rm;
          }
      });

      return unifiedData;
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
                           {/* Use the UNIFIED chartData */}
                           <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}> 
                               <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.25)" /> 
                               {/* Update XAxis config */}
                               <XAxis 
                                   dataKey="workout_date" 
                                   tickFormatter={formatAxisDate} 
                                   // domain removed - let Recharts calculate from unified data
                                   type="category" 
                                   // allowDuplicatedCategory removed
                                   tick={{ fontSize: 12 }}
                                   padding={{ left: 10, right: 10 }} 
                               />
                               <YAxis 
                                   // Rename label, use max_e1rm
                                   label={{ value: 'Max e1RM (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dx: -10 }} 
                                   tick={{ fontSize: 12 }}
                                   domain={['auto', 'auto']} 
                                   // dataKey removed - inferred from Lines
                               />
                               {/* Use the custom tooltip */}
                               <Tooltip 
                                    content={<CustomTooltip />} // Use the custom component
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} // Customize cursor
                               />
                               {/* Legend logic remains largely the same, using allCombinationKeys and activeCombinationKeys */}
                               <Legend 
                                  onClick={(data) => {
                                      // Key extraction needs to use the ID from the payload, which is the original combination key
                                      const key = data.id; // Use data.id which holds the original key
                                      setActiveCombinationKeys(prevKeys => 
                                          prevKeys.includes(key) ? prevKeys.filter(k => k !== key) : [...prevKeys, key]
                                      );
                                  }}
                                  formatter={(value, entry: any) => { // Added :any to entry to bypass TS check temporarily if needed, better fix below
                                      // Key extraction needs to use the ID from the payload
                                      const key = entry.id; // Use entry.id which holds the original key, not entry.payload.id
                                      const isActive = activeCombinationKeys.includes(key);
                                      const color = isActive ? entry.color : '#9ca3af'; 
                                      // Value is already formatted as 'Variation - Equipment'
                                      return <span style={{ color, cursor: 'pointer' }}>{value}</span>;
                                  }}
                                  payload={
                                      allCombinationKeys.map((key, index) => {
                                          // Generate display value: Replace 'Default' with 'Standard' for legend
                                          const displayValue = key.startsWith('Default|')
                                              ? key.replace('Default|', 'Standard - ')
                                              : key.replace('|', ' - ');
                                          
                                          return {
                                              id: key, // The unique combination key (e.g., Default|BB)
                                              type: 'line',
                                              value: displayValue, // Use the generated display value
                                              color: lineColors[index % lineColors.length], 
                                          }
                                      })
                                  }
                                  wrapperStyle={{ paddingTop: '20px' }} 
                               />
                               {/* Map over the allCombinationKeys to render lines */}
                               {allCombinationKeys.map((key) => {
                                    const colorIndex = allCombinationKeys.indexOf(key); 
                                    // Only render lines for active keys
                                    if (!activeCombinationKeys.includes(key)) return null; 
                                    return (
                                        <Line 
                                            key={key} 
                                            type="monotone" 
                                            // data prop removed - uses chart data
                                            dataKey={key} // Use the combination key as dataKey 
                                            name={key.replace('|', ' - ')} // Keep name for Tooltip/Legend formatting
                                            stroke={lineColors[colorIndex % lineColors.length]} 
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: lineColors[colorIndex % lineColors.length] }} // Ensure default dot is visible and filled with line color
                                            activeDot={{ r: 6 }} // Slightly larger dot on hover
                                            connectNulls // Connect line segments across null data points
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
