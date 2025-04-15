import React, { useState, useMemo } from 'react';
import { useWorkout } from "@/state/workout/WorkoutContext";
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
  onDelete: (workoutExerciseId: string) => void;
}

const WorkoutExerciseComponent: React.FC<WorkoutExerciseProps> = ({ workoutExercise, onDelete }) => {
  const { 
    addSetToExercise, 
    updateExerciseEquipment, 
    updateExerciseVariation, 
    addExerciseVariation, 
    getExerciseVariations 
  } = useWorkout();
  
  const [editingVariation, setEditingVariation] = useState<boolean>(false);
  const [newVariation, setNewVariation] = useState<string>("");

  const currentEquipmentType = workoutExercise.exercise.equipmentType;
  const currentVariation = workoutExercise.exercise.variations?.[0];
  const availableVariations = useMemo(() => getExerciseVariations(workoutExercise.exerciseId), [getExerciseVariations, workoutExercise.exerciseId]);

  const handleAddNewVariation = () => {
    if (newVariation.trim() !== "") {
      addExerciseVariation(workoutExercise.exerciseId, newVariation.trim());
      updateExerciseVariation(workoutExercise.id, newVariation.trim());
      setNewVariation("");
      setEditingVariation(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{workoutExercise.exercise.name}</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => onDelete(workoutExercise.id)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <Label>Equipment</Label>
            <Select
              value={currentEquipmentType}
              onValueChange={(value) => updateExerciseEquipment(workoutExercise.id, value as EquipmentType)}
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
              value={currentVariation}
              onValueChange={(value) => {
                if (value === 'add_new') {
                  setEditingVariation(true);
                } else {
                  updateExerciseVariation(workoutExercise.id, value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select variation" />
              </SelectTrigger>
              <SelectContent>
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
          onClick={() => addSetToExercise(workoutExercise.id)} 
          className="mt-2 w-full"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Set
        </Button>
      </CardContent>

      <Dialog open={editingVariation} onOpenChange={setEditingVariation}>
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
