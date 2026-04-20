import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import * as fitnessRepo from '../data/fitnessRepository';
import { buildRecommendedStrengthSetPerformances } from '../data/recommendations';
import {
    addSetToExercise as addSetAction,
    addCardioSetToExercise as addCardioSetAction,
    selectSessionFocus,
    updateWorkoutExerciseEquipment as updateEquipmentAction,
    updateWorkoutExerciseVariation as updateVariationAction,
    deleteWorkoutExercise as deleteExerciseAction,
    updateSet as updateSetAction,
    updateCardioSet as updateCardioSetAction,
} from "@/state/workout/workoutSlice";
import {
    WorkoutExercise,
    isCardioExercise,
    isCardioSet,
    isStrengthSet,
    secondsToTime,
    timeToSeconds
} from "@/lib/types/workout";
import type { LastWorkoutExerciseInstanceSet } from '../data/fitnessRepository';

const DEFAULT_VARIATION = 'Standard';

interface WorkoutExerciseLookups {
    historicalSets: LastWorkoutExerciseInstanceSet[] | null;
    isLoading: boolean;
    userWeight: number | null;
    variations: string[];
}

export const useWorkoutExercise = (
    workoutExercise: WorkoutExercise,
    lookups: WorkoutExerciseLookups
) => {
    const dispatch = useAppDispatch();
    const sessionFocus = useAppSelector(selectSessionFocus);
    const queryClient = useQueryClient();
    const exerciseId = workoutExercise.exercise.id;

    const [isAddingVariation, setIsAddingVariation] = useState(false);
    const [newVariationName, setNewVariationName] = useState('');
    const variations = useMemo(
        () => (lookups.variations.length > 0 ? lookups.variations : [DEFAULT_VARIATION]),
        [lookups.variations]
    );
    const historicalSets = lookups.historicalSets;
    const userWeight = lookups.userWeight;

    // Mutations
    const addVariationMutation = useMutation({
        mutationFn: (name: string) => fitnessRepo.createVariation(exerciseId, name),
        onSuccess: (newVar) => {
            queryClient.invalidateQueries({ queryKey: ['workoutExerciseVariations'] });
            setNewVariationName('');
            setIsAddingVariation(false);
            dispatch(updateVariationAction({
                workoutExerciseId: workoutExercise.id,
                variation: newVar.variation_name
            }));
        }
    });

    // Derived Values
    const historicalSetPerformances = useMemo(() => {
        if (!historicalSets) return {};
        const performances: Record<number, { weight: number; reps: number | null; time_seconds: number | null }> = {};
        historicalSets.forEach(set => {
            if (set.set_number) performances[set.set_number] = {
                weight: set.weight,
                reps: set.reps,
                time_seconds: set.time_seconds
            };
        });
        return performances;
    }, [historicalSets]);

    const recommendedSetPerformances = useMemo(() => {
        if (isCardioExercise(workoutExercise.exercise) || workoutExercise.exercise.is_static) {
            return {};
        }

        return buildRecommendedStrengthSetPerformances({
            focus: sessionFocus,
            currentSetCount: workoutExercise.sets.length,
            historicalSets,
        });
    }, [historicalSets, sessionFocus, workoutExercise.exercise, workoutExercise.sets.length]);

    const overallLastPerformance = useMemo(() => {
        if (!historicalSets || historicalSets.length === 0) return null;
        const isStatic = workoutExercise.exercise.is_static;

        return historicalSets.reduce<typeof historicalSets[number] | null>((best, set) => {
            if (!best) return set;
            if (isStatic) {
                if (set.weight > best.weight || (set.weight === best.weight && (set.time_seconds ?? 0) > (best.time_seconds ?? 0))) return set;
            } else {
                if (set.weight > best.weight || (set.weight === best.weight && (set.reps ?? 0) > (best.reps ?? 0))) return set;
            }
            return best;
        }, null);
    }, [historicalSets, workoutExercise.exercise.is_static]);

    // Actions
    const addSet = useCallback(() => {
        if (isCardioExercise(workoutExercise.exercise)) {
            dispatch(addCardioSetAction({
                workoutExerciseId: workoutExercise.id,
                exerciseId: workoutExercise.exercise.id,
            }));
        } else {
            dispatch(addSetAction({
                workoutExerciseId: workoutExercise.id,
                exerciseId: workoutExercise.exercise.id,
                isStatic: workoutExercise.exercise.is_static ?? false,
                userBodyweight: userWeight,
            }));
        }
    }, [dispatch, workoutExercise, userWeight]);

    const updateEquipment = useCallback((equipment: string) => {
        dispatch(updateEquipmentAction({
            workoutExerciseId: workoutExercise.id,
            equipmentType: equipment
        }));
    }, [dispatch, workoutExercise.id]);

    const updateVariation = useCallback((variation: string) => {
        if (variation === 'add_new') {
            setIsAddingVariation(true);
        } else {
            setIsAddingVariation(false);
            dispatch(updateVariationAction({
                workoutExerciseId: workoutExercise.id,
                variation
            }));
        }
    }, [dispatch, workoutExercise.id]);

    const deleteExercise = useCallback(() => {
        dispatch(deleteExerciseAction(workoutExercise.id));
    }, [dispatch, workoutExercise.id]);

    const updateLastSetField = useCallback((field: 'weight' | 'reps' | 'time' | 'distance', change: number) => {
        const sets = workoutExercise.sets;
        if (sets.length === 0) return;

        const lastSetIndex = sets.length - 1;
        const lastSet = sets[lastSetIndex];
        const prevPerf = historicalSetPerformances[lastSetIndex + 1];

        if (isCardioSet(lastSet)) {
            const currentSeconds = timeToSeconds(lastSet.time);
            const duration = Math.max(0, currentSeconds + (field === 'time' ? change : 0));
            const distance = Math.max(0, (lastSet.distance_km || 0) + (field === 'distance' ? change : 0));

            dispatch(updateCardioSetAction({
                workoutExerciseId: workoutExercise.id,
                setId: lastSet.id,
                time: secondsToTime(duration),
                distance_km: distance,
            }));
        } else if (isStrengthSet(lastSet)) {
            const isStatic = workoutExercise.exercise.is_static;
            const weight = Math.max(0, (lastSet.weight || prevPerf?.weight || 0) + (field === 'weight' ? change : 0));

            let reps = lastSet.reps;
            let time = lastSet.time;

            if (isStatic) {
                const currentSeconds = time ? timeToSeconds(time) : (prevPerf?.time_seconds || 0);
                const duration = Math.max(0, currentSeconds + (field === 'time' ? change : 0));
                time = secondsToTime(duration);
                reps = null;
            } else {
                reps = Math.max(0, (lastSet.reps || prevPerf?.reps || 0) + (field === 'reps' ? change : 0));
                time = null;
            }

            dispatch(updateSetAction({
                workoutExerciseId: workoutExercise.id,
                setId: lastSet.id,
                weight,
                reps: reps as number, // Cast due to internal type expectations (usually non-null in strength)
                time: time ?? undefined,
            }));
        }
    }, [dispatch, workoutExercise, historicalSetPerformances]);

    const copyCompletedValueToLatestSet = useCallback((field: 'weight' | 'reps', value: number) => {
        if (value <= 0) return;

        const latestSet = workoutExercise.sets.at(-1);
        if (!latestSet || latestSet.completed || !isStrengthSet(latestSet)) {
            return;
        }

        const nextWeight = field === 'weight' ? value : latestSet.weight;

        if (workoutExercise.exercise.is_static ?? false) {
            dispatch(updateSetAction({
                workoutExerciseId: workoutExercise.id,
                setId: latestSet.id,
                weight: nextWeight,
                reps: null,
                time: latestSet.time ?? null,
            }));
            return;
        }

        dispatch(updateSetAction({
            workoutExerciseId: workoutExercise.id,
            setId: latestSet.id,
            weight: nextWeight,
            reps: field === 'reps' ? value : latestSet.reps,
            time: null,
        }));
    }, [dispatch, workoutExercise]);

    const handleSaveNewVariation = useCallback(() => {
        if (newVariationName.trim()) {
            addVariationMutation.mutate(newVariationName.trim());
        }
    }, [newVariationName, addVariationMutation]);

    return {
        variations,
        historicalSetPerformances,
        recommendedSetPerformances,
        overallLastPerformance,
        userWeight,
        isAddingVariation,
        newVariationName,
        isLoading: lookups.isLoading,
        addVariationMutationStatus: addVariationMutation.status,
        setNewVariationName,
        setIsAddingVariation,
        addSet,
        updateEquipment,
        updateVariation,
        deleteExercise,
        updateLastSetField,
        copyCompletedValueToLatestSet,
        handleSaveNewVariation,
    };
};
