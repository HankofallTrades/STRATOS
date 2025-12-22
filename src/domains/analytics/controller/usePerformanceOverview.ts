import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exercise } from '@/lib/types/workout';
import * as analyticsRepo from '../model/analyticsRepository';

export const usePerformanceOverview = (userId: string | undefined, exercises: Exercise[]) => {
    const { data: stats, isLoading: isLoadingStats, error: errorStats } = useQuery({
        queryKey: ['performanceStats', userId],
        queryFn: () => userId ? analyticsRepo.fetchPerformanceStats(userId) : Promise.resolve({ total_workouts: 0, total_duration_seconds: 0, most_common_exercise_id: null }),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    const averageTime = useMemo(() => {
        if (!stats || stats.total_workouts === 0) return 0;
        return Math.round(stats.total_duration_seconds / stats.total_workouts);
    }, [stats]);

    const mostCommonExerciseName = useMemo(() => {
        if (!stats?.most_common_exercise_id || exercises.length === 0) return null;
        const found = exercises.find(ex => ex.id === stats.most_common_exercise_id);
        return found?.name ?? "Unknown";
    }, [exercises, stats?.most_common_exercise_id]);

    return {
        stats,
        isLoadingStats,
        errorStats,
        averageTime,
        mostCommonExerciseName
    };
};
