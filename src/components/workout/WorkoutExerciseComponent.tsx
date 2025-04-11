import { useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { WorkoutExercise, ExerciseSet } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import SetComponent from "./SetComponent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkoutExerciseComponentProps {
  workoutExercise: WorkoutExercise;
}

const WorkoutExerciseComponent = ({ workoutExercise }: WorkoutExerciseComponentProps) => {
  const { 
    addSetToExercise, 
    getLastPerformance, 
    updateExerciseEquipment, 
    updateExerciseVariation,
    addExerciseVariation,
    getExerciseVariations,
    updateSet,
    completeSet,
    deleteSet
  } = useWorkout();
  
  const [showAddVariationDialog, setShowAddVariationDialog] = useState(false);
  const [newVariation, setNewVariation] = useState("");
  
  const lastPerformance = getLastPerformance(workoutExercise.exerciseId);
  const variations = getExerciseVariations(workoutExercise.exerciseId);
  
  const handleAddSet = () => {
    addSetToExercise(workoutExercise.id);
  };

  const handleEquipmentChange = (value: string) => {
    updateExerciseEquipment(workoutExercise.id, value as 'DB' | 'BB' | 'KB' | 'Cable' | 'Free');
  };

  const handleVariationChange = (value: string) => {
    if (value === 'add_new') {
      setShowAddVariationDialog(true);
      return;
    }
    updateExerciseVariation(workoutExercise.id, value);
  };

  const handleAddNewVariation = () => {
    if (newVariation.trim()) {
      addExerciseVariation(workoutExercise.exerciseId, newVariation.trim());
      updateExerciseVariation(workoutExercise.id, newVariation.trim());
      setNewVariation("");
      setShowAddVariationDialog(false);
    }
  };

  const handleSetUpdate = (set: ExerciseSet) => {
    updateSet(workoutExercise.id, set.id, set.weight, set.reps);
    completeSet(workoutExercise.id, set.id, set.completed);
  };

  const handleSetDelete = (setId: string) => {
    deleteSet(workoutExercise.id, setId);
  };
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Select value={workoutExercise.exercise.equipmentType || ''} onValueChange={handleEquipmentChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DB">DB</SelectItem>
                  <SelectItem value="BB">BB</SelectItem>
                  <SelectItem value="KB">KB</SelectItem>
                  <SelectItem value="Cable">Cable</SelectItem>
                  <SelectItem value="Free">Free</SelectItem>
                </SelectContent>
              </Select>
              <span>{workoutExercise.exercise.name}</span>
              <Select value={workoutExercise.exercise.variations?.[0] || ''} onValueChange={handleVariationChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Variation" />
                </SelectTrigger>
                <SelectContent>
                  {variations.map((variation) => (
                    <SelectItem key={variation} value={variation}>
                      {variation}
                    </SelectItem>
                  ))}
                  <SelectItem value="add_new">+ Add New</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lastPerformance && (
              <span className="text-sm font-normal text-gray-500">
                Last time: {lastPerformance.weight} kg × {lastPerformance.reps} reps
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workoutExercise.sets.map((set, index) => (
              <SetComponent
                key={set.id}
                workoutExerciseId={workoutExercise.id}
                set={set}
                setNumber={index + 1}
                onUpdate={handleSetUpdate}
                onDelete={() => handleSetDelete(set.id)}
              />
            ))}
            
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddSet}
            >
              <Plus size={16} className="mr-2" />
              Add Set
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddVariationDialog} onOpenChange={setShowAddVariationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variation">Variation Name</Label>
              <Input
                id="variation"
                value={newVariation}
                onChange={(e) => setNewVariation(e.target.value)}
                placeholder="Enter variation name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewVariation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVariationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewVariation} disabled={!newVariation.trim()}>
              Add Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkoutExerciseComponent;
