import React from 'react';

import { WorkoutExercise } from "@/lib/types/workout";
import type { LastWorkoutExerciseInstanceSet } from "@/domains/fitness/data/fitnessRepository";

import { useWorkoutExercise } from '../hooks/useWorkoutExercise';
import { WorkoutExerciseView } from './WorkoutExerciseView';

interface WorkoutExerciseContainerProps {
  historicalSets: LastWorkoutExerciseInstanceSet[] | null;
  isLookupsLoading: boolean;
  restStartTime?: number | null;
  userWeight: number | null;
  variations: string[];
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({
  historicalSets,
  isLookupsLoading,
  restStartTime,
  userWeight,
  variations,
  workoutExercise,
}) => {
  const DEFAULT_VARIATION = 'Standard';
  const {
    historicalSetPerformances,
    recommendedSetPerformances,
    isAddingVariation,
    newVariationName,
    isLoading,
    addVariationMutationStatus,
    setNewVariationName,
    setIsAddingVariation,
    addSet,
    updateEquipment,
    updateVariation,
    deleteExercise,
    updateLastSetField,
    copyCompletedValueToLatestSet,
    handleSaveNewVariation,
  } = useWorkoutExercise(workoutExercise, {
    historicalSets,
    isLoading: isLookupsLoading,
    userWeight,
    variations,
  });

  const handleCancelAddVariation = () => {
    setIsAddingVariation(false);
    setNewVariationName('');
  };

  return (
    <WorkoutExerciseView
      workoutExercise={workoutExercise}
      historicalSetPerformances={historicalSetPerformances}
      recommendedSetPerformances={recommendedSetPerformances}
      userBodyweight={userWeight}
      onAddSet={addSet}
      onEquipmentChange={updateEquipment}
      onDeleteExercise={deleteExercise}
      variations={variations}
      selectedVariation={workoutExercise.variation ?? DEFAULT_VARIATION}
      isAddingVariation={isAddingVariation}
      newVariationName={newVariationName}
      isLoadingVariations={isLoading}
      addVariationMutationStatus={addVariationMutationStatus}
      onVariationChange={updateVariation}
      onNewVariationNameChange={setNewVariationName}
      onSaveNewVariation={handleSaveNewVariation}
      onCancelAddVariation={handleCancelAddVariation}
      onUpdateLastSet={updateLastSetField}
      onCopyCompletedValueToLatestSet={copyCompletedValueToLatestSet}
      restStartTime={restStartTime ?? null}
    />
  );
};

export default WorkoutExerciseContainer;
