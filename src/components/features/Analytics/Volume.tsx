import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { supabase } from '@/lib/integrations/supabase/client';

// New data structure from RPC
interface WeeklyArchetypeSetData {
  base_archetype_name: string;
  archetype_subtype_name: string | null;
  muscle_definition_name?: string; // Made optional, as new RPC doesn't provide it
  total_sets: number;
}

// Define the archetypes we want to display progress for
const progressArchetypes = ['Squat', 'Lunge', 'Push', 'Pull', 'Bend', 'Twist'] as const;
type ProgressArchetypeName = typeof progressArchetypes[number];

// New data structure for the circular progress bars
interface DisplayArchetypeData {
    name: ProgressArchetypeName;
    totalSets: number;
    verticalSets: number; 
    horizontalSets: number;
    goal: number;
    // Effective colors to be used by chart
    displayColor: string; 
    displayVerticalColor?: string;
    displayHorizontalColor?: string;
}

// Define the RPC function name (remains the same)
const FETCH_WEEKLY_SETS_FUNCTION = 'fetch_weekly_archetype_sets'; // Changed to new RPC

// Fetch function updated for new return type
async function fetchWeeklySets(userId: string): Promise<WeeklyArchetypeSetData[]> {
    const { data, error } = await supabase.rpc(FETCH_WEEKLY_SETS_FUNCTION, { 
        p_user_id: userId
    });
    if (error) {
        console.error('Error fetching weekly sets per muscle group:', error);
        throw new Error(`Failed to fetch weekly set data: ${error.message}`);
    }
    return (data || []) as WeeklyArchetypeSetData[]; 
}

// Props interface (remains the same)
interface VolumeProps {
    userId: string | undefined;
}

// Define colors and archetype styling (archetypeColors might need slight adjustments if new keys are used)
const GOAL_SETS = 15; // Target sets for each archetype

const archetypeColors: {
    [key: string]: {
        default: string;
        highlight: string;
        vertical?: string;
        horizontal?: string;
        verticalHighlight?: string;
        horizontalHighlight?: string;
    }
} = {
    'Squat':    { default: '#2563EB', highlight: '#16A34A' }, // Blue
    'Lunge':    { default: '#38BDF8', highlight: '#16A34A' }, // Sky Blue
    'Push':     { default: '#F97316', highlight: '#16A34A', vertical: '#F97316', horizontal: '#FB923C', verticalHighlight: '#16A34A', horizontalHighlight: '#16A34A' }, // Orange, Light Orange
    'Pull':     { default: '#EC4899', highlight: '#16A34A', vertical: '#EC4899', horizontal: '#F472B6', verticalHighlight: '#16A34A', horizontalHighlight: '#16A34A' }, // Pink, Light Pink
    'Bend':     { default: '#8B5CF6', highlight: '#16A34A' }, // Violet
    'Twist':    { default: '#EAB308', highlight: '#16A34A' }, // Yellow
    'Gait':     { default: '#10B981', highlight: '#16A34A' }, // Emerald (Gait not in progressArchetypes but kept for completeness)
    'Default':  { default: '#A1A1AA', highlight: '#16A34A' }  // Gray
};

const Volume: React.FC<VolumeProps> = ({ userId }) => {

    const { data: rawData = [], isLoading: isLoadingSets, error: errorSets } = useQuery<
        WeeklyArchetypeSetData[], 
        Error
    >({ 
        queryKey: ['weeklyArchetypeSets_v2', userId],
        queryFn: async () => {
            if (!userId) return [];
            return fetchWeeklySets(userId); 
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 15 * 60 * 1000,
    });

    // Temporary log to inspect rawData from Supabase - REMOVED
    // console.log('[Volume.tsx] Raw data from fetchWeeklySets:', rawData);

    const progressDisplayData = useMemo((): DisplayArchetypeData[] => {
        const initialData: Record<ProgressArchetypeName, Omit<DisplayArchetypeData, 'displayColor' | 'displayVerticalColor' | 'displayHorizontalColor'>> = {
            'Squat': { name: 'Squat', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
            'Lunge': { name: 'Lunge', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
            'Push':  { name: 'Push',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
            'Pull':  { name: 'Pull',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
            'Bend':  { name: 'Bend',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
            'Twist': { name: 'Twist', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS },
        };

        rawData.forEach(item => {
            const baseName = item.base_archetype_name as ProgressArchetypeName;
            if (progressArchetypes.includes(baseName)) {
                const archetype = initialData[baseName];
                
                if (baseName === 'Push' || baseName === 'Pull') {
                    if (item.archetype_subtype_name === 'Vertical') {
                        archetype.verticalSets += item.total_sets;
                    } else if (item.archetype_subtype_name === 'Horizontal') {
                        archetype.horizontalSets += item.total_sets;
                    }
                    // totalSets for Push/Pull will be explicitly sum of V/H after loop
                } else {
                    archetype.totalSets += item.total_sets;
                }
            }
        });

        // Finalize totalSets for Push/Pull as sum of their components
        initialData['Push'].totalSets = initialData['Push'].verticalSets + initialData['Push'].horizontalSets;
        initialData['Pull'].totalSets = initialData['Pull'].verticalSets + initialData['Pull'].horizontalSets;
        
        // Temporary log to inspect processed data before final mapping - REMOVED
        // console.log('[Volume.tsx] Processed initialData in useMemo:', JSON.parse(JSON.stringify(initialData)));

        return progressArchetypes.map(name => {
            const archSetup = initialData[name];
            const colors = archetypeColors[name] || archetypeColors['Default'];
            const isGoalMet = archSetup.totalSets >= GOAL_SETS;

            let displayColor = isGoalMet ? colors.highlight : colors.default;
            let displayVerticalColor: string | undefined = undefined;
            let displayHorizontalColor: string | undefined = undefined;

            if (name === 'Push' || name === 'Pull') {
                displayVerticalColor = isGoalMet ? 
                    (colors.verticalHighlight || colors.highlight) : 
                    (colors.vertical || colors.default);
                displayHorizontalColor = isGoalMet ? 
                    (colors.horizontalHighlight || colors.highlight) : 
                    (colors.horizontal || colors.default);
            }
            
            return {
                ...archSetup,
                displayColor,
                displayVerticalColor,
                displayHorizontalColor,
            };
        });

    }, [rawData]);
    
    return (
        <Card className="mb-8 border-0 shadow-none bg-transparent p-0 md:border md:shadow md:bg-card md:p-6">
            <CardHeader className="p-0 mb-4 md:p-4 md:pb-2">
                <CardTitle className="text-2xl font-semibold mb-4 text-center md:text-left">
                    Weekly Archetype Progress
                </CardTitle>
                {/* Temporary User ID display for debugging - REMOVED */}
                {/* <p className="text-xs text-gray-400 text-center md:text-left">Debugging - User ID: {userId || "undefined"}</p> */}
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
                {isLoadingSets ? (
                    <p className="text-gray-500 italic text-center py-10">Loading weekly set data...</p>
                ) : errorSets ? (
                    <p className="text-red-500 italic text-center py-10">Error loading data: {errorSets.message}</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                        {progressDisplayData.map((archetype) => {
                            let radialBarInputData;

                            if (archetype.name === 'Push' || archetype.name === 'Pull') {
                                const segments = [
                                    // Order matters for stacking: vertical first, then horizontal on top
                                    { name: 'Vertical', value: archetype.verticalSets, fill: archetype.displayVerticalColor || archetypeColors['Default'].default },
                                    { name: 'Horizontal', value: archetype.horizontalSets, fill: archetype.displayHorizontalColor || archetypeColors['Default'].default },
                                ];
                                radialBarInputData = segments.filter(segment => segment.value > 0);

                                // If, after filtering, there are no segments (i.e., totalSets is 0 for Push/Pull),
                                // add a placeholder to ensure the RadialBar and its background track are rendered.
                                if (radialBarInputData.length === 0) { // This implies totalSets is 0
                                    radialBarInputData = [{ name: 'placeholder', value: 0, fill: 'transparent' }];
                                }
                            } else {
                                // For non-Push/Pull archetypes
                                radialBarInputData = [{ name: archetype.name, value: archetype.totalSets, fill: archetype.displayColor }];
                                // If archetype.totalSets is 0, value will be 0, which correctly renders background track and no visible bar.
                            }
                            
                            return (
                                <div key={archetype.name} className="flex flex-col items-center p-3 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
                                    <h3 className="text-md font-semibold mb-2 text-foreground text-center">{archetype.name}</h3>
                                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="80%"
                                                barSize={12} // Thickness of the bar
                                                data={radialBarInputData} // Use the processed data
                                                startAngle={90}
                                                endAngle={-270} // Full circle from top, clockwise
                                            >
                                                <PolarAngleAxis type="number" domain={[0, GOAL_SETS]} tick={false} />
                                                <RadialBar
                                                    background={{ fill: 'rgba(128, 128, 128, 0.08)' }} // Background track color
                                                    dataKey="value"
                                                    cornerRadius={6} // Rounded ends for bars
                                                    isAnimationActive={true}
                                                    animationDuration={750}
                                                />
                                                {/* Add Recharts Tooltip here if segment details are needed on hover
                                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '5px', padding: '5px 10px' }} /> 
                                                */}
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xl sm:text-2xl font-bold text-foreground">
                                                {archetype.totalSets}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                / {GOAL_SETS} sets
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Volume;