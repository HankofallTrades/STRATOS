import React, { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client';
import {
  addSetToExercise as addSetToExerciseAction,
  updateWorkoutExerciseEquipment as updateWorkoutExerciseEquipmentAction,
  updateWorkoutExerciseVariation as updateWorkoutExerciseVariationAction,
  deleteWorkoutExercise as deleteWorkoutExerciseAction,
} from "@/state/workout/workoutSlice";
import { WorkoutExercise, ExerciseSet, Exercise } from "@/lib/types/workout";
import { EquipmentType, EquipmentTypeEnum } from "@/lib/types/enums";
import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { fetchLastWorkoutExerciseInstanceFromDB } from '@/lib/integrations/supabase/history';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Button } from "@/components/core/button";
import { Check, X as XIcon, Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { WorkoutExerciseView } from './WorkoutExerciseView';

interface WorkoutExerciseContainerProps {
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const exerciseId = workoutExercise.exerciseId;
  const DEFAULT_VARIATION = 'Standard';

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
      const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          console.log("Fetched User ID:", user?.id);
          setUserId(user?.id ?? null);
      };
      fetchUser();
  }, []);

  const [selectedVariation, setSelectedVariation] = useState<string | undefined>(
    workoutExercise.sets.filter(s => s.variation).at(-1)?.variation ?? DEFAULT_VARIATION
  );
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
        selectedVariation
    ],
    queryFn: () => {
        console.log('Querying history with params:', {
            userId,
            exerciseId,
            equipmentType: workoutExercise.equipmentType,
            selectedVariation
        });
        if (!userId || !exerciseId) {
            console.log("History query skipped: userId or exerciseId missing.");
            return null; 
        }
        return fetchLastWorkoutExerciseInstanceFromDB(
            userId,
            exerciseId,
            workoutExercise.equipmentType,
            selectedVariation
        );
    },
    enabled: !!userId && !!exerciseId,
    staleTime: 5 * 60 * 1000,
  });

  const addVariationMutation = useMutation({
    mutationFn: ({ exerciseId, variationName }: { exerciseId: string; variationName: string }) =>
      addExerciseVariationToDB(exerciseId, variationName),
    onSuccess: (newVariationData) => {
      queryClient.invalidateQueries({ queryKey: ['exerciseVariations', exerciseId] });
      setNewVariationName('');
      setIsAddingVariation(false);
      setSelectedVariation(newVariationData.variation_name);
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: newVariationData.variation_name }));
    },
    onError: (error) => {
      console.error("Error adding variation:", error);
    },
  });

  const overallLastPerformance = useMemo(() => {
    if (!historicalSets || historicalSets.length === 0) return null;
    return historicalSets.reduce((max: { weight: number; reps: number } | null, set) => {
        if (!max || set.weight > max.weight || (set.weight === max.weight && set.reps > max.reps)) {
            return { weight: set.weight, reps: set.reps };
        }
        return max;
    }, null);
  }, [historicalSets]);

  const historicalSetPerformances = useMemo(() => {
    if (!historicalSets) return {};

    const performances: Record<number, { weight: number; reps: number } | null> = {};

    historicalSets.forEach(set => {
      if (set.set_number && set.set_number > 0) {
        performances[set.set_number] = { weight: set.weight, reps: set.reps };
      }
    });

    return performances;
  }, [historicalSets]);

  const equipmentTypes = Object.values(EquipmentTypeEnum);

  useEffect(() => {
    const lastSetVariationInCurrentWorkout = workoutExercise.sets.filter(s => s.variation).at(-1)?.variation;

    let targetVariation: string | undefined = DEFAULT_VARIATION;

    if (lastSetVariationInCurrentWorkout && variations.includes(lastSetVariationInCurrentWorkout)) {
      targetVariation = lastSetVariationInCurrentWorkout;
    }
    else if (selectedVariation && variations.includes(selectedVariation)) {
        targetVariation = selectedVariation;
    }

    if (selectedVariation !== targetVariation) {
        setSelectedVariation(targetVariation);
        dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: targetVariation }));
    }
    else if (!selectedVariation && variations.includes(DEFAULT_VARIATION)) {
       setSelectedVariation(DEFAULT_VARIATION);
       dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: DEFAULT_VARIATION }));
    }

  }, [variations, workoutExercise.sets, selectedVariation, dispatch, workoutExercise.id]);

  const handleEquipmentChange = (value: EquipmentType) => {
    dispatch(updateWorkoutExerciseEquipmentAction({ workoutExerciseId: workoutExercise.id, equipmentType: value }));
  };

  const handleVariationChange = (value: string) => {
    if (value === 'add_new') {
      setIsAddingVariation(true);
      setSelectedVariation(undefined);
    } else {
      setIsAddingVariation(false);
      setSelectedVariation(value);
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
              setSelectedVariation(existingVariation);
              setIsAddingVariation(false);
              setNewVariationName('');
              dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: existingVariation }));
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
        setSelectedVariation(DEFAULT_VARIATION);
        setIsAddingVariation(false);
        setNewVariationName('');
        dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: DEFAULT_VARIATION }));
    }
  };

  const handleCancelAddVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName('');
    if (!selectedVariation && variations.includes(DEFAULT_VARIATION)) {
        setSelectedVariation(DEFAULT_VARIATION);
        dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: DEFAULT_VARIATION }));
    } else if (selectedVariation) {
    } else {
        const firstAvailable = variations[0];
         if (firstAvailable) {
             setSelectedVariation(firstAvailable);
             dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: firstAvailable }));
         }
    }
  };

  const handleAddSet = () => {
    dispatch(addSetToExerciseAction({ workoutExerciseId: workoutExercise.id, exerciseId: workoutExercise.exerciseId }));
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
        equipmentTypes={equipmentTypes}
        overallLastPerformance={overallLastPerformance}
        historicalSetPerformances={historicalSetPerformances}
        onAddSet={handleAddSet}
        onEquipmentChange={handleEquipmentChange}
        onDeleteExercise={handleDeleteExercise}
        variations={variations}
        selectedVariation={selectedVariation}
        isAddingVariation={isAddingVariation}
        newVariationName={newVariationName}
        isLoadingVariations={isLoadingVariations}
        addVariationMutationStatus={addVariationMutation.status}
        onVariationChange={handleVariationChange}
        onNewVariationNameChange={setNewVariationName}
        onSaveNewVariation={handleSaveNewVariation}
        onCancelAddVariation={handleCancelAddVariation}
      />
    </>
  );
};

export default WorkoutExerciseContainer;
