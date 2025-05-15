import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMaxE1RMHistory } from '@/lib/integrations/supabase/history';
import { Exercise } from '@/lib/types/workout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { TrendingUp } from "lucide-react";
import { DailyMaxE1RM } from '@/lib/types/analytics'; // Assuming this type lives here or is moved
import { Button } from "@/components/core/button"; // Add Button import
import { ChevronDown } from "lucide-react"; // Import ChevronDown icon

// Define structure for unified chart data point
interface UnifiedDataPoint {
  workout_timestamp: number; // Use timestamp for numerical axis
  workout_date: string; // Keep original date string for potential reference
  [combinationKey: string]: number | string | undefined | null | Record<string, string | undefined>; // Allow for _originalEquipment
  _originalEquipment?: {
    [combinationKey: string]: string | undefined;
  };
}

// Props interface - RENAMED
interface OneRepMaxProps {
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
    let eqPart = equipmentType || 'Default';
    if (equipmentType === 'Dumbbell' || equipmentType === 'Kettlebell') {
        eqPart = 'DB_KB_COMBO'; // Combined identifier
    }
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

// Format date for XAxis (accepts timestamp)
// Modified to accept timeRange and format '1Y' ticks as month initials
const formatAxisDate = (timestamp: number, timeRange?: TimeRange): string => {
    const date = new Date(timestamp);
    if (timeRange === '1Y') {
        // Use UTC month to be consistent with tick generation
        const monthIndex = date.getUTCMonth();
        // Array of first letters
        const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
        return monthInitials[monthIndex];
    } else {
        // Use UTC day/month for consistency (Recharts passes UTC timestamps)
        // Use getUTCDate() instead of getDate()
        return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    }
};

// Custom Tooltip Component - Use timestamp to get date
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const timestamp = label; // Label is now the timestamp
    const date = new Date(timestamp);

    return (
      <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded shadow-lg text-sm space-y-1">
        <p className="label font-semibold mb-1">{`Date: ${formatDate(date)}`}</p> {/* Use original formatDate here */}
        {payload.map((entry: any, index: number) => {
          const name = entry.name; // e.g., "Standard - DB/KB"
          const value = entry.value;
          const color = entry.color;
          const dataKey = entry.dataKey; // e.g., "Default|DB_KB_COMBO"
          const pointData = entry.payload; // The UnifiedDataPoint for this timestamp

          if (name == null || value == null) {
            return null;
          }

          const parts = name.split(' - ');
          const variation = parts[0] || 'Unknown';
          const equipmentTypeFromDisplayName = parts[1] || 'Unknown'; // This will be "DB/KB" or other equipment

          const variationDisplay = variation === 'Default' ? 'Standard' : variation;
          let equipmentDisplay = equipmentTypeFromDisplayName;

          // If this line is the combined DB/KB, try to get the original equipment type
          if (equipmentTypeFromDisplayName === 'DB/KB' && 
              pointData._originalEquipment && 
              pointData._originalEquipment[dataKey]) {
            const originalEquipment = pointData._originalEquipment[dataKey];
            if (originalEquipment === 'Dumbbell' || originalEquipment === 'Kettlebell') {
                equipmentDisplay = originalEquipment; // Show 'Dumbbell' or 'Kettlebell'
            }
          } else if (equipmentTypeFromDisplayName === 'Default') {
            // Handle cases where original equipment was 'Default' (e.g. Bodyweight)
            // and not part of DB/KB combo, but might appear as 'Default' in legend.
            // If _originalEquipment exists and has a value for this key, prefer it.
            if (pointData._originalEquipment && pointData._originalEquipment[dataKey]) {
                const originalEq = pointData._originalEquipment[dataKey];
                if (originalEq && originalEq !== 'Default') { // Avoid showing "Default" if more specific is known
                    equipmentDisplay = originalEq;
                } else {
                     equipmentDisplay = 'Bodyweight'; // Or a suitable default for 'Default' equipment
                }
            } else if (equipmentTypeFromDisplayName === 'Default' && dataKey && !dataKey.includes('|Default')) { 
                // If display name says "Default" but key isn't specific, assume bodyweight or similar
                // This condition might need refinement based on how 'Default' equipment is keyed
            }
             else {
                equipmentDisplay = equipmentTypeFromDisplayName === 'Default' ? 'Default' : equipmentTypeFromDisplayName;
            }
          }


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

// Define time range options
type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
const timeRangeOptions: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

// Component - RENAMED
const OneRepMax: React.FC<OneRepMaxProps> = ({
    userId,
    exercises,
    isLoadingExercises,
    errorExercises,
}) => {
    const SELECTED_EXERCISE_STORAGE_KEY = 'selectedAnalyticsExerciseId';

    // Initialize selectedExercise from localStorage or null
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(() => {
        if (isLoadingExercises || !exercises || exercises.length === 0) {
            return null; // Cannot determine initial state if exercises aren't loaded
        }
        try {
            const storedId = localStorage.getItem(SELECTED_EXERCISE_STORAGE_KEY);
            if (storedId) {
                const foundExercise = exercises.find(ex => ex.id === storedId);
                return foundExercise || null; // Return found exercise or null if ID is stale
            }
        } catch (error) {
            console.error("Error reading selected exercise from localStorage:", error);
        }
        return null; // Default to null if nothing stored or error
    });

    const [allCombinationKeys, setAllCombinationKeys] = useState<string[]>([]);
    const [activeCombinationKeys, setActiveCombinationKeys] = useState<string[]>([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('ALL'); // State for time range

    // Effect to save selected exercise ID to localStorage
    useEffect(() => {
        try {
            if (selectedExercise) {
                localStorage.setItem(SELECTED_EXERCISE_STORAGE_KEY, selectedExercise.id);
            } else {
                // Optionally remove if deselected, or just let the initializer handle null
                // localStorage.removeItem(SELECTED_EXERCISE_STORAGE_KEY);
            }
        } catch (error) {
            console.error("Error saving selected exercise to localStorage:", error);
        }
    }, [selectedExercise]);

    // Effect to update selectedExercise if exercises list changes (e.g., initial load after localStorage read)
    useEffect(() => {
        if (!selectedExercise && !isLoadingExercises && exercises && exercises.length > 0) {
            try {
                const storedId = localStorage.getItem(SELECTED_EXERCISE_STORAGE_KEY);
                if (storedId) {
                    const foundExercise = exercises.find(ex => ex.id === storedId);
                    if (foundExercise) {
                        setSelectedExercise(foundExercise);
                    }
                }
            } catch (error) {
                console.error("Error re-checking selected exercise from localStorage:", error);
            }
        }
        // If exercises are loaded but no exercise is selected and nothing is in storage, maybe select the first? (Optional)
        // else if (!selectedExercise && !isLoadingExercises && exercises && exercises.length > 0) {
        //     const storedId = localStorage.getItem(SELECTED_EXERCISE_STORAGE_KEY);
        //     if (!storedId) {
        //         // setSelectedExercise(exercises[0]); // Uncomment to select first exercise by default
        //     }
        // }
    }, [exercises, isLoadingExercises, selectedExercise]); // Re-run if exercises load

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

    // Process the fetched maxE1RMHistory to group by combination and update keys (based on full history)
    useEffect(() => {
        if (!maxE1RMHistory || maxE1RMHistory.length === 0) {
            // Only update if state is not already empty
            if (allCombinationKeys.length > 0) {
                setAllCombinationKeys([]);
            }
            if (activeCombinationKeys.length > 0) {
                setActiveCombinationKeys([]);
            }
            return;
        }

        const uniqueKeys = new Set<string>();
        const keyFrequency: Record<string, number> = {};

        maxE1RMHistory.forEach(item => {
            const key = getCombinationKey(item.variation, item.equipment_type);
            uniqueKeys.add(key);
            keyFrequency[key] = (keyFrequency[key] || 0) + 1;
        });

        const newSortedKeys = Array.from(uniqueKeys).sort((a, b) => {
            const aIsDefault = a.startsWith('Default|');
            const bIsDefault = b.startsWith('Default|');
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            return a.localeCompare(b);
        });
        // setAllCombinationKeys(sortedKeys); // Old unconditional update

        // Compare new keys with existing state before setting
        // Use stringify for simple array comparison (assumes order matters, which it does due to sorting)
        const didKeysChange = JSON.stringify(newSortedKeys) !== JSON.stringify(allCombinationKeys);
        if (didKeysChange) {
            setAllCombinationKeys(newSortedKeys);
        }


        let mostFrequentKey: string | null = null;
        let maxFreq = 0;
        Object.entries(keyFrequency).forEach(([key, freq]) => {
            if (freq > maxFreq) {
                maxFreq = freq;
                mostFrequentKey = key;
            }
        });

        // Determine the "best" active keys based on the NEW data
        const newActiveKeys = mostFrequentKey ? [mostFrequentKey] : (newSortedKeys.length > 0 ? [newSortedKeys[0]] : []);

        // Update active keys IF the available keys changed OR the calculated "best" active keys changed
        // This ensures that if the available keys change, we re-evaluate which one should be active.
        if (didKeysChange || JSON.stringify(newActiveKeys) !== JSON.stringify(activeCombinationKeys)) {
             setActiveCombinationKeys(newActiveKeys);
        }
        // setActiveCombinationKeys(mostFrequentKey ? [mostFrequentKey] : (sortedKeys.length > 0 ? [sortedKeys[0]] : [])); // Old unconditional update

    }, [maxE1RMHistory]); // Keep dependencies simple: only the input data

    // Calculate date range and prepare data for chart
    const { chartData, domain, ticks } = useMemo(() => {
        if (!maxE1RMHistory) return { chartData: [], domain: [0, 0], ticks: [] };

        // Ensure 'now' and 'endDate' represent UTC midnight
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0); // Use UTC normalization
        const endDate = new Date(now); // endDate is today UTC midnight

        const firstDataPointDateStr = maxE1RMHistory.length > 0 
            ? [...maxE1RMHistory].sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime())[0].workout_date
            : null;

        // Use Date.UTC for parsing the first date string
        let firstDataPointDate: Date;
        if (firstDataPointDateStr) {
            const parts = firstDataPointDateStr.split('-').map(Number); // [YYYY, MM, DD]
            // Month is 0-indexed for Date.UTC
            firstDataPointDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        } else {
            firstDataPointDate = new Date(now); // Default to now if no history
        }

        let startDate = new Date(now); // Default start is today UTC midnight
        // Initialize endDate - will default to today unless 'ALL' range overrides it
        let effectiveEndDate = new Date(endDate); 

        // Find the date of the last data point for the 'ALL' range
        const lastDataPointDateStr = maxE1RMHistory.length > 0
            ? [...maxE1RMHistory].sort((a, b) => new Date(b.workout_date).getTime() - new Date(a.workout_date).getTime())[0].workout_date
            : null;
        let lastDataPointDate: Date | null = null;
        if (lastDataPointDateStr) {
            const parts = lastDataPointDateStr.split('-').map(Number);
            lastDataPointDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        }

        if (selectedTimeRange !== 'ALL') {
            // Use UTC methods for calculating past dates to align with UTC endDate
             switch (selectedTimeRange) {
                case '1W': startDate.setUTCDate(now.getUTCDate() - 7); break;
                case '1M': startDate.setUTCMonth(now.getUTCMonth() - 1); break;
                case '3M': startDate.setUTCMonth(now.getUTCMonth() - 3); break;
                case '6M': startDate.setUTCMonth(now.getUTCMonth() - 6); break;
                case '1Y': startDate.setUTCFullYear(now.getUTCFullYear() - 1); break;
             }
             // No separate normalization needed as we started from UTC midnight and used UTC methods

        } else {
            startDate = new Date(firstDataPointDate); // Use the UTC-parsed first date
            // For 'ALL', set the end date to the last data point's date, if available
            if (lastDataPointDate) {
                effectiveEndDate = new Date(lastDataPointDate); 
            }
        }

        // Generate all dates using UTC to avoid timezone shifts during iteration
        const allDatesInRange: Date[] = [];
        let currentDate = new Date(startDate); // Already UTC midnight or normalized local midnight
        while (currentDate <= effectiveEndDate) { // Use effectiveEndDate
            allDatesInRange.push(new Date(currentDate));
            // Use setUTCDate to avoid potential DST issues if iterating across boundaries
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        // Group history by date string for quick lookup
        const historyByDate: Record<string, DailyMaxE1RM[]> = {};
        maxE1RMHistory.forEach(item => {
            const dateStr = item.workout_date;
            if (!historyByDate[dateStr]) {
                historyByDate[dateStr] = [];
            }
            historyByDate[dateStr].push(item);
        });

        // Create unified data, including points for dates without history
        const unifiedData: UnifiedDataPoint[] = allDatesInRange.map(date => {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            const dataForDate = historyByDate[dateStr] || [];
            const point: UnifiedDataPoint = {
                workout_timestamp: date.getTime(),
                workout_date: dateStr,
            };

            // Initialize all potential keys with null for this date
            allCombinationKeys.forEach(key => {
                point[key] = null;
            });

            dataForDate.forEach(item => {
                const key = getCombinationKey(item.variation, item.equipment_type); // e.g., "Default|DB_KB_COMBO"
                
                if (item.max_e1rm != null && !isNaN(item.max_e1rm)) {
                    let valueToStore = item.max_e1rm;

                    const isDumbbell = item.equipment_type === 'Dumbbell';
                    const isKettlebell = item.equipment_type === 'Kettlebell';

                    // Store original equipment type if it's Dumbbell, Kettlebell, or even other types
                    // for consistency if we later want to show specifics for other 'Default' equipment.
                    if (!point._originalEquipment) {
                        point._originalEquipment = {};
                    }
                    // Store the actual equipment type that contributed to this key for this date.
                    point._originalEquipment[key] = item.equipment_type || 'Default';


                    if (isDumbbell || isKettlebell) {
                        // Value doubling logic (Kettlebell doubled here, Dumbbell assumed doubled upstream)
                        if (isKettlebell) {
                            valueToStore = valueToStore * 2;
                        }
                    }
                    point[key] = valueToStore;
                } else {
                    point[key] = null;
                }
            });

            return point;
        });

        // Define domain for XAxis
        // Add a minimal buffer (1 millisecond) to prevent clipping the last point
        const domainEndDate = effectiveEndDate.getTime() + 1; 
        const calculatedDomain: [number, number] = [startDate.getTime(), domainEndDate];

        // Generate explicit ticks based on the range for even spacing
        const tickTimestamps: number[] = [];
        const dayMillis = 1000 * 60 * 60 * 24;
        const totalDays = Math.round((effectiveEndDate.getTime() - startDate.getTime()) / dayMillis);

        // Ensure start date is always included
        tickTimestamps.push(startDate.getTime());

        // --- MODIFIED TICK GENERATION LOGIC ---
        if (selectedTimeRange === '1Y') {
            const addedMonths = new Set<string>(); // Format: YYYY-MM
            let currentDate = new Date(startDate);

            // Ensure the start date's month is considered 'added'
            const startMonthStr = `${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth()).padStart(2, '0')}`;
            addedMonths.add(startMonthStr);

            // Iterate through the months in the range
            // Start from the month *after* the startDate's month
            currentDate.setUTCDate(1); // Go to the 1st of the start month
            currentDate.setUTCMonth(currentDate.getUTCMonth() + 1); // Move to the 1st of the next month

            while (currentDate <= effectiveEndDate) {
                const year = currentDate.getUTCFullYear();
                const month = currentDate.getUTCMonth();
                const monthStr = `${year}-${String(month).padStart(2, '0')}`;

                // Add tick for the 1st of the current month if not already added
                // and if it's within the effective range (<= effectiveEndDate)
                const firstOfMonthTimestamp = Date.UTC(year, month, 1); // Get timestamp for UTC midnight
                if (firstOfMonthTimestamp <= effectiveEndDate.getTime()) {
                     if (!addedMonths.has(monthStr)) {
                        tickTimestamps.push(firstOfMonthTimestamp);
                        addedMonths.add(monthStr);
                     }
                } else {
                    // If the 1st of the month is already past the end date, stop iterating
                    break;
                }


                // Move to the 1st of the next month
                currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
            }
        } else if (totalDays <= 10) { // Daily ticks for short ranges (<= 10 days)
             let tickDate = new Date(startDate);
             tickDate.setUTCDate(tickDate.getUTCDate() + 1); // Start loop from day after start
             // Add ticks only if they are strictly before the end date
             while (tickDate.getTime() < effectiveEndDate.getTime()) {
                 tickTimestamps.push(tickDate.getTime());
                 tickDate.setUTCDate(tickDate.getUTCDate() + 1);
             }
             // Consider adding the effectiveEndDate if it wasn't the last tick added naturally
             // This helps if the range ends exactly on a day boundary
             if (tickTimestamps.length === 0 || tickTimestamps[tickTimestamps.length - 1] < effectiveEndDate.getTime()) {
                // Add only if the last tick generated isn't already the end date
             }


        } else { // Evenly spaced ticks for longer ranges (> 10 days, excluding 1Y)
            const totalDurationMillis = effectiveEndDate.getTime() - startDate.getTime();
            const targetIntervals = 4;
            const tickIntervalMillis = totalDurationMillis > 0 ? totalDurationMillis / targetIntervals : dayMillis;

            let currentTickTime = startDate.getTime();
            for (let i = 1; i < targetIntervals; i++) { // Generate intermediate ticks
                 currentTickTime += tickIntervalMillis;
                 // Add ticks only if they are strictly before the end date's timestamp
                 if (currentTickTime < effectiveEndDate.getTime()) {
                    tickTimestamps.push(currentTickTime);
                 }
            }
        }
        // --- END MODIFIED TICK GENERATION LOGIC ---


        // Ensure end date is the last tick, only if it's not already the last one added
        if (tickTimestamps.length === 0 || tickTimestamps[tickTimestamps.length - 1] < effectiveEndDate.getTime()) {
             tickTimestamps.push(effectiveEndDate.getTime());
        }
        
        // Remove potential duplicates and sort (important if start/end logic overlaps)
        const uniqueSortedTicks = Array.from(new Set(tickTimestamps)).sort((a, b) => a - b);

        return { chartData: unifiedData, domain: calculatedDomain, ticks: uniqueSortedTicks }; // Use unique sorted ticks

    }, [maxE1RMHistory, selectedTimeRange, allCombinationKeys]);

    return (
        <>
            {/* Conditional Rendering for loading/error/card */}
            {isLoadingExercises ? (
                <p className="text-gray-500 italic">Loading exercises...</p>
            ) : errorExercises ? (
                <p className="text-red-500 italic text-center py-10">Error loading exercises: {errorExercises.message}</p>
            ) : exercises.length > 0 ? (
                <div className="md:p-6"> {/* New root div with original Card's md padding */}
                    <CardHeader className="p-0 mb-4 md:pb-0"> {/* Adjusted padding: remove md:p-4 */}
                        {/* MOVED: Title and dropdown logic now here */}
                        {/* Outer flex container for title */}
                        <div className="flex items-center mb-4"> 
                            {/* Dropdown part */}
                            <div className="relative inline-flex items-center cursor-pointer min-w-0"> 
                                {/* Visible text span - Just exercise name now */}
                                <span className="text-2xl font-semibold truncate" title={selectedExercise?.name || 'Exercise'}> 
                                    {selectedExercise ? selectedExercise.name : "Exercise"}
                                </span>
                                {/* Chevron Icon */}
                                <div className="flex items-center ml-1">
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </div>
                                {/* Hidden select element for functionality */}
                                <select
                                    className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer" // Make select cover div and hide visually
                                    value={selectedExercise?.id || ""}
                                    onChange={(e) => {
                                        const selected = exercises.find(ex => ex.id === e.target.value);
                                        setSelectedExercise(selected || null);
                                    }}
                                    disabled={isLoadingExercises}
                                >
                                    <option value="" disabled={!!selectedExercise}>-- Select an Exercise --</option> {/* Optionally disable placeholder if something selected */}
                                    {exercises.map((exercise) => (
                                        <option key={exercise.id} value={exercise.id}>
                                            {exercise.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Moved title and buttons into header */}
                        {selectedExercise && (
                            <>
                                {/* Moved Time Range Buttons here, centered */}
                                <div className="flex justify-center space-x-1 mb-4"> 
                                    {timeRangeOptions.map(range => (
                                        <Button 
                                            key={range} 
                                            variant={selectedExercise && selectedTimeRange === range ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedTimeRange(range)}
                                            aria-label={`Select ${range}`}
                                            className="px-2 h-8"
                                        >
                                            {range}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardHeader>
                    {/* Removed space-y-6 from CardContent */}
                    <CardContent className="p-0 pt-0"> {/* Adjusted padding: remove md:p-6 md:pt-0, ensure pt-0 */}
                        {selectedExercise && (
                            // Removed outer div that previously held title/buttons
                            <>
                                {isLoadingHistory ? (
                                    <p className="text-gray-500 italic text-center py-10">Loading history...</p>
                                ) : errorHistory ? (
                                    <p className="text-red-500 italic text-center py-10">Error loading history: {errorHistory.message}</p>
                                ) : chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart 
                                            data={chartData} 
                                            margin={{ top: 5, right: -15, left: 20, bottom: 5 }}
                                        >
                                            {/* <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.25)" /> // Removed this line */}
                                            <XAxis
                                                dataKey="workout_timestamp"
                                                // Pass selectedTimeRange to the formatter
                                                tickFormatter={(ts) => formatAxisDate(ts, selectedTimeRange)}
                                                type="number"
                                                domain={domain} // Set calculated domain
                                                ticks={ticks} // Use explicit ticks
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis
                                                orientation="right" // Move axis to the right
                                                tick={{ fontSize: 12 }}
                                                domain={['auto', 'auto']}
                                                // Add tick formatter
                                                tickFormatter={(value) => `${value} kg`} 
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={false} />
                                            <Legend onClick={(data) => {
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
                                                    const parts = key.split('|');
                                                    const variationPart = parts[0]; // e.g., "Default", "Incline"
                                                    const equipmentPart = parts[1]; // e.g., "DB_KB_COMBO", "Barbell", "Default"

                                                    // Determine display variation
                                                    const displayVariation = (variationPart === 'Default') ? 'Standard' : variationPart;

                                                    // Determine display equipment
                                                    let displayEquipment;
                                                    if (equipmentPart === 'DB_KB_COMBO') {
                                                        displayEquipment = 'DB/KB';
                                                    } else if (equipmentPart === 'Default') {
                                                        displayEquipment = 'Bodyweight'; // Or a more general term if preferred
                                                    } else {
                                                        displayEquipment = equipmentPart;
                                                    }
                                                    
                                                    // Determine final legend value based on new format
                                                    let displayValue;
                                                    if (displayVariation === 'Standard') {
                                                        displayValue = displayEquipment;
                                                    } else {
                                                        displayValue = `${displayEquipment} (${displayVariation})`;
                                                    }

                                                    return {
                                                        id: key,
                                                        type: 'line',
                                                        value: displayValue, // Use the new formatted displayValue
                                                        color: lineColors[index % lineColors.length],
                                                    }
                                                })
                                            }
                                            wrapperStyle={{ paddingTop: '20px' }} />
                                            {allCombinationKeys.map((key) => {
                                                const colorIndex = allCombinationKeys.indexOf(key);
                                                if (!activeCombinationKeys.includes(key)) return null;

                                                const parts = key.split('|');
                                                const variationPart = parts[0];
                                                let equipmentPart = parts[1];
                                            
                                                const displayVariation = variationPart === 'Default' ? 'Standard' : variationPart;
                                                let displayEquipment = equipmentPart === 'Default' ? 'Default' : equipmentPart;
                                            
                                                if (equipmentPart === 'DB_KB_COMBO') {
                                                    displayEquipment = 'DB/KB';
                                                }
                                                const displayName = `${displayVariation} - ${displayEquipment}`;

                                                return (
                                                    <Line
                                                        key={key}
                                                        type="monotone"
                                                        dataKey={key}
                                                        name={displayName} // Use the new formatted displayName
                                                        stroke={lineColors[colorIndex % lineColors.length]}
                                                        strokeWidth={2}
                                                        // Revert dot style to default boolean
                                                        dot={true} 
                                                        activeDot={{ r: 10 }} // Increased radius for easier mobile interaction
                                                        connectNulls={true} // Ensure connectNulls is true
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-gray-500 italic text-center py-10">
                                        {selectedTimeRange === 'ALL' 
                                            ? "No estimated 1RM history found for this exercise. Complete some sets!"
                                            : `No estimated 1RM history found for this exercise in the last ${selectedTimeRange}.`}
                                    </p>
                                )}
                            </>
                        )}
                        {/* If no exercise selected, maybe show a prompt? */}
                        {!selectedExercise && (
                             <p className="text-gray-500 italic text-center py-10">Select an exercise above to see its progress.</p>
                        )}
                    </CardContent>
                </div>
            ) : (
                <p className="text-gray-500 italic">No exercises defined yet. Add some via the workout screen.</p>
            )}
        </>
    );
};

export default OneRepMax; // Renamed default export 