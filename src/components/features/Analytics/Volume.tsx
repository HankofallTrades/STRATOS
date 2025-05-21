import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
const FETCH_WEEKLY_SETS_FUNCTION = 'fetch_weekly_archetype_sets_v2'; // New RPC with date range

// Helper to get current week (Monday-Sunday)
function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  // Monday as start of week (0=Sunday, 1=Monday, ...)
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

// Fetch function updated for new return type
async function fetchWeeklySets(userId: string, start: string, end: string): Promise<WeeklyArchetypeSetData[]> {
    const { data, error } = await supabase.rpc(FETCH_WEEKLY_SETS_FUNCTION as any, { 
        p_user_id: userId,
        p_start_date: start,
        p_end_date: end,
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
// const GOAL_SETS = 15; // Target sets for each archetype
const GOAL_SETS: Record<ProgressArchetypeName, number> = {
    'Squat': 7,
    'Lunge': 7,
    'Push': 10,
    'Pull': 10,
    'Bend': 7,
    'Twist': 7,
};

const archetypeColors: {
    [key: string]: {
        default: string; // Standard blue
        highlight: string; // Green for goal met
        vertical?: string; // Standard blue for Push/Pull vertical
        horizontal?: string; // Lighter blue for Push/Pull horizontal
    }
} = {
    'Squat':    { default: '#2563EB', highlight: '#16A34A' },
    'Lunge':    { default: '#2563EB', highlight: '#16A34A' },
    'Push':     { default: '#2563EB', highlight: '#16A34A', vertical: '#2563EB', horizontal: '#60A5FA' }, // Std blue, Lighter blue
    'Pull':     { default: '#2563EB', highlight: '#16A34A', vertical: '#2563EB', horizontal: '#60A5FA' }, // Std blue, Lighter blue
    'Bend':     { default: '#2563EB', highlight: '#16A34A' },
    'Twist':    { default: '#2563EB', highlight: '#16A34A' },
    'Gait':     { default: '#2563EB', highlight: '#16A34A' }, 
    'Default':  { default: '#A1A1AA', highlight: '#16A34A' } 
};

const Volume: React.FC<VolumeProps> = ({ userId }) => {
    const [clickedArchetypeData, setClickedArchetypeData] = useState<DisplayArchetypeData | null>(null);
    const [clickTooltipPosition, setClickTooltipPosition] = useState<{ top: number, left: number } | null>(null);

    const weekRange = getCurrentWeekRange();

    const { data: rawData = [], isLoading: isLoadingSets, error: errorSets } = useQuery<
        WeeklyArchetypeSetData[], 
        Error
    >({ 
        queryKey: ['weeklyArchetypeSets_v2', userId, weekRange.start, weekRange.end],
        queryFn: async () => {
            if (!userId) return [];
            return fetchWeeklySets(userId, weekRange.start, weekRange.end); 
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 15 * 60 * 1000,
    });

    // Debug: Log rawData from Supabase
    console.log('[Volume.tsx] Raw data from Supabase:', rawData);

    const progressDisplayData = useMemo((): DisplayArchetypeData[] => {
        // Log rawData specifically for Push and Pull to diagnose - REMOVING
        // console.log(
        //     '[Volume.tsx Debug] Raw data items for Push/Pull:',
        //     rawData.filter(item => item.base_archetype_name === 'Push' || item.base_archetype_name === 'Pull')
        // );
        // console.log('[Volume.tsx Debug] Full rawData (consider stringifying for large objects):', JSON.stringify(rawData, null, 2));

        const initialData: Record<ProgressArchetypeName, Omit<DisplayArchetypeData, 'displayColor' | 'displayVerticalColor' | 'displayHorizontalColor'>> = {
            'Squat': { name: 'Squat', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Squat'] },
            'Lunge': { name: 'Lunge', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Lunge'] },
            'Push':  { name: 'Push',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Push'] },
            'Pull':  { name: 'Pull',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Pull'] },
            'Bend':  { name: 'Bend',  totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Bend'] },
            'Twist': { name: 'Twist', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Twist'] },
        };

        rawData.forEach(item => {
            const baseName = item.base_archetype_name as ProgressArchetypeName;
            if (progressArchetypes.includes(baseName)) {
                const archetype = initialData[baseName];

                // If Push or Pull, categorize into vertical/horizontal if subtype is available
                if (baseName === 'Push' || baseName === 'Pull') {
                    const subType = item.archetype_subtype_name?.toLowerCase();
                    if (subType === 'vertical') {
                        archetype.verticalSets += item.total_sets;
                    } else if (subType === 'horizontal') {
                        archetype.horizontalSets += item.total_sets;
                    }
                } else {
                    // For other archetypes, just add to totalSets
                    archetype.totalSets += item.total_sets;
                }
            }
        });

        // For Push and Pull, totalSets = verticalSets + horizontalSets
        initialData['Push'].totalSets = initialData['Push'].verticalSets + initialData['Push'].horizontalSets;
        initialData['Pull'].totalSets = initialData['Pull'].verticalSets + initialData['Pull'].horizontalSets;
        
        // Temporary log to inspect processed data before final mapping - REMOVED
        // console.log('[Volume.tsx] Processed initialData in useMemo:', JSON.parse(JSON.stringify(initialData)));

        // Log processed initialData for Push/Pull - REMOVING
        // console.log('[Volume.tsx Debug] Processed initialData for Push:', JSON.parse(JSON.stringify(initialData['Push'])));
        // console.log('[Volume.tsx Debug] Processed initialData for Pull:', JSON.parse(JSON.stringify(initialData['Pull'])));

        return progressArchetypes.map(name => {
            const archSetup = initialData[name];
            const colors = archetypeColors[name] || archetypeColors['Default'];
            const isGoalMet = archSetup.totalSets >= archSetup.goal;

            let displayColor = isGoalMet ? colors.highlight : colors.default; 
            let displayVerticalColor: string | undefined = undefined;
            let displayHorizontalColor: string | undefined = undefined;

            if (name === 'Push' || name === 'Pull') {
                if (isGoalMet) {
                    // When goal is met, all segments turn green
                    displayVerticalColor = colors.highlight;
                    displayHorizontalColor = colors.highlight;
                } else {
                    // Before goal, use specific vertical/horizontal blues
                    displayVerticalColor = colors.vertical || colors.default;
                    displayHorizontalColor = colors.horizontal || colors.default;
                }
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
        <div className="md:p-6">
            <CardHeader className="p-0 mb-4 md:pb-2">
                <CardTitle className="text-2xl font-semibold mb-4 text-center md:text-left">
                    Volume
                </CardTitle>
                {/* Temporary User ID display for debugging - REMOVED */}
                {/* <p className="text-xs text-gray-400 text-center md:text-left">Debugging - User ID: {userId || "undefined"}</p> */}
            </CardHeader>
            <CardContent className="p-0 pt-0">
                {isLoadingSets ? (
                    <p className="text-gray-500 italic text-center py-10">Loading weekly set data...</p>
                ) : errorSets ? (
                    <p className="text-red-500 italic text-center py-10">Error loading data: {errorSets.message}</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                        {progressDisplayData.map((archetype) => {
                            const isGoalMet = archetype.totalSets >= archetype.goal;
                            const chartData = [archetype];
                            const isPushOrPull = archetype.name === 'Push' || archetype.name === 'Pull';
                            const hasPushPullSegments = isPushOrPull && (archetype.verticalSets > 0 || archetype.horizontalSets > 0);
                            
                            return (
                                <div 
                                    key={archetype.name} 
                                    className="flex flex-col items-center p-3 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={(e) => {
                                        if (clickedArchetypeData && clickedArchetypeData.name === archetype.name) {
                                            // Clicked same card again, hide tooltip
                                            setClickedArchetypeData(null);
                                            setClickTooltipPosition(null);
                                        } else {
                                            // Clicked a new card (or first click)
                                            setClickedArchetypeData(archetype);
                                            setClickTooltipPosition({ top: e.pageY + 10, left: e.pageX + 10 });
                                        }
                                    }}
                                >
                                    <h3 className="text-md font-semibold mb-2 text-foreground text-center">{archetype.name}</h3>
                                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadialBarChart
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="55%"
                                                outerRadius="80%"
                                                barSize={12}
                                                data={chartData}
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                <PolarAngleAxis type="number" domain={[0, archetype.goal]} tick={false} />

                                                {hasPushPullSegments ? (
                                                    <>
                                                        {archetype.verticalSets > 0 && (
                                                            <RadialBar
                                                                dataKey="verticalSets"
                                                                fill={archetype.displayVerticalColor}
                                                                stackId="a"
                                                                cornerRadius={0}
                                                                isAnimationActive={false}
                                                                background={false}
                                                            />
                                                        )}
                                                        {archetype.horizontalSets > 0 && (
                                                            <RadialBar
                                                                dataKey="horizontalSets"
                                                                fill={archetype.displayHorizontalColor}
                                                                stackId="a"
                                                                cornerRadius={0}
                                                                isAnimationActive={true}
                                                                background={{ fill: 'rgba(128, 128, 128, 0.08)' }}
                                                            />
                                                        )}
                                                    </>
                                                ) : (
                                                    <RadialBar
                                                        dataKey="totalSets"
                                                        fill={archetype.displayColor}
                                                        cornerRadius={1}
                                                        isAnimationActive={true}
                                                        background={{ fill: 'rgba(128, 128, 128, 0.08)' }}
                                                    />
                                                )}
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xl sm:text-2xl font-bold text-foreground">
                                                {archetype.totalSets}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                / {archetype.goal} sets
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Click-triggered Tooltip */} 
            {clickedArchetypeData && clickTooltipPosition && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${clickTooltipPosition.top}px`,
                        left: `${clickTooltipPosition.left}px`,
                        zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        borderRadius: '5px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        textAlign: 'left',
                        pointerEvents: 'none'
                    }}
                >
                    <ArchetypeTooltipContent data={clickedArchetypeData} />
                </div>
            )}
        </div>
    );
};

// Shared component for generating tooltip content
const ArchetypeTooltipContent = ({ data }: { data: DisplayArchetypeData }) => {
    const baseName = data.name;
    const verticalSets = data.verticalSets;
    const horizontalSets = data.horizontalSets;
    const totalSets = data.totalSets;

    if (baseName === 'Push' || baseName === 'Pull') {
        return (
            <>
                <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>{baseName}</p>
                <p>Vertical: {verticalSets} sets</p>
                <p>Horizontal: {horizontalSets} sets</p>
                <p style={{ marginTop: '3px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '3px' }}>Total: {totalSets} sets</p>
            </>
        );
    } else {
        return <p>{`${baseName}: ${totalSets} sets`}</p>;
    }
};

export default Volume;