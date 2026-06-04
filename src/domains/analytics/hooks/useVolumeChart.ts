import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as analyticsRepo from '../data/analyticsRepository';
import {
    buildVolumeProgressDisplayData,
    getCurrentWeekRange,
    type DisplayArchetypeData,
    type ProgressArchetypeName,
} from '@/domains/analytics/data/volumeProgress';

export {
    getCurrentWeekRange,
    buildVolumeProgressDisplayData,
};
export type { DisplayArchetypeData, ProgressArchetypeName };

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
