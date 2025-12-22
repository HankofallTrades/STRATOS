import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import * as fitnessRepo from '../model/fitnessRepository';

export interface SingleLogForm {
    exerciseId: string;
    reps: string;
    timeSeconds: string;
    weight: string;
    equipmentType: string | null;
    variation: string | null;
}

const DEFAULT_VARIATION = 'Standard';

export const useSingleExerciseLog = (isOpen: boolean, defaultLogData?: fitnessRepo.ExerciseSetRow | null) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();

    const [form, setForm] = useState<SingleLogForm>({
        exerciseId: '',
        reps: '',
        timeSeconds: '',
        weight: '',
        equipmentType: null,
        variation: null,
    });

    // Queries
    const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
        queryKey: ['exercises'],
        queryFn: fitnessRepo.fetchExercises,
        staleTime: Infinity,
        enabled: isOpen,
    });

    const { data: lastSet, isLoading: isLoadingLastSet, error: errorLastSet } = useQuery({
        queryKey: ['lastSet', user?.id, form.exerciseId],
        queryFn: () => fitnessRepo.fetchLastSetForExercise(user!.id, form.exerciseId),
        enabled: isOpen && !!user?.id && !!form.exerciseId,
    });

    const { data: variations = [], isLoading: isLoadingVariations, error: errorVariations } = useQuery({
        queryKey: ['exerciseVariations', form.exerciseId],
        queryFn: () => fitnessRepo.fetchVariations(form.exerciseId),
        enabled: isOpen && !!form.exerciseId,
    });

    const { data: equipmentTypes = [], isLoading: isLoadingEquipment, error: errorEquipment } = useQuery({
        queryKey: ['equipmentTypes'],
        queryFn: fitnessRepo.fetchEquipmentTypes,
        staleTime: 1000 * 60 * 5,
        enabled: isOpen,
    });

    const selectedExercise = useMemo(() =>
        exercises.find(ex => ex.id === form.exerciseId),
        [exercises, form.exerciseId]
    );

    // Mutations
    const saveLogMutation = useMutation({
        mutationFn: (log: fitnessRepo.SingleLogData) =>
            fitnessRepo.saveSingleExerciseLog(user!.id, log),
        onSuccess: () => {
            toast({ title: "Exercise Logged", description: "Successfully saved." });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            queryClient.invalidateQueries({ queryKey: ['lastSet', user?.id, form.exerciseId] });
            queryClient.invalidateQueries({ queryKey: ['analyticsData'] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const createVariationMutation = useMutation({
        mutationFn: ({ name }: { name: string }) =>
            fitnessRepo.createVariation(form.exerciseId, name),
        onSuccess: (data) => {
            setForm(prev => ({ ...prev, variation: data.variation_name }));
            queryClient.invalidateQueries({ queryKey: ['exerciseVariations', form.exerciseId] });
        }
    });

    const createEquipmentMutation = useMutation({
        mutationFn: fitnessRepo.createEquipmentType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipmentTypes'] });
        }
    });

    // Business Logic
    const updateField = useCallback((field: keyof SingleLogForm, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const adjustValue = useCallback((field: 'weight' | 'reps' | 'timeSeconds', adj: number) => {
        setForm(prev => {
            const current = parseFloat(prev[field]) || 0;
            let next = current + adj;
            if (field === 'weight') next = Math.max(0, next);
            else next = Math.max(1, next);

            return { ...prev, [field]: next.toString() };
        });
    }, []);

    const submitLog = async () => {
        if (!selectedExercise) return false;

        const isStatic = selectedExercise.is_static;
        const log: fitnessRepo.SingleLogData = {
            exerciseId: form.exerciseId,
            weight: parseFloat(form.weight) || 0,
            reps: isStatic ? null : parseInt(form.reps, 10),
            timeSeconds: isStatic ? parseInt(form.timeSeconds, 10) : null,
            equipmentType: form.equipmentType,
            variation: form.variation,
        };

        try {
            await saveLogMutation.mutateAsync(log);
            return true;
        } catch {
            return false;
        }
    };

    // Sync with lastSet or defaultLogData
    useEffect(() => {
        const source = defaultLogData || lastSet;
        if (source && form.exerciseId === (source as any).exercise_id) {
            setForm(prev => ({
                ...prev,
                weight: source.weight?.toString() || '',
                reps: source.reps?.toString() || '',
                timeSeconds: source.time_seconds?.toString() || '',
                equipmentType: source.equipment_type,
                variation: source.variation === DEFAULT_VARIATION ? null : source.variation,
            }));
        }
    }, [lastSet, defaultLogData, form.exerciseId]);

    return {
        form,
        exercises,
        variations,
        equipmentTypes,
        selectedExercise,
        isLoading: isLoadingExercises || isLoadingLastSet || isLoadingVariations || isLoadingEquipment,
        isSubmitting: saveLogMutation.isPending,
        updateField,
        adjustValue,
        submitLog,
        createVariation: (name: string) => createVariationMutation.mutate({ name }),
        createEquipment: (name: string) => createEquipmentMutation.mutate(name),
    };
};
