import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as analyticsRepo from '../data/analyticsRepository';

export type ProgressArchetypeName = 'Squat' | 'Lunge' | 'Push' | 'Pull' | 'Bend' | 'Twist';

const progressArchetypes: ProgressArchetypeName[] = ['Squat', 'Lunge', 'Push', 'Pull', 'Bend', 'Twist'];

export interface DisplayArchetypeData {
    name: ProgressArchetypeName;
    totalSets: number;
    verticalSets: number;
    horizontalSets: number;
    goal: number;
    displayColor: string;
    displayVerticalColor?: string;
    displayHorizontalColor?: string;
}

const GOAL_SETS: Record<ProgressArchetypeName, number> = {
    'Squat': 7,
    'Lunge': 7,
    'Push': 10,
    'Pull': 10,
    'Bend': 7,
    'Twist': 7,
};

const archetypeColors: Record<string, { default: string; highlight: string; vertical?: string; horizontal?: string }> = {
    'Squat': { default: '#5f8377', highlight: '#7cad9d' },
    'Lunge': { default: '#5f8377', highlight: '#7cad9d' },
    'Push': { default: '#6b9485', highlight: '#7cad9d', vertical: '#6b9485', horizontal: '#93b9ac' },
    'Pull': { default: '#6b9485', highlight: '#7cad9d', vertical: '#6b9485', horizontal: '#93b9ac' },
    'Bend': { default: '#6a7f78', highlight: '#7cad9d' },
    'Twist': { default: '#6a7f78', highlight: '#7cad9d' },
    'Default': { default: '#8c8f96', highlight: '#7cad9d' }
};

function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
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

export { getCurrentWeekRange };

export const buildVolumeProgressDisplayData = (
    rawData: WeeklyArchetypeSetData[]
): DisplayArchetypeData[] => {
    const initialData: Record<ProgressArchetypeName, Omit<DisplayArchetypeData, 'displayColor' | 'displayVerticalColor' | 'displayHorizontalColor'>> = {
        'Squat': { name: 'Squat', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Squat'] },
        'Lunge': { name: 'Lunge', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Lunge'] },
        'Push': { name: 'Push', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Push'] },
        'Pull': { name: 'Pull', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Pull'] },
        'Bend': { name: 'Bend', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Bend'] },
        'Twist': { name: 'Twist', totalSets: 0, verticalSets: 0, horizontalSets: 0, goal: GOAL_SETS['Twist'] },
    };

    rawData.forEach(item => {
        const baseName = item.base_archetype_name as ProgressArchetypeName;
        if (progressArchetypes.includes(baseName)) {
            const archetype = initialData[baseName];
            if (baseName === 'Push' || baseName === 'Pull') {
                const subType = item.archetype_subtype_name?.toLowerCase();
                if (subType === 'vertical') {
                    archetype.verticalSets += item.total_sets;
                } else if (subType === 'horizontal') {
                    archetype.horizontalSets += item.total_sets;
                }
            } else {
                archetype.totalSets += item.total_sets;
            }
        }
    });

    initialData['Push'].totalSets = initialData['Push'].verticalSets + initialData['Push'].horizontalSets;
    initialData['Pull'].totalSets = initialData['Pull'].verticalSets + initialData['Pull'].horizontalSets;

    return progressArchetypes.map(name => {
        const archSetup = initialData[name];
        const colors = archetypeColors[name] || archetypeColors['Default'];
        const isGoalMet = archSetup.totalSets >= archSetup.goal;

        const displayColor = isGoalMet ? colors.highlight : colors.default;
        let displayVerticalColor: string | undefined = undefined;
        let displayHorizontalColor: string | undefined = undefined;

        if (name === 'Push' || name === 'Pull') {
            if (isGoalMet) {
                displayVerticalColor = colors.highlight;
                displayHorizontalColor = colors.highlight;
            } else {
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
};

export const useVolumeChart = (userId: string | undefined) => {
    const weekRange = useMemo(() => getCurrentWeekRange(), []);

    const { data: rawData = [], isLoading, error } = useQuery({
        queryKey: ['weeklyArchetypeSets_v2', userId, weekRange.start, weekRange.end],
        queryFn: async () => {
            if (!userId) return [];
            return analyticsRepo.fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end);
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    const progressDisplayData = useMemo(
        () => buildVolumeProgressDisplayData(rawData),
        [rawData]
    );

    return {
        progressDisplayData,
        isLoading,
        error
    };
};
