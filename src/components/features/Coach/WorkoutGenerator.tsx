import React, { useMemo, useState } from 'react';
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

// Archetype targets (using DB archetype names)
const ARCHETYPE_TARGETS: Record<string, number> = {
    'squat': 7,
    'lunge': 7,
    'push_vertical': 5,
    'push_horizontal': 5,
    'pull_vertical': 5,
    'pull_horizontal': 5,
    'bend': 7,
    'twist': 7,
};

// Helper to get archetype name from exercise (using archetype_id and archetypeMap)
const getArchetypeName = (exercise: Exercise, archetypeMap: Map<string, string>): string | undefined => {
    if (!exercise.archetype_id) return undefined;
    return archetypeMap.get(exercise.archetype_id)?.toLowerCase();
};

// Calculate weekly sets per archetype
const calculateWeeklySetsPerArchetype = (
    workoutHistory: Workout[],
    exerciseMap: Map<string, Exercise>,
    archetypeMap: Map<string, string>
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
                    if (!exerciseDetails) return;
                    const archetype = getArchetypeName(exerciseDetails, archetypeMap);
                    if (!archetype) return;
                    if (!weeklySets[archetype]) weeklySets[archetype] = 0;
                    weeklySets[archetype] += completedSets.length;
                }
            });
        }
    });
    return weeklySets;
};

// Select exercises for workout based on archetype deficits
const selectExercisesForWorkout = (
    availableExercises: Exercise[],
    weeklySets: Record<string, number>,
    archetypeMap: Map<string, string>,
    numExercisesToSelect = 4,
    excludeExerciseIds: string[] = []
): Exercise[] => {
    // Find archetypes below target
    const archetypeDeficits: { name: string; deficit: number }[] = [];
    Object.entries(ARCHETYPE_TARGETS).forEach(([archetype, target]) => {
        const sets = weeklySets[archetype] || 0;
        if (sets < target) {
            archetypeDeficits.push({ name: archetype, deficit: target - sets });
        }
    });
    archetypeDeficits.sort((a, b) => b.deficit - a.deficit);

    const selectedExercises: Exercise[] = [];
    const selectedExerciseIds = new Set<string>();
    const coveredArchetypes = new Set<string>();

    for (const target of archetypeDeficits) {
        if (selectedExercises.length >= numExercisesToSelect) break;
        if (coveredArchetypes.has(target.name)) continue;
        const potentialExercises = availableExercises.filter(ex => {
            if (selectedExerciseIds.has(ex.id) || excludeExerciseIds.includes(ex.id)) return false;
            const archetype = getArchetypeName(ex, archetypeMap);
            return archetype === target.name;
        });
        if (potentialExercises.length > 0) {
            const bestExercise = potentialExercises[0];
            selectedExercises.push(bestExercise);
            selectedExerciseIds.add(bestExercise.id);
            coveredArchetypes.add(target.name);
        }
    }
    // Fallback: fill with any remaining exercises
    if (selectedExercises.length < numExercisesToSelect) {
        const fallbackExercises = availableExercises.filter(ex =>
            !selectedExerciseIds.has(ex.id) && !excludeExerciseIds.includes(ex.id)
        );
        const neededCount = numExercisesToSelect - selectedExercises.length;
        selectedExercises.push(...fallbackExercises.slice(0, neededCount));
    }
    return selectedExercises;
};

export const WorkoutGenerator: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const workoutHistory = useAppSelector(selectWorkoutHistory);
    const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);

    const { data: baseExercises, isLoading: isLoadingExercises, error: errorExercises } = useQuery<Exercise[], Error>({
        queryKey: ['exercises'],
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    // Fetch movement archetypes for mapping id -> name
    const { data: movementArchetypes } = useQuery<{ id: string; name: string }[], Error>({
        queryKey: ['movementArchetypes'],
        queryFn: async () => {
            const { data, error } = await import('@/lib/integrations/supabase/client').then(m => m.supabase.from('movement_archetypes').select('id, name'));
            if (error) throw error;
            return data || [];
        },
        staleTime: Infinity,
        enabled: !!baseExercises,
    });

    const archetypeMap = useMemo(() => {
        if (!movementArchetypes) return new Map();
        return new Map(movementArchetypes.map(a => [a.id, a.name]));
    }, [movementArchetypes]);

    const exercisesWithArchetypes = useMemo((): Exercise[] => {
        if (!baseExercises) return [];
        return baseExercises.filter(ex => ex.archetype_id && archetypeMap.has(ex.archetype_id));
    }, [baseExercises, archetypeMap]);

    const exerciseMap = useMemo((): Map<string, Exercise> => {
        return new Map(exercisesWithArchetypes.map(ex => [ex.id, ex]));
    }, [exercisesWithArchetypes]);

    const handleGenerateWorkout = () => {
        setGenerationStatusMessage(null);
        let numExercisesToSelect = 5;
        let excludeExerciseIds: string[] = [];
        if (workoutHistory && workoutHistory.length > 0) {
            const latestWorkoutDate = workoutHistory.reduce((latest, workout) => {
                const current = startOfDay(new Date(workout.date));
                return current > latest ? current : latest;
            }, new Date(0));
            const latestWorkout = workoutHistory.find(workout =>
                startOfDay(new Date(workout.date)).getTime() === latestWorkoutDate.getTime()
            );
            if (latestWorkoutDate.getTime() > 0) {
                const today = startOfDay(new Date());
                const daysSinceLastWorkout = differenceInDays(today, latestWorkoutDate);
                if (daysSinceLastWorkout <= 1) {
                    numExercisesToSelect = 3;
                    if (latestWorkout) {
                        excludeExerciseIds = latestWorkout.exercises.map(ex => ex.exerciseId);
                    }
                } else if (daysSinceLastWorkout <= 3) {
                    numExercisesToSelect = 4;
                    if (latestWorkout) {
                        excludeExerciseIds = latestWorkout.exercises.map(ex => ex.exerciseId);
                    }
                } else {
                    numExercisesToSelect = 5;
                }
            }
        }
        if (exercisesWithArchetypes.length === 0) {
            const msg = "Exercise data with archetypes is not available. Cannot generate workout.";
            console.error(msg);
            setGenerationStatusMessage(msg);
            return;
        }
        const weeklySets = calculateWeeklySetsPerArchetype(workoutHistory, exerciseMap, archetypeMap);
        const exercisesToCreate = selectExercisesForWorkout(
            exercisesWithArchetypes,
            weeklySets,
            archetypeMap,
            numExercisesToSelect,
            excludeExerciseIds
        );
        if (exercisesToCreate.length === 0) {
            const msg = "Failed to select any exercises based on archetype history. Please try again later or adjust your activities.";
            console.error(msg);
            setGenerationStatusMessage(msg);
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

    const isLoading = isLoadingExercises;
    const error = errorExercises;
    if (error) {
        const errorMessage = errorExercises?.message || 'Error loading workout data';
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