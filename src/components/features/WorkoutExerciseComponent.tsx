import React, { useState, useMemo } from 'react';
// import { useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { 
  addSetToExercise as addSetToExerciseAction, 
  updateWorkoutExerciseEquipment as updateWorkoutExerciseEquipmentAction,
  updateWorkoutExerciseVariation as updateWorkoutExerciseVariationAction,
  deleteWorkoutExercise as deleteWorkoutExerciseAction
} from "@/state/workout/workoutSlice"; // Import workout actions
import { 
  addExerciseVariation as addExerciseVariationAction, 
  selectExerciseVariations 
} from "@/state/exercise/exerciseSlice"; // Import exercise state/actions
import { WorkoutExercise, ExerciseSet, Exercise } from "@/lib/types/workout";
import { Button } from "@/components/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Plus, Trash2, Edit, Check, X as XIcon } from "lucide-react";
import SetComponent from "./SetComponent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/core/dialog";
import { Input } from "@/components/core/input";
import { Label } from "@/components/core/label";
import { EquipmentType, EquipmentTypeEnum } from "@/lib/types/enums";

interface WorkoutExerciseProps {
  workoutExercise: WorkoutExercise;
  // onDelete: (workoutExerciseId: string) => void; // Remove onDelete prop
}

// const WorkoutExerciseComponent: React.FC<WorkoutExerciseProps> = ({ workoutExercise, onDelete }) => { // Adjust props
const WorkoutExerciseComponent: React.FC<WorkoutExerciseProps> = ({ workoutExercise }) => {
  // const { 
  //   addSetToExercise, 
  //   updateExerciseEquipment, 
  //   updateExerciseVariation, 
  //   addExerciseVariation, 
  //   getExerciseVariations 
  // } = useWorkout(); // Remove old context usage
  const dispatch = useAppDispatch();
  
  const [editingVariation, setEditingVariation] = useState<boolean>(false);
  const [newVariation, setNewVariation] = useState<string>("");

  // Get available variations from global exercise state
  const availableVariations = useAppSelector(state => selectExerciseVariations(state, workoutExercise.exerciseId));

  // Get current equipment/variation *from the specific workout exercise instance*
  const currentEquipmentType = workoutExercise.exercise.equipmentType;
  // Variation might be an array; get the currently selected one (assuming first)
  const currentVariation = workoutExercise.exercise.variations?.[0]; 

  const handleAddNewVariation = () => {
    if (newVariation.trim() !== "") {
      // Add variation globally
      dispatch(addExerciseVariationAction({ exerciseId: workoutExercise.exerciseId, variation: newVariation.trim() }));
      // Select the new variation for *this* workout exercise instance
      dispatch(updateWorkoutExerciseVariationAction({ workoutExerciseId: workoutExercise.id, variation: newVariation.trim() }));
      setNewVariation("");
      setEditingVariation(false);
    }
  };

  const handleEquipmentChange = (value: string) => {
    dispatch(updateWorkoutExerciseEquipmentAction({ workoutExerciseId: workoutExercise.id, equipmentType: value as EquipmentType }));
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

  const handleDeleteExercise = () => {
    // onDelete(workoutExercise.id); // Old prop call
    dispatch(deleteWorkoutExerciseAction(workoutExercise.id)); // Dispatch delete action
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{workoutExercise.exercise.name}</CardTitle>
        {/* <Button variant="ghost" size="icon" onClick={() => onDelete(workoutExercise.id)}> */}
        <Button variant="ghost" size="icon" onClick={handleDeleteExercise}> {/* Use internal handler */}
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <Label>Equipment</Label>
            <Select
              value={currentEquipmentType || ''} // Handle undefined case
              // onValueChange={(value) => updateExerciseEquipment(workoutExercise.id, value as EquipmentType)}
              onValueChange={handleEquipmentChange} // Use internal handler
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(EquipmentTypeEnum).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Variation</Label>
            <Select
              value={currentVariation || ''} // Handle undefined case
              // onValueChange={(value) => { ... }} // Old logic
              onValueChange={handleVariationChange} // Use internal handler
            >
              <SelectTrigger>
                <SelectValue placeholder="Select variation" />
              </SelectTrigger>
              <SelectContent>
                {/* Use availableVariations from selector */}
                {availableVariations.map(variation => (
                  <SelectItem key={variation} value={variation}>{variation}</SelectItem>
                ))}
                <SelectItem value="add_new">
                  <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Add New...</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {workoutExercise.sets.map((set, index) => (
          <SetComponent 
            key={set.id} 
            workoutExerciseId={workoutExercise.id} 
            set={set} 
            setIndex={index} 
            exerciseId={workoutExercise.exerciseId}
          />
        ))}
        <Button 
          variant="outline" 
          size="sm" 
          // onClick={() => addSetToExercise(workoutExercise.id)} 
          onClick={handleAddSet} // Use internal handler
          className="mt-2 w-full"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Set
        </Button>
      </CardContent>

      {/* Dialog for adding variation remains largely the same, but uses handleAddNewVariation */}
      <Dialog open={editingVariation} onOpenChange={setEditingVariation}>
        {/* ... Dialog content using handleAddNewVariation ... */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variation for {workoutExercise.exercise.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-variation">Variation Name</Label>
            <Input 
              id="new-variation" 
              value={newVariation}
              onChange={(e) => setNewVariation(e.target.value)}
              placeholder="e.g., Close Grip"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVariation(false)}><XIcon className="w-4 h-4 mr-2"/>Cancel</Button>
            <Button onClick={handleAddNewVariation} disabled={!newVariation.trim()}><Check className="w-4 h-4 mr-2"/>Add Variation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WorkoutExerciseComponent;
