import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from "@/hooks/redux";
import { useAuth } from '@/state/auth/AuthProvider';
import { useToast } from "@/components/core/Toast/use-toast";
import * as fitnessRepo from '../model/fitnessRepository';
import {
    addExerciseToWorkout,
    replaceWorkoutExercise,
} from "@/state/workout/workoutSlice";
import { Exercise, WorkoutExercise, isCardioExercise, secondsToTime } from "@/lib/types/workout";
import { v4 as uuidv4 } from 'uuid';

interface ExerciseSelectionOptions {
    mode?: 'add' | 'replace';
    workoutExerciseId?: string;
    setCount?: number;
}

export const useExerciseSelector = (isOpen: boolean, selectionOptions?: ExerciseSelectionOptions) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState("");
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState("");
    const [isStaticNewExercise, setIsStaticNewExercise] = useState(false);
    const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);

    // Queries
    const { data: exercises = [], isLoading: isLoadingExercises } = useQuery({
        queryKey: ['exercises'],
        queryFn: async () => (await fitnessRepo.fetchExercises()) as Exercise[],
        enabled: isOpen,
        staleTime: 1000 * 60 * 5,
    });

    const { data: archetypes = [], isLoading: isLoadingArchetypes } = useQuery({
        queryKey: ['movementArchetypes'],
        queryFn: fitnessRepo.fetchMovementArchetypes,
        enabled: isOpen && isAddingNew,
        staleTime: Infinity,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: { name: string; is_static: boolean; archetype_id: string }) =>
            fitnessRepo.createExercise(user!.id, data),
        onSuccess: (newExercise) => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] });
            selectExercise(newExercise as Exercise);
            toast({ title: "Success", description: "Exercise created and selected." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to create exercise.", variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (exerciseId: string) => fitnessRepo.deleteExercise(exerciseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] });
            toast({ title: "Success", description: "Exercise deleted permanently." });
        }
    });

    const hideMutation = useMutation({
        mutationFn: (exerciseId: string) => fitnessRepo.hideExercise(user!.id, exerciseId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] });
            toast({ title: "Success", description: "Exercise removed from your list." });
        }
    });

    // Actions
    const buildWorkoutExercise = useCallback(async (exercise: Exercise): Promise<WorkoutExercise> => {
        const workoutExerciseId =
            selectionOptions?.mode === 'replace' && selectionOptions.workoutExerciseId
                ? selectionOptions.workoutExerciseId
                : uuidv4();
        const setCount = Math.max(selectionOptions?.setCount ?? 1, 1);

        let config = { equipmentType: exercise.default_equipment_type || 'Barbell', variation: 'Standard' };
        try {
            const lastConfig = await fitnessRepo.fetchLastConfigForExercise(user!.id, exercise.id);
            if (lastConfig) {
                config = {
                    equipmentType: lastConfig.equipmentType || config.equipmentType,
                    variation: lastConfig.variation || config.variation
                };
            }
        } catch (e) {
            console.warn("Failed to fetch last config", e);
        }

        const sets = isCardioExercise(exercise)
            ? Array.from({ length: setCount }, () => ({
                id: uuidv4(),
                exerciseId: exercise.id,
                time: secondsToTime(300),
                completed: false,
            }))
            : Array.from({ length: setCount }, () => ({
                id: uuidv4(),
                weight: 0,
                reps: exercise.is_static ? null : 0,
                time: exercise.is_static ? secondsToTime(30) : null,
                exerciseId: exercise.id,
                completed: false,
                variation: config.variation,
                equipmentType: config.equipmentType,
            }));

        return {
            id: workoutExerciseId,
            exerciseId: exercise.id,
            exercise,
            equipmentType: config.equipmentType,
            variation: config.variation,
            sets,
        };
    }, [selectionOptions?.mode, selectionOptions?.setCount, selectionOptions?.workoutExerciseId, user]);

    const selectExercise = useCallback(async (exercise: Exercise) => {
        const workoutExercise = await buildWorkoutExercise(exercise);

        if (selectionOptions?.mode === 'replace' && selectionOptions.workoutExerciseId) {
            dispatch(replaceWorkoutExercise(workoutExercise));
        } else {
            dispatch(addExerciseToWorkout(workoutExercise));
        }

        setSearchQuery("");
        setIsAddingNew(false);
    }, [buildWorkoutExercise, dispatch, selectionOptions?.mode, selectionOptions?.workoutExerciseId]);

    const removeExercise = useCallback((exercise: Exercise) => {
        if (exercise.created_by_user_id === user?.id) {
            deleteMutation.mutate(exercise.id);
        } else {
            hideMutation.mutate(exercise.id);
        }
    }, [user, deleteMutation, hideMutation]);

    const handleCreate = useCallback(() => {
        if (newExerciseName.trim() && selectedArchetypeId) {
            createMutation.mutate({
                name: newExerciseName.trim(),
                is_static: isStaticNewExercise,
                archetype_id: selectedArchetypeId
            });
        }
    }, [newExerciseName, isStaticNewExercise, selectedArchetypeId, createMutation]);

    const filteredExercises = useMemo(() => {
        return exercises.filter(ex =>
            ex.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [exercises, searchQuery]);

    return {
        exercises: filteredExercises,
        archetypes,
        searchQuery,
        isAddingNew,
        newExerciseName,
        isStaticNewExercise,
        selectedArchetypeId,
        isLoading: isLoadingExercises,
        isLoadingArchetypes,
        isPending: createMutation.isPending || deleteMutation.isPending || hideMutation.isPending,
        setSearchQuery,
        setIsAddingNew,
        setNewExerciseName,
        setIsStaticNewExercise,
        setSelectedArchetypeId,
        selectExercise,
        removeExercise,
        handleCreate
    };
};
