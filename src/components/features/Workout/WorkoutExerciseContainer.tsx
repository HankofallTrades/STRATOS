import React, { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client';
import {
  addSetToExercise as addSetToExerciseAction,
  updateWorkoutExerciseEquipment as updateWorkoutExerciseEquipmentAction,
  updateWorkoutExerciseVariation as updateWorkoutExerciseVariationAction,
  deleteWorkoutExercise as deleteWorkoutExerciseAction,
  updateSet as updateSetAction,
} from "@/state/workout/workoutSlice";
import { WorkoutExercise, ExerciseSet, Exercise } from "@/lib/types/workout";
import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { fetchLastWorkoutExerciseInstanceFromDB } from '@/lib/integrations/supabase/history';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Button } from "@/components/core/button";
import { Check, X as XIcon, Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { WorkoutExerciseView } from './WorkoutExerciseView';
import { useAuth } from '@/state/auth/AuthProvider';

interface WorkoutExerciseContainerProps {
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const workoutExerciseId = workoutExercise.id;
  const exerciseId = workoutExercise.exercise.id;
  const DEFAULT_VARIATION = 'Standard';
  const { user } = useAuth();
  const userId = user?.id;

  const [isAddingVariation, setIsAddingVariation] = useState(false);
  const [newVariationName, setNewVariationName] = useState('');

  const { data: variations = [DEFAULT_VARIATION], isLoading: isLoadingVariations, error: variationsError } = useQuery({
    queryKey: ['exerciseVariations', exerciseId],
    queryFn: () => fetchExerciseVariationsFromDB(exerciseId),
    enabled: !!exerciseId,
    placeholderData: [DEFAULT_VARIATION],
    select: (data) => [DEFAULT_VARIATION, ...data.filter(v => v !== DEFAULT_VARIATION)],
  });

  const { data: historicalSets, isLoading: isLoadingHistory } = useQuery({
    queryKey: [
        'lastPerformance',
        userId,
        exerciseId,
        workoutExercise.equipmentType,
        workoutExercise.variation ?? DEFAULT_VARIATION
    ],
    queryFn: () => {
        console.log('Querying history with params:', {
            userId,
            exerciseId,
            equipmentType: workoutExercise.equipmentType,
            selectedVariation: workoutExercise.variation ?? DEFAULT_VARIATION
        });
        if (!userId || !exerciseId) {
            console.log("History query skipped: userId or exerciseId missing.");
            return null; 
        }
        return fetchLastWorkoutExerciseInstanceFromDB(
            userId,
            exerciseId,
            workoutExercise.equipmentType,
            workoutExercise.variation ?? DEFAULT_VARIATION
        );
    },
    enabled: !!userId && !!exerciseId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
      queryKey: ['userProfile', userId],
      queryFn: async () => {
          if (!userId) return null;
          const { data, error } = await supabase
              .from('profiles')
              .select('weight')
              .eq('id', userId)
              .single();
          if (error) {
              console.error("Error fetching user profile for weight:", error);
              return null;
          }
          return data;
      },
      enabled: !!userId,
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
  });

  const addVariationMutation = useMutation({
    mutationFn: ({ exerciseId, variationName }: { exerciseId: string; variationName: string }) =>
      addExerciseVariationToDB(exerciseId, variationName),
    onSuccess: (newVariationData) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseVariations', exerciseId] });
      setNewVariationName('');
      setIsAddingVariation(false);
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: newVariationData.variation_name }));
    },
    onError: (error) => {
      console.error("Error adding variation:", error);
    },
  });

  const overallLastPerformance = useMemo(() => {
    if (!historicalSets || historicalSets.length === 0) return null;
    const isStatic = workoutExercise.exercise.is_static ?? false;

    return historicalSets.reduce((max: { weight: number; reps: number | null; time_seconds: number | null } | null, set) => {
      if (!max) {
        return { weight: set.weight, reps: set.reps, time_seconds: set.time_seconds };
      }
      if (isStatic) {
        // For static, prioritize weight, then longer time
        if (set.weight > max.weight || (set.weight === max.weight && (set.time_seconds ?? 0) > (max.time_seconds ?? 0))) {
          return { weight: set.weight, reps: null, time_seconds: set.time_seconds };
        }
      } else {
        // For non-static, prioritize weight, then more reps
        if (set.weight > max.weight || (set.weight === max.weight && (set.reps ?? 0) > (max.reps ?? 0))) {
          return { weight: set.weight, reps: set.reps, time_seconds: null };
        }
        }
        return max;
    }, null);
  }, [historicalSets, workoutExercise.exercise.is_static]);

  const historicalSetPerformances = useMemo(() => {
    if (!historicalSets) return {};

    const performances: Record<number, { weight: number; reps: number | null; time_seconds: number | null } | null> = {};

    historicalSets.forEach(set => {
      if (set.set_number && set.set_number > 0) {
        performances[set.set_number] = { weight: set.weight, reps: set.reps, time_seconds: set.time_seconds };
      }
    });

    return performances;
  }, [historicalSets]);

  const handleEquipmentChange = (value: string) => {
    dispatch(updateWorkoutExerciseEquipmentAction({ workoutExerciseId: workoutExercise.id, equipmentType: value }));
  };

  const handleVariationChange = (value: string) => {
    if (value === 'add_new') {
      setIsAddingVariation(true);
    } else {
      setIsAddingVariation(false);
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: value }));
    }
  };

  const handleSaveNewVariation = () => {
    if (newVariationName.trim() && newVariationName.trim().toLowerCase() !== DEFAULT_VARIATION.toLowerCase() && exerciseId) {
      const variationExists = variations.some(v => v.toLowerCase() === newVariationName.trim().toLowerCase());
      if (variationExists) {
          console.warn(`Variation "${newVariationName.trim()}" already exists.`);
          const existingVariation = variations.find(v => v.toLowerCase() === newVariationName.trim().toLowerCase());
          if (existingVariation) {
              dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: existingVariation }));
              setIsAddingVariation(false);
              setNewVariationName('');
          }
          return;
      }
      if (userId) {
        addVariationMutation.mutate({ exerciseId, variationName: newVariationName.trim() });
      } else {
        console.error("Cannot save variation: User ID not found.");
      }
    } else if (newVariationName.trim().toLowerCase() === DEFAULT_VARIATION.toLowerCase()) {
        console.warn("'Standard' variation cannot be added explicitly.");
        dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: DEFAULT_VARIATION }));
        setIsAddingVariation(false);
        setNewVariationName('');
    }
  };

  const handleCancelAddVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName('');
  };

  const handleAddSet = () => {
    dispatch(
      addSetToExerciseAction({
        workoutExerciseId: workoutExercise.id,
        exerciseId: workoutExercise.exercise.id,
        isStatic: workoutExercise.exercise.is_static ?? false,
        userBodyweight: userProfile?.weight ?? null,
      })
    );
  };

  const handleUpdateLastSet = (field: 'weight' | 'reps' | 'time', change: number) => {
    const sets = workoutExercise.sets;
    if (sets.length === 0) return;

    const isStatic = workoutExercise.exercise.is_static ?? false;
    const lastSetIndex = sets.length - 1;
    const lastSet = sets[lastSetIndex];
    const previousPerformanceForLastSet = historicalSetPerformances?.[lastSetIndex + 1] ?? null;

    let currentWeight = lastSet.weight > 0 ? lastSet.weight : (previousPerformanceForLastSet?.weight ?? 0);
    let currentReps = !isStatic && (lastSet.reps && lastSet.reps > 0) ? lastSet.reps : (previousPerformanceForLastSet?.reps ?? 0);
    let currentTime = isStatic && (lastSet.time_seconds && lastSet.time_seconds > 0) ? lastSet.time_seconds : (previousPerformanceForLastSet?.time_seconds ?? 0);

    let newWeight = currentWeight;
    let newReps = currentReps;
    let newTime = currentTime;

    if (field === 'weight') {
      newWeight = Math.max(0, currentWeight + change);
    } else if (field === 'reps' && !isStatic) {
      newReps = Math.max(0, (currentReps || 0) + change); // Ensure currentReps is not null for calculation
    } else if (field === 'time' && isStatic) {
      newTime = Math.max(0, (currentTime || 0) + change); // Ensure currentTime is not null for calculation
    }

    dispatch(updateSetAction({
      workoutExerciseId: workoutExercise.id,
      setId: lastSet.id,
      weight: newWeight,
      reps: isStatic ? null : newReps,
      time_seconds: isStatic ? newTime : null,
      variation: lastSet.variation ?? undefined,
      equipmentType: lastSet.equipmentType ?? undefined,
    }));
  };

  if (variationsError) {
      console.error("Variation fetch error:", variationsError);
  }

  useEffect(() => {
    console.log('Fetched historical sets:', historicalSets);
  }, [historicalSets]);

  const handleDeleteExercise = () => {
    dispatch(deleteWorkoutExerciseAction(workoutExercise.id));
  };

  return (
    <>
      <WorkoutExerciseView
        workoutExercise={workoutExercise}
        overallLastPerformance={overallLastPerformance}
        historicalSetPerformances={historicalSetPerformances}
        userBodyweight={userProfile?.weight ?? null}
        onAddSet={handleAddSet}
        onEquipmentChange={handleEquipmentChange}
        onDeleteExercise={handleDeleteExercise}
        variations={variations}
        selectedVariation={workoutExercise.variation ?? DEFAULT_VARIATION}
        isAddingVariation={isAddingVariation}
        newVariationName={newVariationName}
        isLoadingVariations={isLoadingVariations}
        addVariationMutationStatus={addVariationMutation.status}
        onVariationChange={handleVariationChange}
        onNewVariationNameChange={setNewVariationName}
        onSaveNewVariation={handleSaveNewVariation}
        onCancelAddVariation={handleCancelAddVariation}
        onUpdateLastSet={handleUpdateLastSet}
      />
    </>
  );
};

export default WorkoutExerciseContainer;
