import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';

import { Button } from '@/components/core/button';
import { startWorkout, addExerciseToWorkout } from '@/state/workout/workoutSlice';
import { selectWorkoutHistory } from '@/state/history/historySlice';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchExercisesFromDB, fetchExerciseMuscleGroupMappings } from '@/lib/integrations/supabase/exercises';
import type { ExerciseMuscleGroupMapping } from '@/lib/integrations/supabase/exercises';
import type { Exercise, ExerciseSet, WorkoutExercise, Workout } from '@/lib/types/workout';
import { Skeleton } from '@/components/core/skeleton';

const calculateWeeklySetsPerMuscleGroup = (
    workoutHistory: Workout[],
    exerciseMap: Map<string, Exercise>
): Record<string, number> => {
    const weeklySets: Record<string, number> = {};
    const today = startOfDay(new Date());

    workoutHistory.forEach(workout => {
        const workoutDate = startOfDay(new Date(workout.date));
        if (differenceInDays(today, workoutDate) < 7) {
            workout.exercises.forEach(workoutExercise => {
                const completedSets = workoutExercise.sets.filter(set => set.completed);
                if (completedSets.length > 0) {
                    const exerciseDetails = exerciseMap.get(workoutExercise.exerciseId);
                    if (exerciseDetails?.muscle_groups) {
                        exerciseDetails.muscle_groups.forEach(muscleGroup => {
                            weeklySets[muscleGroup] = (weeklySets[muscleGroup] || 0) + completedSets.length;
                        });
                    }
                }
            });
        }
    });
    return weeklySets;
};

const selectExercisesForWorkout = (
    availableExercises: Exercise[],
    weeklySets: Record<string, number>,
    minSetsPerWeek = 15,
    numExercisesToSelect = 4
): Exercise[] => {
    const muscleGroupsBelowTarget: { name: string; deficit: number }[] = [];
    const allTargetedMuscleGroups = new Set<string>(availableExercises.flatMap(ex => ex.muscle_groups || []));

    allTargetedMuscleGroups.forEach(group => {
        const setsDone = weeklySets[group] || 0;
        if (setsDone < minSetsPerWeek) {
            muscleGroupsBelowTarget.push({ name: group, deficit: minSetsPerWeek - setsDone });
        }
    });

    muscleGroupsBelowTarget.sort((a, b) => b.deficit - a.deficit);

    const selectedExercises: Exercise[] = [];
    const selectedExerciseIds = new Set<string>();
    const coveredMuscleGroups = new Set<string>();

    for (const targetGroup of muscleGroupsBelowTarget) {
        if (selectedExercises.length >= numExercisesToSelect) break;
        if (coveredMuscleGroups.has(targetGroup.name)) continue;

        const potentialExercises = availableExercises
            .filter(ex => 
                !selectedExerciseIds.has(ex.id) && 
                ex.muscle_groups?.includes(targetGroup.name)
            )
            .sort((exA, exB) => {
                const scoreA = exA.muscle_groups?.filter(mg => !coveredMuscleGroups.has(mg) && muscleGroupsBelowTarget.some(t => t.name === mg)).length || 0;
                const scoreB = exB.muscle_groups?.filter(mg => !coveredMuscleGroups.has(mg) && muscleGroupsBelowTarget.some(t => t.name === mg)).length || 0;
                return scoreB - scoreA;
            });
        
        if (potentialExercises.length > 0) {
            const bestExercise = potentialExercises[0];
            selectedExercises.push(bestExercise);
            selectedExerciseIds.add(bestExercise.id);
            bestExercise.muscle_groups?.forEach(mg => coveredMuscleGroups.add(mg));
        }
    }

    let remainingNeededGroups = muscleGroupsBelowTarget.filter(mg => !coveredMuscleGroups.has(mg.name));
    while (selectedExercises.length < numExercisesToSelect && remainingNeededGroups.length > 0) {
        const targetGroup = remainingNeededGroups[0];
        const backupExercise = availableExercises.find(ex => 
            !selectedExerciseIds.has(ex.id) && 
            ex.muscle_groups?.includes(targetGroup.name)
        );
        
        if (backupExercise) {
            selectedExercises.push(backupExercise);
            selectedExerciseIds.add(backupExercise.id);
            backupExercise.muscle_groups?.forEach(mg => coveredMuscleGroups.add(mg));
            remainingNeededGroups = muscleGroupsBelowTarget.filter(mg => !coveredMuscleGroups.has(mg.name));
        } else {
            remainingNeededGroups.shift(); 
        }
    }
    
    if (selectedExercises.length < numExercisesToSelect) {
        const fallbackExercises = availableExercises.filter(ex => !selectedExerciseIds.has(ex.id));
        const neededCount = numExercisesToSelect - selectedExercises.length;
        selectedExercises.push(...fallbackExercises.slice(0, neededCount));
    }

    return selectedExercises;
};

export const WorkoutGenerator: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const workoutHistory = useAppSelector(selectWorkoutHistory);

    const { data: baseExercises, isLoading: isLoadingExercises, error: errorExercises } = useQuery<Exercise[], Error>({
        queryKey: ['exercises'],
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    const { data: muscleGroupMappings, isLoading: isLoadingMappings, error: errorMappings } = useQuery<ExerciseMuscleGroupMapping, Error>({
        queryKey: ['exerciseMuscleGroupMappings'],
        queryFn: fetchExerciseMuscleGroupMappings,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        enabled: !!baseExercises,
    });

    const exercisesWithMuscleGroups = useMemo((): Exercise[] => {
        if (!baseExercises || !muscleGroupMappings) return [];
        return baseExercises.map(ex => ({
            ...ex,
            muscle_groups: muscleGroupMappings[ex.id] || [],
        }));
    }, [baseExercises, muscleGroupMappings]);
    
    const exerciseMap = useMemo((): Map<string, Exercise> => {
         return new Map(exercisesWithMuscleGroups.map(ex => [ex.id, ex]));
    }, [exercisesWithMuscleGroups]);

    const handleGenerateWorkout = () => {
        if (exercisesWithMuscleGroups.length === 0) {
            console.error("Exercise data with muscle groups is not available.");
            return;
        }

        const weeklySets = calculateWeeklySetsPerMuscleGroup(workoutHistory, exerciseMap);
        console.log("Weekly Sets Per Muscle Group:", weeklySets);

        const exercisesToCreate = selectExercisesForWorkout(exercisesWithMuscleGroups, weeklySets);
        console.log("Selected Exercises:", exercisesToCreate.map(ex => ex.name));

        if (exercisesToCreate.length === 0) {
            console.error("Failed to select any exercises based on history. Generating default workout.");
            return;
        }

        dispatch(startWorkout());

        exercisesToCreate.forEach(exercise => {
            const defaultEquipment = exercise.default_equipment_type ?? undefined;
            const defaultVariation = 'Standard';

            const defaultSet: ExerciseSet = {
                id: uuidv4(),
                weight: 0,
                reps: 0,
                exerciseId: exercise.id,
                completed: false,
                equipmentType: defaultEquipment,
                variation: defaultVariation,
            };

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

    const isLoading = isLoadingExercises || isLoadingMappings;
    const error = errorExercises || errorMappings;

    if (error) {
        const errorMessage = errorExercises?.message || errorMappings?.message || 'Error loading workout data';
        console.error("Workout Generator Error:", error);
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