import React, { useState } from 'react';
import { ExerciseSet } from "@/lib/types/workout";
import { EquipmentType } from "@/lib/types/enums";
import { useAppDispatch } from "@/hooks/redux";
import { 
  updateSet as updateSetAction, 
  deleteSet as deleteSetAction, 
  completeSet as completeSetAction 
} from "@/state/workout/workoutSlice";
import { Input } from "@/components/core/input";
import { Button } from "@/components/core/button";
import { Checkbox } from "@/components/core/checkbox";
import { Trash2 } from "lucide-react";
import {
  TableRow,
  TableCell,
} from "@/components/core/table";
import { cn } from "@/lib/utils/cn";

interface SetComponentProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  oneRepMax?: number | null;
  previousPerformance: { weight: number; reps: number } | null;
}

const SetComponent: React.FC<SetComponentProps> = ({ workoutExerciseId, set, setIndex, oneRepMax, previousPerformance }) => {
  const dispatch = useAppDispatch();

  const [localWeight, setLocalWeight] = useState(() => (set.completed || set.weight !== 0) ? set.weight.toString() : '');
  const [localReps, setLocalReps] = useState(() => (set.completed || set.reps !== 0) ? set.reps.toString() : '');
  const [isCompleted, setIsCompleted] = useState(set.completed);

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked;
    setIsCompleted(isNowCompleted);

    if (isNowCompleted) {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      dispatch(updateSetAction({
        workoutExerciseId,
        setId: set.id,
        weight,
        reps,
        variation: set.variation ?? undefined,
        equipmentType: set.equipmentType ?? undefined,
      }));
    }
    
    dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: isNowCompleted }));
  };

  const handleDelete = () => {
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id }));
  };

  return (
    <TableRow 
      key={set.id} 
      className={cn(
        "group",
        isCompleted && "bg-green-100 dark:bg-green-900/30"
      )}
    >
      <TableCell className="font-medium text-center w-[50px]">{setIndex + 1}</TableCell>

      <TableCell className="text-center text-xs text-muted-foreground w-[100px]">
        {previousPerformance ? `${previousPerformance.weight}kg x ${previousPerformance.reps}` : '-'}
      </TableCell>

      <TableCell className="w-[100px]">
        <Input
          id={`weight-${set.id}`}
          type="number"
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          className="h-9 w-full text-center no-arrows"
          placeholder="0"
          aria-label="Weight in kilograms"
          disabled={isCompleted}
        />
      </TableCell>

      <TableCell className="w-[100px]">
        <Input
          id={`reps-${set.id}`}
          type="number"
          value={localReps}
          onChange={(e) => setLocalReps(e.target.value)}
          className="h-9 w-full text-center no-arrows"
          placeholder="0"
          aria-label="Repetitions"
          disabled={isCompleted}
        />
      </TableCell>

      <TableCell className="text-right w-[100px]">
         <div className="flex items-center justify-end space-x-2">
             <Checkbox
                  id={`completed-${set.id}`}
                  checked={isCompleted}
                  onCheckedChange={handleCompletionChange}
                  className="w-5 h-5"
                  aria-label="Mark set as completed"
              />
              <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete Set"
              >
                  <Trash2 className="w-4 h-4" />
              </Button>
         </div>
      </TableCell>
    </TableRow>
  );
};

export default SetComponent;
