import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from "@/hooks/redux";
import { useAuth } from '@/state/auth/AuthProvider';
import { useToast } from "@/components/core/Toast/use-toast";
import * as fitnessRepo from '../model/fitnessRepository';
import {
    addExerciseToWorkout,
    addSetToExercise,
    addCardioSetToExercise
} from "@/state/workout/workoutSlice";
import { Exercise, isCardioExercise } from "@/lib/types/workout";
import { v4 as uuidv4 } from 'uuid';

export const useExerciseSelector = (isOpen: boolean) => {
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
            toast({ title: "Success", description: "Exercise created and added." });
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
    const selectExercise = useCallback(async (exercise: Exercise) => {
        const workoutExerciseId = uuidv4();

        // Fetch last config
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

        // Add to workout
        dispatch(addExerciseToWorkout({
            id: workoutExerciseId,
            exerciseId: exercise.id,
            exercise,
            equipmentType: config.equipmentType,
            variation: config.variation,
            sets: []
        }));

        // Add first set
        if (isCardioExercise(exercise)) {
            dispatch(addCardioSetToExercise({ workoutExerciseId, exerciseId: exercise.id }));
        } else {
            dispatch(addSetToExercise({
                workoutExerciseId,
                exerciseId: exercise.id,
                isStatic: exercise.is_static ?? false
            }));
        }

        setSearchQuery("");
        setIsAddingNew(false);
    }, [dispatch, user]);

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
