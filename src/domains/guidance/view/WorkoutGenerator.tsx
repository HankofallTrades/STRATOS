import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';

import { Button } from '@/components/core/button';
import { startWorkout, addExerciseToWorkout } from '@/state/workout/workoutSlice';
import { selectWorkoutHistory } from '@/state/history/historySlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import type { Exercise } from '@/lib/types/workout';
import { fetchMovementArchetypes } from '../model/guidanceRepository';
import { useWorkoutGenerator } from '../controller/useWorkoutGenerator';
import { Skeleton } from '@/components/core/skeleton';

export const WorkoutGenerator: React.FC = () => {
    const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);

    const { data: baseExercises, isLoading: isLoadingExercises, error: errorExercises } = useQuery<Exercise[], Error>({
        queryKey: ['exercises'],
        queryFn: async () => (await fetchExercisesFromDB()) as Exercise[],
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    const { data: movementArchetypes, error: errorMovementArchetypes, isLoading: isLoadingMovementArchetypes } = useQuery({
        queryKey: ['movementArchetypes'],
        queryFn: fetchMovementArchetypes,
        staleTime: Infinity,
        enabled: !!baseExercises,
    });

    const { generateWorkout } = useWorkoutGenerator(baseExercises, movementArchetypes);

    const handleGenerateWorkout = () => {
        setGenerationStatusMessage(null);
        try {
            generateWorkout();
        } catch (error: any) {
            setGenerationStatusMessage(error.message);
        }
    };

    const isLoading = isLoadingExercises || isLoadingMovementArchetypes;
    const error = errorExercises || errorMovementArchetypes;

    if (error) {
        const errorMessage = errorExercises?.message || errorMovementArchetypes?.message || 'Error loading workout data';
        return (
            <Button variant="destructive" size="sm" disabled className="w-full">
                {errorMessage}
            </Button>
        );
    }
    if (isLoading) {
        return <Skeleton className="h-9 w-full" />;
    }
    return (
        <>
            <Button
                onClick={handleGenerateWorkout}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="w-full"
            >
                Generate Strength Workout
            </Button>
            {generationStatusMessage && (
                <p className="text-sm text-red-500 mt-2 text-center">
                    {generationStatusMessage}
                </p>
            )}
        </>
    );
}; 