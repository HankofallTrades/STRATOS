import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from "@/hooks/redux";
import { useAuth } from '@/state/auth/AuthProvider';
import * as fitnessRepo from '../model/fitnessRepository';
import {
    addSetToExercise as addSetAction,
    addCardioSetToExercise as addCardioSetAction,
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

const DEFAULT_VARIATION = 'Standard';

export const useWorkoutExercise = (workoutExercise: WorkoutExercise) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const userId = user?.id;
    const exerciseId = workoutExercise.exercise.id;

    const [isAddingVariation, setIsAddingVariation] = useState(false);
    const [newVariationName, setNewVariationName] = useState('');

    // Queries
    const { data: variations = [DEFAULT_VARIATION], isLoading: isLoadingVariations } = useQuery({
        queryKey: ['exerciseVariations', exerciseId],
        queryFn: () => fitnessRepo.fetchVariations(exerciseId),
        enabled: !!exerciseId,
        select: (data) => [DEFAULT_VARIATION, ...data.map(v => v.variation_name).filter(v => v !== DEFAULT_VARIATION)],
    });

    const { data: historicalSets, isLoading: isLoadingHistory } = useQuery({
        queryKey: [
            'lastPerformance',
            userId,
            exerciseId,
            workoutExercise.equipmentType,
            workoutExercise.variation ?? DEFAULT_VARIATION
        ],
        queryFn: () => fitnessRepo.fetchLastWorkoutExerciseInstance(
            userId!,
            exerciseId,
            workoutExercise.equipmentType,
            workoutExercise.variation ?? DEFAULT_VARIATION
        ),
        enabled: !!userId && !!exerciseId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: userWeight } = useQuery({
        queryKey: ['userWeight', userId],
        queryFn: () => fitnessRepo.getUserWeight(userId!),
        enabled: !!userId,
        staleTime: 15 * 60 * 1000,
    });

    // Mutations
    const addVariationMutation = useMutation({
        mutationFn: (name: string) => fitnessRepo.createVariation(exerciseId, name),
        onSuccess: (newVar) => {
            queryClient.invalidateQueries({ queryKey: ['exerciseVariations', exerciseId] });
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

    const overallLastPerformance = useMemo(() => {
        if (!historicalSets || historicalSets.length === 0) return null;
        const isStatic = workoutExercise.exercise.is_static;

        return historicalSets.reduce((best, set) => {
            if (!best) return set;
            if (isStatic) {
                if (set.weight > best.weight || (set.weight === best.weight && (set.time_seconds ?? 0) > (best.time_seconds ?? 0))) return set;
            } else {
                if (set.weight > best.weight || (set.weight === best.weight && (set.reps ?? 0) > (best.reps ?? 0))) return set;
            }
            return best;
        }, null as any);
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
                userBodyweight: userWeight?.weight_kg ?? null,
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

    const handleSaveNewVariation = useCallback(() => {
        if (newVariationName.trim()) {
            addVariationMutation.mutate(newVariationName.trim());
        }
    }, [newVariationName, addVariationMutation]);

    return {
        variations,
        historicalSetPerformances,
        overallLastPerformance,
        userWeight: userWeight?.weight_kg ?? null,
        isAddingVariation,
        newVariationName,
        isLoading: isLoadingVariations || isLoadingHistory,
        setNewVariationName,
        setIsAddingVariation,
        addSet,
        updateEquipment,
        updateVariation,
        deleteExercise,
        updateLastSetField,
        handleSaveNewVariation,
    };
};
