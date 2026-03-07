import React from 'react';
import { WorkoutExercise } from "@/lib/types/workout";
import { useWorkoutExercise } from '../hooks/useWorkoutExercise';
import { WorkoutExerciseView } from './WorkoutExerciseView';

interface WorkoutExerciseContainerProps {
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise }) => {
  const DEFAULT_VARIATION = 'Standard';
  const {
    variations,
    historicalSetPerformances,
    recommendedSetPerformances,
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
