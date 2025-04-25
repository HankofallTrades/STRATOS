import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
  addSetToExercise as addSetToExerciseAction,
  updateWorkoutExerciseEquipment as updateWorkoutExerciseEquipmentAction,
  updateWorkoutExerciseVariation as updateWorkoutExerciseVariationAction,
  deleteWorkoutExercise as deleteWorkoutExerciseAction,
  selectOneRepMaxForExercise, 
} from "@/state/workout/workoutSlice";
import {
  addExerciseVariation as addExerciseVariationAction,
  selectExerciseVariations,
} from "@/state/exercise/exerciseSlice";
import { WorkoutExercise, ExerciseSet, Exercise } from "@/lib/types/workout";
import { EquipmentType, EquipmentTypeEnum } from "@/lib/types/enums";
import { selectLastPerformance } from '@/state/history/historySlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/core/Dialog"; // Corrected casing
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { Button } from "@/components/core/button";
import { Check, X as XIcon } from "lucide-react";
import { WorkoutExerciseView } from './WorkoutExerciseView'; // Import the View component
import { RootState } from '@/state/store'; // Import RootState for placeholder selectors

interface WorkoutExerciseContainerProps { // Renamed interface
  workoutExercise: WorkoutExercise;
}

export const WorkoutExerciseContainer: React.FC<WorkoutExerciseContainerProps> = ({ workoutExercise }) => {
  const dispatch = useAppDispatch();

  const [editingVariation, setEditingVariation] = useState<boolean>(false);
  const [newVariation, setNewVariation] = useState<string>("");

  // --- Selectors --- 
  const availableVariations = useAppSelector(state => selectExerciseVariations(state, workoutExercise.exerciseId));
  // Use placeholder selectors for now
  const lastPerformance = useAppSelector(state => selectLastPerformance(state, workoutExercise.exerciseId));
  const oneRepMax = useAppSelector(state => selectOneRepMaxForExercise(state, workoutExercise.exerciseId));
  // Get equipment types from enum
  const equipmentTypes = Object.values(EquipmentTypeEnum);

  // --- Event Handlers --- 
  const handleAddNewVariation = () => {
    if (newVariation.trim() !== "") {
      dispatch(addExerciseVariationAction({ exerciseId: workoutExercise.exerciseId, variation: newVariation.trim() }));
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: newVariation.trim() }));
      setNewVariation("");
      setEditingVariation(false);
    }
  };

  const handleEquipmentChange = (value: EquipmentType) => { // Type corrected
    dispatch(updateWorkoutExerciseEquipmentAction({ workoutExerciseId: workoutExercise.id, equipmentType: value }));
  };

  const handleVariationChange = (value: string) => {
    if (value === 'add_new') {
      setEditingVariation(true);
    } else {
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: value }));
    }
  };

  const handleAddSet = () => {
    dispatch(addSetToExerciseAction({ workoutExerciseId: workoutExercise.id, exerciseId: workoutExercise.exerciseId }));
  };

  // Delete handler remains for the exercise itself, triggered elsewhere (e.g., WorkoutComponent)
  // const handleDeleteExercise = () => {
  //   dispatch(deleteWorkoutExerciseAction(workoutExercise.id));
  // };

  // --- Render --- 
  return (
    <>
      {/* Pass data and handlers down to the View component */}
      <WorkoutExerciseView
        workoutExercise={workoutExercise}
        equipmentTypes={equipmentTypes}
        lastPerformance={lastPerformance}
        oneRepMax={oneRepMax} // Pass 1RM down
        onAddSet={handleAddSet}
        onEquipmentChange={handleEquipmentChange}
        onVariationChange={handleVariationChange}
        // No onSetUpdate or onSetDelete needed here
      />

      {/* Keep the Dialog for adding variation within the Container */}
      <Dialog open={editingVariation} onOpenChange={setEditingVariation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variation for {workoutExercise.exercise.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor={`new-variation-${workoutExercise.id}`}>Variation Name</Label> {/* Unique ID */}
            {/* Temporarily comment out Input to isolate the error */}
             <Input
               id={`new-variation-${workoutExercise.id}`} 
               value={newVariation}
               onChange={(e) => setNewVariation(e.target.value)}
               placeholder="e.g., Close Grip"
             /> 
            {/* <div>Input Placeholder</div> */}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditingVariation(false)}>
               <XIcon className="w-4 h-4 mr-2"/>
               <span>Cancel</span>
             </Button>
             <Button onClick={handleAddNewVariation} disabled={!newVariation.trim()}>
               <Check className="w-4 h-4 mr-2"/>
               <span>Add Variation</span>
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Update the export name
export default WorkoutExerciseContainer;
