import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMaxE1RMHistory } from '@/lib/integrations/supabase/history';
import { Exercise } from '@/lib/types/workout';
import { EquipmentType } from "@/lib/types/enums";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { TrendingUp } from "lucide-react";
import { DailyMaxE1RM } from '@/lib/types/analytics'; // Assuming this type lives here or is moved

// Define structure for unified chart data point
interface UnifiedDataPoint {
  workout_date: string;
  [combinationKey: string]: number | string | undefined | null; // Allows string for date, number for e1RM
}

// Props interface
interface ExerciseProgressAnalysisProps {
    userId: string | undefined;
    exercises: Exercise[];
    isLoadingExercises: boolean;
    errorExercises: Error | null;
}

// Helper function to create a unique key for combination
const getCombinationKey = (
    variation?: string | null,
    equipmentType?: string | null // Now just string as returned from DB
): string => {
    const varPart = (!variation || variation.toLowerCase() === 'standard') ? 'Default' : variation;
    const eqPart = equipmentType || 'Default';
    return `${varPart}|${eqPart}`;
};

// Format date for display (e.g., in Tooltip)
const formatDate = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
      return "Invalid Date";
  }
  return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
  });
};

// Format date for XAxis
const formatAxisDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Simple format like MM/DD
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = label; // workout_date passed as label

    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded shadow-lg text-sm space-y-1">
        <p className="label font-semibold mb-1">{`Date: ${formatDate(date)}`}</p>
        {payload.map((entry: any, index: number) => {
          const name = entry.name;
          const value = entry.value;
          const color = entry.color;

          if (name == null || value == null) {
            return null;
          }

          const parts = name.split(' - ');
          const variation = parts[0] || 'Unknown';
          const equipmentType = parts[1] || 'Unknown';

          const variationDisplay = variation === 'Default' ? 'Standard' : variation;
          const equipmentDisplay = equipmentType === 'Default' ? 'Default' : equipmentType;

          return (
            <div key={index} className="tooltip-entry">
              <p className="intro font-medium" style={{ color: color }}>
                {`${variationDisplay} (${equipmentDisplay}): ~${value.toFixed(1)} kg`}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

// Define colors for chart lines
const lineColors = [
    "#3B82F6", "#82ca9d", "#ffc658", "#ff7300", "#387908",
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#a4de6c",
];

const ExerciseProgressAnalysis: React.FC<ExerciseProgressAnalysisProps> = ({
    userId,
    exercises,
    isLoadingExercises,
    errorExercises,
}) => {
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [allCombinationKeys, setAllCombinationKeys] = useState<string[]>([]);
    const [activeCombinationKeys, setActiveCombinationKeys] = useState<string[]>([]);

    // Fetch max e1RM history using TanStack Query and the Supabase function
    const {
        data: maxE1RMHistory = [],
        isLoading: isLoadingHistory,
        error: errorHistory
    } = useQuery<DailyMaxE1RM[], Error>({ // Explicitly type query
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

        const sortedKeys = Array.from(uniqueKeys).sort((a, b) => {
            const aIsDefault = a.startsWith('Default|');
            const bIsDefault = b.startsWith('Default|');
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            return a.localeCompare(b);
        });
        setAllCombinationKeys(sortedKeys);

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

    // Prepare UNIFIED data for the chart
    const chartData = useMemo((): UnifiedDataPoint[] => {
        if (!maxE1RMHistory || maxE1RMHistory.length === 0) return [];

        const allDates = Array.from(new Set(maxE1RMHistory.map(item => item.workout_date)))
                              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const unifiedData: UnifiedDataPoint[] = allDates.map(date => ({ workout_date: date }));

        maxE1RMHistory.forEach(item => {
            const key = getCombinationKey(item.variation, item.equipment_type);
            const dateIndex = unifiedData.findIndex(d => d.workout_date === item.workout_date);
            if (dateIndex !== -1) {
                unifiedData[dateIndex][key] = item.max_e1rm;
            }
        });

        return unifiedData;
    }, [maxE1RMHistory]);

    return (
        <>
            <h2 className="text-2xl font-semibold mb-4">Exercise Progress Analysis</h2>
            {isLoadingExercises ? (
                <p className="text-gray-500 italic">Loading exercises...</p>
            ) : errorExercises ? (
                <p className="text-red-500 italic">Error loading exercises.</p>
            ) : exercises.length > 0 ? (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Select Exercise</CardTitle>
                        <CardDescription>Choose an exercise to analyze its progress over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <select
                                className="w-full p-2 border rounded-md bg-white shadow-sm"
                                value={selectedExercise?.id || ""}
                                onChange={(e) => {
                                    const selected = exercises.find(ex => ex.id === e.target.value);
                                    setSelectedExercise(selected || null);
                                }}
                                disabled={isLoadingExercises} // Disable while loading
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
                                {isLoadingHistory ? (
                                    <p className="text-gray-500 italic text-center py-10">Loading history...</p>
                                ) : errorHistory ? (
                                    <p className="text-red-500 italic text-center py-10">Error loading history: {errorHistory.message}</p>
                                ) : maxE1RMHistory.length > 0 && chartData.length > 0 ? ( // Check chartData length too
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.25)" />
                                            <XAxis
                                                dataKey="workout_date"
                                                tickFormatter={formatAxisDate}
                                                type="category"
                                                tick={{ fontSize: 12 }}
                                                padding={{ left: 10, right: 10 }}
                                            />
                                            <YAxis
                                                label={{ value: 'Max e1RM (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, dx: -10 }}
                                                tick={{ fontSize: 12 }}
                                                domain={['auto', 'auto']}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            />
                                            <Legend
                                                onClick={(data) => {
                                                    const key = data.id;
                                                    setActiveCombinationKeys(prevKeys =>
                                                        prevKeys.includes(key) ? prevKeys.filter(k => k !== key) : [...prevKeys, key]
                                                    );
                                                }}
                                                formatter={(value, entry: any) => {
                                                    const key = entry.id;
                                                    const isActive = activeCombinationKeys.includes(key);
                                                    const color = isActive ? entry.color : '#9ca3af';
                                                    return <span style={{ color, cursor: 'pointer' }}>{value}</span>;
                                                }}
                                                payload={
                                                    allCombinationKeys.map((key, index) => {
                                                        const displayValue = key.startsWith('Default|')
                                                            ? key.replace('Default|', 'Standard - ')
                                                            : key.replace('|', ' - ');

                                                        return {
                                                            id: key,
                                                            type: 'line',
                                                            value: displayValue,
                                                            color: lineColors[index % lineColors.length],
                                                        }
                                                    })
                                                }
                                                wrapperStyle={{ paddingTop: '20px' }}
                                            />
                                            {allCombinationKeys.map((key) => {
                                                const colorIndex = allCombinationKeys.indexOf(key);
                                                if (!activeCombinationKeys.includes(key)) return null;
                                                return (
                                                    <Line
                                                        key={key}
                                                        type="monotone"
                                                        dataKey={key}
                                                        name={key.replace('|', ' - ')}
                                                        stroke={lineColors[colorIndex % lineColors.length]}
                                                        strokeWidth={2}
                                                        dot={{ r: 4, fill: lineColors[colorIndex % lineColors.length] }}
                                                        activeDot={{ r: 6 }}
                                                        connectNulls
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
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
        </>
    );
};

export default ExerciseProgressAnalysis; 