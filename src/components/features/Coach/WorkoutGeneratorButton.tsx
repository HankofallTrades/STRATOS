import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/core/button';
import { startWorkout, addExerciseToWorkout } from '@/state/workout/workoutSlice';
import { useAppDispatch } from '@/hooks/redux';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import type { Exercise, ExerciseSet, WorkoutExercise } from '@/lib/types/workout';
import { Skeleton } from '@/components/core/skeleton';

export const WorkoutGeneratorButton: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { data: exercises, isLoading, error } = useQuery<Exercise[], Error>({
        queryKey: ['exercises'],
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    const handleGenerateWorkout = () => {
        if (!exercises) {
            console.log("Exercises data is not available.");
            return;
        }

        // TODO: Replace this hardcoded list with dynamic AI/algorithmic generation based on user goals/focus.
        const targetExerciseNames = ['Squat', 'Bench Press', 'Deadlift', 'Row'];
        const exercisesToCreate: Exercise[] = [];

        targetExerciseNames.forEach(name => {
            const found = exercises.find(ex => ex.name.toLowerCase() === name.toLowerCase());
            if (found) {
                exercisesToCreate.push(found);
            } else {
                console.warn(`Exercise "${name}" not found in Supabase data.`);
            }
        });

        if (exercisesToCreate.length === 0) {
            console.error("None of the target exercises were found. Cannot create workout.");
            return;
        }

        dispatch(startWorkout());

        exercisesToCreate.forEach(exercise => {
            // Determine equipment and variation for the WorkoutExercise and the default set
            const defaultEquipment = exercise.default_equipment_type ?? undefined;
            const defaultVariation = 'Standard';

            // Create the default set first
            const defaultSet: ExerciseSet = {
                id: uuidv4(),
                weight: 0,
                reps: 0,
                exerciseId: exercise.id,
                completed: false,
                equipmentType: defaultEquipment,
                variation: defaultVariation,
            };

            // Create the WorkoutExercise including the default set
            const workoutExercise: WorkoutExercise = {
                id: uuidv4(),
                exerciseId: exercise.id,
                exercise: { ...exercise },
                sets: [defaultSet],
                equipmentType: defaultEquipment,
                variation: defaultVariation,
            };
            dispatch(addExerciseToWorkout(workoutExercise));
        });

        navigate('/workout');
    };

    if (error) {
        return (
            <Button variant="destructive" size="sm" disabled className="w-full">
                Error loading exercises
            </Button>
        );
    }

    if (isLoading) {
        return <Skeleton className="h-9 w-full" />;
    }

    return (
        <Button
            onClick={handleGenerateWorkout}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full"
        >
            Generate Strength Workout
        </Button>
    );
}; 