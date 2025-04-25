import React, { useState, useMemo, useEffect } from 'react';
// import { useWorkout } from '@/state/workout/WorkoutContext'; // Remove old context
import { useAppSelector } from "@/hooks/redux"; // Import Redux hooks
import { selectWorkoutHistory } from "@/state/history/historySlice"; // Import history selector
// import { selectAllExercises } from "@/state/exercise/exerciseSlice"; // Remove exercise selector import
import { useQuery } from '@tanstack/react-query'; // Add TanStack Query import
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Add Supabase function import
import { formatTime } from '@/lib/utils/timeUtils';
import { calculateE1RM } from '@/lib/utils/workoutUtils'; // Import e1RM calculation
import { BarChart, Clock, Calendar, Dumbbell, Award, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/core/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
// import { useState } from "react"; // Already imported above
import { Exercise, ExerciseSet, Workout, WorkoutExercise } from "@/lib/types/workout";
import { EquipmentType } from "@/lib/types/enums"; // Import EquipmentType
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';
import { Checkbox } from "@/components/core/checkbox"; // Import Checkbox
import { Label } from "@/components/core/label"; // Import Label

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

// Helper function to create a unique key for combination
const getCombinationKey = (
    variation?: string | null, 
    equipmentType?: EquipmentType | string | null
): string => {
    const varPart = variation || 'Default';
    const eqPart = equipmentType || 'Default';
    return `${varPart}|${eqPart}`;
};

const Analytics = () => {
  // const { workoutHistory, exercises } = useWorkout(); // Remove old context usage
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  // const exercises = useAppSelector(selectAllExercises); // Removed

  // Fetch exercises using TanStack Query
  const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercisesFromDB,
  });
  
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [processedHistory, setProcessedHistory] = useState<ProcessedHistory>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ variations: [], equipmentTypes: [] });
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({ variations: [], equipmentTypes: [] });

  // Recalculate statistics based on Redux state
  const stats = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    const totalTime = workoutHistory.reduce((sum, workout) => sum + workout.duration, 0);
    const averageTime = totalWorkouts > 0 ? totalTime / totalWorkouts : 0;

    const exerciseCounts: Record<string, number> = {};
    workoutHistory.forEach(workout => {
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

  // Find the most common exercise using the fetched data and calculated stats
  const mostCommonExercise = useMemo(() => {
      if (isLoadingExercises || !exercises) return null;
      return exercises.find(ex => ex.id === stats.mostCommonExerciseId);
  }, [exercises, stats.mostCommonExerciseId, isLoadingExercises]);

  // Process exercise history when selected exercise or workout history changes
  useEffect(() => {
    if (!selectedExercise || workoutHistory.length === 0) {
      setProcessedHistory({});
      setFilterOptions({ variations: [], equipmentTypes: [] });
      setSelectedFilters({ variations: [], equipmentTypes: [] });
      return;
    }

    const history: ProcessedHistory = {};
    const uniqueVariations = new Set<string>();
    const uniqueEquipmentTypes = new Set<string>();
    let defaultVariation: string | null = null;
    let defaultEquipment: string | null = null;
    let mostFrequentKey: string | null = null;
    const keyFrequency: Record<string, number> = {};


    workoutHistory.forEach(workout => {
      workout.exercises.forEach((workoutEx: WorkoutExercise) => {
        if (workoutEx.exerciseId === selectedExercise.id) {
           // Use workout-level defaults if available
           const workoutVar = workoutEx.variation;
           const workoutEq = workoutEx.equipmentType;

          workoutEx.sets.forEach((set: ExerciseSet) => {
            if (set.completed && set.weight > 0 && set.reps > 0) {
              const setVar = set.variation ?? workoutVar; // Set overrides workout
              const setEq = set.equipmentType ?? workoutEq; // Set overrides workout
              const e1RM = calculateE1RM(set.weight, set.reps);

              // Add to unique sets for filtering
              uniqueVariations.add(setVar || 'Default'); 
              uniqueEquipmentTypes.add(setEq || 'Default');

              const combinationKey = getCombinationKey(setVar, setEq);
              
              if (!history[combinationKey]) {
                history[combinationKey] = [];
              }

              // Add data point if e1RM is valid
              if (e1RM > 0) {
                  history[combinationKey].push({
                    date: workout.date, // Use the workout date string directly
                    e1RM: e1RM,
                    variation: setVar,
                    equipmentType: setEq,
                  });
              }
              
              // Track frequency to find the default display
              keyFrequency[combinationKey] = (keyFrequency[combinationKey] || 0) + 1;

            }
          });
        }
      });
    });

    // Sort data points within each combination by date
    Object.keys(history).forEach(key => {
      history[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    
    // Determine the most frequent combination to select by default
    let maxFreq = 0;
    Object.entries(keyFrequency).forEach(([key, freq]) => {
        if (freq > maxFreq) {
            maxFreq = freq;
            mostFrequentKey = key;
        }
    });
    
    // Extract default var/eq from the most frequent key
    if (mostFrequentKey) {
        const [defVar, defEq] = mostFrequentKey.split('|');
        defaultVariation = defVar === 'Default' ? null : defVar;
        defaultEquipment = defEq === 'Default' ? null : defEq;
    }


    setProcessedHistory(history);
    const variationsArray = Array.from(uniqueVariations).sort();
    const equipmentTypesArray = Array.from(uniqueEquipmentTypes).sort();
    setFilterOptions({ 
        variations: variationsArray, 
        equipmentTypes: equipmentTypesArray 
    });
    
    // Set default selected filters based on the most frequent combination
     setSelectedFilters({
        variations: defaultVariation ? [defaultVariation] : (variationsArray.includes('Default') ? ['Default'] : []),
        equipmentTypes: defaultEquipment ? [defaultEquipment] : (equipmentTypesArray.includes('Default') ? ['Default'] : []),
     });


  }, [selectedExercise, workoutHistory]);

  // Format date for XAxis
  const formatAxisDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Simple format like MM/DD
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  // Handle filter changes
  const handleFilterChange = (type: 'variations' | 'equipmentTypes', value: string, checked: boolean) => {
      setSelectedFilters(prev => ({
          ...prev,
          [type]: checked 
              ? [...prev[type], value] // Add value if checked
              : prev[type].filter(item => item !== value) // Remove value if unchecked
      }));
  };

  // Filter data based on selected filters for the chart
  const chartData = useMemo(() => {
      const filteredData: ProcessedHistory = {};
      const activeCombinationKeys = new Set<string>();

      // Determine all combinations matching selected filters
      selectedFilters.variations.forEach(v => {
          selectedFilters.equipmentTypes.forEach(e => {
              activeCombinationKeys.add(getCombinationKey(v === 'Default' ? null : v, e === 'Default' ? null : e));
          });
      });

      // Include data for active combinations
       Object.entries(processedHistory).forEach(([key, dataPoints]) => {
            if (activeCombinationKeys.has(key)) {
                filteredData[key] = dataPoints;
            }
       });

      return filteredData;
  }, [processedHistory, selectedFilters]);

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

  return (
    <div className="container mx-auto p-4 max-w-4xl"> {/* Increased max-width */}
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
                    <h3 className="text-lg font-medium mb-4">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Variation Filters */}
                         <div>
                             <h4 className="text-md font-semibold mb-3">Variations</h4>
                             <div className="space-y-2">
                                 {filterOptions.variations.length > 0 ? filterOptions.variations.map(variation => (
                                     <div key={variation} className="flex items-center space-x-2">
                                         <Checkbox 
                                             id={`var-${variation}`} 
                                             checked={selectedFilters.variations.includes(variation)}
                                             onCheckedChange={(checked) => handleFilterChange('variations', variation, !!checked)}
                                         />
                                         <Label htmlFor={`var-${variation}`} className="cursor-pointer">
                                             {variation}
                                         </Label>
                                     </div>
                                 )) : <p className="text-sm text-gray-500 italic">No variations recorded.</p>}
                             </div>
                         </div>

                        {/* Equipment Type Filters */}
                         <div>
                             <h4 className="text-md font-semibold mb-3">Equipment Types</h4>
                             <div className="space-y-2">
                                 {filterOptions.equipmentTypes.length > 0 ? filterOptions.equipmentTypes.map(eqType => (
                                     <div key={eqType} className="flex items-center space-x-2">
                                         <Checkbox 
                                             id={`eq-${eqType}`} 
                                             checked={selectedFilters.equipmentTypes.includes(eqType)}
                                             onCheckedChange={(checked) => handleFilterChange('equipmentTypes', eqType, !!checked)}
                                         />
                                         <Label htmlFor={`eq-${eqType}`} className="cursor-pointer">
                                             {eqType}
                                         </Label>
                                     </div>
                                 )) : <p className="text-sm text-gray-500 italic">No equipment types recorded.</p>}
                             </div>
                         </div>
                    </div>


                    <h3 className="text-lg font-medium mb-4 flex items-center">
                       <TrendingUp className="mr-2 h-5 w-5" /> Estimated 1RM Progression
                    </h3>
                    {Object.keys(chartData).length > 0 ? (
                       <ResponsiveContainer width="100%" height={400}>
                           <LineChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}> {/* Increased left margin */}
                               <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.25)" /> {/* Lighter grid lines with 25% opacity */}
                               <XAxis 
                                   dataKey="date" 
                                   tickFormatter={formatAxisDate} 
                                   // Find the dates from all visible series for the domain
                                   domain={['dataMin', 'dataMax']}
                                   type="category" // Treat date strings as categories initially
                                   allowDuplicatedCategory={true}
                                   tick={{ fontSize: 12 }}
                                   padding={{ left: 10, right: 10 }} // Add padding
                               />
                               <YAxis 
                                   label={{ value: 'e1RM (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dx: -10 }} // Added Y-axis label
                                   tick={{ fontSize: 12 }}
                                   domain={['auto', 'auto']} // Auto-adjust Y-axis domain
                               />
                               <Tooltip 
                                    formatter={(value: number, name: string, props) => [`${value} kg`, name]} 
                                    labelFormatter={(label) => `Date: ${formatDate(label)}`} // Format tooltip label
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '4px', border: '1px solid #ccc' }}
                               />
                               <Legend />
                               {Object.entries(chartData).map(([key, dataPoints], index) => (
                                   <Line 
                                       key={key} 
                                       type="monotone" 
                                       data={dataPoints} 
                                       dataKey="e1RM" 
                                       name={key.replace('|', ' - ')} // Make legend name more readable
                                       stroke={lineColors[index % lineColors.length]} // Cycle through colors
                                       strokeWidth={2}
                                       dot={{ r: 4 }}
                                       activeDot={{ r: 6 }} 
                                   />
                               ))}
                           </LineChart>
                       </ResponsiveContainer>
                    ) : (
                      <p className="text-gray-500 italic text-center py-10">
                          No data available for the selected exercise and filters. Complete some sets!
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
