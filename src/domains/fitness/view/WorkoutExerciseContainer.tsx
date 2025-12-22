import React, { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/integrations/supabase/client';
import {
  addSetToExercise as addSetToExerciseAction,
  addCardioSetToExercise as addCardioSetToExerciseAction,
  updateWorkoutExerciseEquipment as updateWorkoutExerciseEquipmentAction,
  updateWorkoutExerciseVariation as updateWorkoutExerciseVariationAction,
  deleteWorkoutExercise as deleteWorkoutExerciseAction,
  updateSet as updateSetAction,
  updateCardioSet as updateCardioSetAction,
} from "@/state/workout/workoutSlice";
import { WorkoutExercise, ExerciseSet, Exercise, isCardioExercise, isCardioSet, isStrengthSet } from "@/lib/types/workout";
import { addExerciseVariationToDB, fetchExerciseVariationsFromDB } from '@/lib/integrations/supabase/exercises';
import { fetchLastWorkoutExerciseInstanceFromDB } from '@/lib/integrations/supabase/history';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Button } from "@/components/core/button";
import { Check, X as XIcon, Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useWorkoutExercise } from '../controller/useWorkoutExercise';
import { WorkoutExerciseView } from './WorkoutExerciseView';

interface WorkoutExerciseContainerProps {
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise }) => {
  const DEFAULT_VARIATION = 'Standard';
  const {
    variations,
    historicalSetPerformances,
    overallLastPerformance,
    userWeight,
    isAddingVariation,
    newVariationName,
    isLoading,
    setNewVariationName,
    setIsAddingVariation,
    addSet,
    updateEquipment,
    updateVariation,
    deleteExercise,
    updateLastSetField,
    handleSaveNewVariation,
  } = useWorkoutExercise(workoutExercise);

  const handleCancelAddVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName('');
  };

  return (
    <WorkoutExerciseView
      workoutExercise={workoutExercise}
      overallLastPerformance={overallLastPerformance}
      historicalSetPerformances={historicalSetPerformances}
      userBodyweight={userWeight}
      onAddSet={addSet}
      onEquipmentChange={updateEquipment}
      onDeleteExercise={deleteExercise}
      variations={variations}
      selectedVariation={workoutExercise.variation ?? DEFAULT_VARIATION}
      isAddingVariation={isAddingVariation}
      newVariationName={newVariationName}
      isLoadingVariations={isLoading}
      addVariationMutationStatus={isAddingVariation ? 'pending' : 'idle'}
      onVariationChange={updateVariation}
      onNewVariationNameChange={setNewVariationName}
      onSaveNewVariation={handleSaveNewVariation}
      onCancelAddVariation={handleCancelAddVariation}
      onUpdateLastSet={updateLastSetField}
    />
  );
};

export default WorkoutExerciseContainer;
