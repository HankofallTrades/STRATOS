import React, { useState } from 'react';

import { Button } from '@/components/core/button';
import { useWorkoutGenerator } from '../hooks/useWorkoutGenerator';
import { useGuidanceWorkoutCatalog } from '../hooks/useGuidanceWorkoutCatalog';
import { Skeleton } from '@/components/core/skeleton';

export const WorkoutGenerator: React.FC = () => {
    const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);

    const { baseExercises, movementArchetypes, error, isLoading } =
        useGuidanceWorkoutCatalog();

    const { generateWorkout } = useWorkoutGenerator(baseExercises, movementArchetypes);

    const handleGenerateWorkout = async () => {
        setGenerationStatusMessage(null);
        try {
            await generateWorkout();
        } catch (error: unknown) {
            setGenerationStatusMessage(
                error instanceof Error ? error.message : 'Failed to generate workout.'
            );
        }
    };

    if (error) {
        const errorMessage = error.message || 'Error loading workout data';
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
