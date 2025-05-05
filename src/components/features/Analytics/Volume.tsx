import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { supabase } from '@/lib/integrations/supabase/client';

// Original data structure from DB
interface WeeklyMuscleGroupSetData {
  l1_parent_name: string;
  muscle_group_name: string;
  total_sets: number;
}

// Transformed data structure for the chart
interface ChartDataPoint {
    muscle_group_name: string; // L2 name acts as the category
    // Store sets for each L1 group potentially
    "Upper Body"?: number;
    "Lower Body"?: number;
    "Core"?: number;
    // Store original L1 parent for tooltip/coloring reference if needed
    original_l1_parent?: string; 
}

// Define the RPC function name
const FETCH_WEEKLY_SETS_FUNCTION = 'fetch_weekly_sets_per_muscle_group';

// Fetch function (keeping `as any` for now)
async function fetchWeeklySetsPerMuscleGroup(userId: string): Promise<WeeklyMuscleGroupSetData[]> {
    const { data, error } = await (supabase.rpc as any)(FETCH_WEEKLY_SETS_FUNCTION, { 
        p_user_id: userId
    });
    if (error) {
        console.error('Error fetching weekly sets per muscle group:', error);
        throw new Error(`Failed to fetch weekly set data: ${error.message}`);
    }
    return (data || []) as WeeklyMuscleGroupSetData[]; 
}

// Props interface
interface VolumeProps {
    userId: string | undefined;
}

// Define NEW shades of blue
const colorHighlight = '#16A34A'; // Green
const colorUpperBody = '#0B57D0';   // Darker Blue
const colorLowerBody = '#38BDF8';   // NEW: Brighter Sky Blue for contrast
const colorCore =      '#60A5FA';   // Lighter Blue
const colorDefault =   '#A1A1AA';   // Gray (Fallback)

// Ensure keys match expected l1_parent_name values from DB
const l1GroupColors: { [key: string]: { default: string; highlight: string } } = {
    'Upper Body': { default: colorUpperBody, highlight: colorHighlight }, 
    'Lower Body': { default: colorLowerBody, highlight: colorHighlight }, 
    'Core':       { default: colorCore,      highlight: colorHighlight }, 
    'Default':    { default: colorDefault,   highlight: colorHighlight } 
};

// Define the desired order for L1 and L2 groups
const l1GroupOrder = ['Upper Body', 'Lower Body', 'Core'];
const l2GroupOrders: { [key: string]: string[] } = {
    'Upper Body': ['Chest', 'Back', 'Shoulders', 'Arms'], // Specific order
    'Lower Body': ['Quadriceps', 'Hamstrings', 'Gluteals', 'Calves', 'Hip Muscles'], // Default order (adjust if needed)
    'Core':       ['Abdominals', 'Lower Back (Core)', 'Stabilizers'] // Default order (adjust if needed)
};

const HIGH_SET_THRESHOLD = 15;

// Custom Tooltip - Updated for new data structure
const CustomTooltip = ({ active, payload, label }: any) => {
    // Payload now contains entries for each Bar series (Upper, Lower, Core)
    // Find the active series entry (the one with a non-null value)
    const activePayload = payload?.find((p: any) => p.value != null && p.value > 0);

    if (active && activePayload && label) {
        const data = activePayload.payload as ChartDataPoint; // The underlying data point for this category (L2 group)
        const l1Parent = activePayload.dataKey as string; // The dataKey identifies the L1 group ('Upper Body', etc.)
        const totalSets = activePayload.value;
        
        const colorSet = l1GroupColors[l1Parent] || l1GroupColors['Default'];
        const textColor = totalSets >= HIGH_SET_THRESHOLD ? colorSet.highlight : colorSet.default;

        return (
            <div className="custom-tooltip bg-background p-3 border border-border rounded shadow-lg text-sm space-y-0.5">
                <p className="label font-semibold">{`${label}`}</p> {/* Label is L2 muscle_group_name */}
                <p className="text-xs text-muted-foreground">{`(Part of: ${l1Parent})`}</p>
                <p className="intro" style={{ color: textColor }}>
                    {`Sets (Last 7 Days): ${totalSets}`}
                </p>
            </div>
        );
    }
    return null;
};

// Component Refactored for Grouped & Conditional Colored Bar Chart
const Volume: React.FC<VolumeProps> = ({ userId }) => {

    const { data: rawData = [], isLoading: isLoadingSets, error: errorSets } = useQuery<
        WeeklyMuscleGroupSetData[],
        Error
    >({ 
        queryKey: ['weeklyMuscleGroupSets', userId],
        queryFn: async () => {
            if (!userId) return [];
            return fetchWeeklySetsPerMuscleGroup(userId);
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 15 * 60 * 1000,
    });

    // Process data: Group by L2, assign sets to L1 keys
    const chartData = useMemo((): ChartDataPoint[] => {
        if (!rawData) return [];

        // 1. Create a map of L2 group names to their data points
        const dataMap: { [key: string]: ChartDataPoint } = {};
        rawData.forEach(item => {
            if (!dataMap[item.muscle_group_name]) {
                // Initialize with potential keys set to undefined
                dataMap[item.muscle_group_name] = { 
                    muscle_group_name: item.muscle_group_name,
                    original_l1_parent: item.l1_parent_name, // Store original parent
                    "Upper Body": undefined,
                    "Lower Body": undefined,
                    "Core": undefined
                };
            }
            // Assign total_sets to the corresponding L1 parent key
            if (l1GroupOrder.includes(item.l1_parent_name)) {
                // Use explicit checks instead of dynamic key access for assignment
                const key = item.l1_parent_name as 'Upper Body' | 'Lower Body' | 'Core';
                dataMap[item.muscle_group_name][key] = item.total_sets;
            }
        });

        // 2. Create the final array sorted by L1 -> L2 order
        const finalData: ChartDataPoint[] = [];
        l1GroupOrder.forEach(l1Name => {
            const l2Order = l2GroupOrders[l1Name] || [];
            l2Order.forEach(l2Name => {
                if (dataMap[l2Name]) {
                    // Only add if there was data for this L2 group
                    finalData.push(dataMap[l2Name]);
                }
            });
            // Add any L2 groups belonging to this L1 parent that weren't explicitly ordered
             Object.values(dataMap).forEach(dataPoint => {
                if (dataPoint.original_l1_parent === l1Name && !l2Order.includes(dataPoint.muscle_group_name)) {
                    if (!finalData.find(fd => fd.muscle_group_name === dataPoint.muscle_group_name)) {
                        finalData.push(dataPoint);
                    }
                }
             });
        });

        return finalData;

    }, [rawData]);

    return (
        <Card className="mb-8 border-0 shadow-none bg-transparent p-0 md:border md:shadow md:bg-card md:p-6">
            <CardHeader className="p-0 mb-4 md:p-4 md:pb-2">
                <CardTitle className="text-2xl font-semibold mb-4 text-center md:text-left">
                    Weekly Sets per Muscle Group
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
                {isLoadingSets ? (
                    <p className="text-gray-500 italic text-center py-10">Loading weekly set data...</p>
                ) : errorSets ? (
                    <p className="text-red-500 italic text-center py-10">Error loading data: {errorSets.message}</p>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={chartData} // Use the transformed data
                            layout="horizontal" 
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                            // barGap defines space between bars *at the same category index* (not needed here)
                            // barCategoryGap defines space between category ticks (can adjust for spacing)
                            barCategoryGap="15%" // Let's try reducing this slightly
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="muscle_group_name"
                                type="category"
                                tick={{ fontSize: 10 }}
                                interval={0} 
                                angle={-35}
                                textAnchor="end"
                                height={60}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                type="number"
                                tick={{ fontSize: 12 }} 
                                allowDecimals={false}
                            /> 
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                            
                            {/* Render a separate Bar for each L1 group */}
                            {l1GroupOrder.map((l1Name) => (
                                <Bar 
                                    key={l1Name} 
                                    dataKey={l1Name} // Use L1 name as data key
                                    stackId={l1Name} // Unique stackId prevents stacking
                                    name={`Sets - ${l1Name}`} 
                                    radius={[5, 5, 0, 0]}
                                    barSize={20} // Make bars wider
                                >
                                    {chartData.map((entry, index) => {
                                        const totalSets = entry[l1Name as keyof ChartDataPoint] as number | undefined;
                                        const colorSet = l1GroupColors[l1Name] || l1GroupColors['Default'];
                                        const fillColor = (totalSets != null && totalSets >= HIGH_SET_THRESHOLD) ? colorSet.highlight : colorSet.default;
                                        // Render Cell only if sets > 0 to avoid tiny/invisible bars for empty categories
                                        return totalSets != null && totalSets > 0 ? (
                                            <Cell key={`cell-${l1Name}-${index}`} fill={fillColor} />
                                        ) : (
                                            // Render an empty Cell or null - Recharts needs a cell per data point usually
                                            // Let's try an empty Cell with transparent fill
                                             <Cell key={`cell-${l1Name}-${index}`} fill="transparent" /> 
                                        ); 
                                    })}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-gray-500 italic text-center py-10">
                        No completed sets found in the last 7 days. Time to hit the gym!
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default Volume;