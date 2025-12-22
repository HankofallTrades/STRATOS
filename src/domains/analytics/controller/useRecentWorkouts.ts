import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as analyticsRepo from '../model/analyticsRepository';

export const useRecentWorkouts = (userId: string | undefined) => {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: recentWorkouts = [], isLoading: isLoadingWorkouts, error: errorWorkouts } = useQuery({
        queryKey: ['recentWorkoutsSummary', userId],
        queryFn: () => userId ? analyticsRepo.fetchRecentWorkoutsSummary(userId, 5) : Promise.resolve([]),
        enabled: !!userId,
        staleTime: 1 * 60 * 1000,
    });

    const {
        data: detailedWorkout,
        isLoading: isLoadingDetailedWorkout,
        error: errorDetailedWorkout,
    } = useQuery({
        queryKey: ['detailedWorkout', selectedWorkoutId, userId],
        queryFn: () => {
            if (!selectedWorkoutId || !userId) return Promise.resolve(null);
            return analyticsRepo.fetchDetailedWorkoutById(userId, selectedWorkoutId);
        },
        enabled: !!selectedWorkoutId && !!userId && isDialogOpen,
        staleTime: 5 * 60 * 1000,
    });

    const handleCardClick = useCallback((workoutId: string) => {
        setSelectedWorkoutId(workoutId);
        setIsDialogOpen(true);
    }, []);

    const handleDialogClose = useCallback(() => {
        setIsDialogOpen(false);
        setSelectedWorkoutId(null);
    }, []);

    return {
        recentWorkouts,
        isLoadingWorkouts,
        errorWorkouts,
        selectedWorkoutId,
        isDialogOpen,
        detailedWorkout,
        isLoadingDetailedWorkout,
        errorDetailedWorkout,
        handleCardClick,
        handleDialogClose
    };
};
