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
import { Trash2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  TableRow,
  TableCell,
} from "@/components/core/table";
import { cn } from "@/lib/utils/cn";

interface SetComponentProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  previousPerformance: { weight: number; reps: number } | null;
}

const PerformanceIndicator: React.FC<{
  type: 'weight' | 'reps';
  previousReps: number | undefined;
  isVisible: boolean;
}> = ({ type, previousReps, isVisible }) => {
  if (!isVisible || previousReps === undefined) return null;

  let IconComponent: React.ElementType = Minus;
  let colorClass = "text-yellow-500";

  if (type === 'weight') {
    if (previousReps >= 8) {
      IconComponent = ArrowUp;
      colorClass = "text-green-500";
    } else if (previousReps === 0) {
      IconComponent = ArrowDown;
      colorClass = "text-red-500";
    }
  } else if (type === 'reps') {
    if (previousReps < 8) {
      IconComponent = ArrowUp;
      colorClass = "text-green-500";
    } else {
      IconComponent = Minus;
      colorClass = "text-yellow-500";
    }
  }
  
  if (!IconComponent) return null;

  return (
    <IconComponent
      size={16}
      className={cn("absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none", colorClass)}
      aria-hidden="true"
    />
  );
};

const SetComponent: React.FC<SetComponentProps> = ({
  workoutExerciseId,
  set,
  setIndex,
  previousPerformance,
}) => {
  const dispatch = useAppDispatch();

  const [localWeight, setLocalWeight] = useState(() => (set.weight > 0 ? set.weight.toString() : ''));
  const [localReps, setLocalReps] = useState(() => (set.reps > 0 ? set.reps.toString() : ''));
  const [weightTouched, setWeightTouched] = useState(false);
  const [repsTouched, setRepsTouched] = useState(false);
  const [isCompleted, setIsCompleted] = useState(set.completed);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWeight(e.target.value);
    setWeightTouched(true);
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalReps(e.target.value);
    setRepsTouched(true);
  };

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked;
    setIsCompleted(isNowCompleted);

    if (isNowCompleted) {
      const weight = parseFloat(localWeight) || 0;
      const reps = parseInt(localReps) || 0;
      if (weight > 0 && reps > 0) {
        dispatch(updateSetAction({
          workoutExerciseId,
          setId: set.id,
          weight,
          reps,
          variation: set.variation ?? undefined,
          equipmentType: set.equipmentType ?? undefined,
        }));
        dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: true }));
      } else {
        setIsCompleted(false);
        console.warn("Cannot complete set with 0 weight or reps.");
      }
    } else {
      dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: false }));
    }
  };

  const handleBlur = (field: 'weight' | 'reps') => {
    if (isCompleted) return;

    const weight = parseFloat(localWeight) || 0;
    const reps = parseInt(localReps) || 0;

    if ((field === 'weight' && weight > 0 && weight !== set.weight) || 
        (field === 'reps' && reps > 0 && reps !== set.reps))
    {
        dispatch(updateSetAction({
            workoutExerciseId,
            setId: set.id,
            weight,
            reps,
            variation: set.variation ?? undefined,
            equipmentType: set.equipmentType ?? undefined,
        }));
    }
  };

  const handleDelete = () => {
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id }));
  };

  const showWeightIndicator = previousPerformance && !weightTouched && localWeight === '';
  const showRepsIndicator = previousPerformance && !repsTouched && localReps === '';
  const previousRepsValue = previousPerformance?.reps;

  return (
    <TableRow
      key={set.id}
      className={cn(
        "group",
        isCompleted && "bg-green-100 dark:bg-green-900/30",
        "border-b-0"
      )}
    >
      <TableCell className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
      <TableCell className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
        {previousPerformance ? `${previousPerformance.weight}kg x ${previousPerformance.reps}` : '-'}
      </TableCell>
      <TableCell className="w-[75px] px-1 py-1 align-middle relative">
        <div>
          <Input
            id={`weight-${set.id}`}
            type="number"
            inputMode="numeric"
            value={localWeight}
            onChange={handleWeightChange}
            onBlur={() => handleBlur('weight')}
            className={cn(
              "h-9 w-full",
              "text-center",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            )}
            placeholder={previousPerformance ? String(previousPerformance.weight) : '0'}
            aria-label="Weight in kilograms"
            disabled={isCompleted}
          />
        </div>
        <PerformanceIndicator
          type="weight"
          previousReps={previousRepsValue}
          isVisible={showWeightIndicator}
        />
      </TableCell>
      <TableCell className="w-[60px] px-1 py-1 align-middle relative">
        <div>
          <Input
            id={`reps-${set.id}`}
            type="number"
            inputMode="numeric"
            value={localReps}
            onChange={handleRepsChange}
            onBlur={() => handleBlur('reps')}
            className={cn(
              "h-9 w-full",
              "text-center",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            )}
            placeholder={previousPerformance ? String(previousPerformance.reps) : '0'}
            aria-label="Repetitions"
            disabled={isCompleted}
          />
        </div>
        <PerformanceIndicator
          type="reps"
          previousReps={previousRepsValue}
          isVisible={showRepsIndicator}
        />
      </TableCell>
      <TableCell className="w-[40px] align-middle px-0 py-0">
        <div className="flex justify-center items-center h-full">
          <Checkbox
            id={`completed-${set.id}`}
            checked={isCompleted}
            onCheckedChange={handleCompletionChange}
            className="w-5 h-5"
            aria-label="Mark set as completed"
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SetComponent;
