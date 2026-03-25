import React from 'react';
import { WorkoutExercise } from "@/lib/types/workout";
import { useWorkoutExercise } from '../hooks/useWorkoutExercise';
import { WorkoutExerciseView } from './WorkoutExerciseView';

interface WorkoutExerciseContainerProps {
  workoutExercise: WorkoutExercise;
  restStartTime?: number | null;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise, restStartTime }) => {
  const DEFAULT_VARIATION = 'Standard';
  const {
    variations,
    historicalSetPerformances,
    recommendedSetPerformances,
    userWeight,
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
  } = useWorkoutExercise(workoutExercise);

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
