import React, { useState, useEffect } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { ExerciseSet } from "@/lib/types/workout";
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

interface SetComponentProps extends MotionProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  previousPerformance: { weight: number; reps: number | null; time_seconds?: number | null } | null;
  userBodyweight?: number | null;
  isStatic: boolean;
}

const PerformanceIndicator: React.FC<{
  type: 'weight' | 'reps' | 'time';
  previousValue: number | undefined;
  currentValue?: number;
  isStatic?: boolean;
  isVisible: boolean;
}> = ({ type, previousValue, isVisible, isStatic }) => {
  if (!isVisible || previousValue === undefined) return null;

  let IconComponent: React.ElementType | null = null;
  let colorClass = "text-muted-foreground";

  if (type === 'weight') {
      IconComponent = ArrowUp;
      colorClass = "text-green-500";
  } else if (type === 'reps' && !isStatic) {
    if (previousValue < 8) { IconComponent = ArrowUp; colorClass = "text-green-500"; }
    else { IconComponent = Minus; colorClass = "text-yellow-500"; }
  } else if (type === 'time' && isStatic) {
    if (previousValue > 30) { IconComponent = ArrowUp; colorClass = "text-green-500"; }
    else { IconComponent = Minus; colorClass = "text-yellow-500"; }
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
  userBodyweight,
  isStatic,
  ...motionProps
}) => {
  const dispatch = useAppDispatch();

  const [localWeight, setLocalWeight] = useState(() => (set.weight > 0 ? set.weight.toString() : ''));
  const [localReps, setLocalReps] = useState(() => (set.reps ? set.reps.toString() : ''));
  const [localTime, setLocalTime] = useState(() => (set.time_seconds ? set.time_seconds.toString() : ''));
  const [weightTouched, setWeightTouched] = useState(false);
  const [repsTouched, setRepsTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [isCompleted, setIsCompleted] = useState(set.completed);

  useEffect(() => {
    if (
      set.equipmentType === "Bodyweight" && 
      userBodyweight && 
      userBodyweight > 0 && 
      !weightTouched && 
      (!localWeight || parseFloat(localWeight) === 0)
    ) {
      setLocalWeight(String(userBodyweight));
    }
  }, [set.equipmentType, userBodyweight, weightTouched, localWeight]);

  useEffect(() => {
    setLocalWeight(set.weight > 0 ? set.weight.toString() : '');
  }, [set.weight]);

  useEffect(() => {
    setLocalReps(set.reps ? set.reps.toString() : '');
  }, [set.reps]);

  useEffect(() => {
    setLocalTime(set.time_seconds ? set.time_seconds.toString() : '');
  }, [set.time_seconds]);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalWeight(e.target.value);
    setWeightTouched(true);
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalReps(e.target.value);
    setRepsTouched(true);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTime(e.target.value);
    setTimeTouched(true);
  };

  const handleCompletionChange = (checked: boolean | 'indeterminate') => {
    const isNowCompleted = !!checked;
    setIsCompleted(isNowCompleted);

    const weightVal = parseFloat(localWeight) || 0;
    const repsVal = parseInt(localReps) || 0;
    const timeVal = parseInt(localTime) || 0;

    if (isNowCompleted) {
      let updatedSetData: any = {
          workoutExerciseId,
          setId: set.id,
        weight: weightVal,
          variation: set.variation ?? undefined,
          equipmentType: set.equipmentType ?? undefined,
      };

      if (isStatic) {
        if (weightVal >= 0 && timeVal > 0) {
          updatedSetData.reps = null;
          updatedSetData.time_seconds = timeVal;
        } else {
          setIsCompleted(false);
          console.warn("Cannot complete static set with 0 time.");
          return;
        }
      } else {
        if (weightVal >= 0 && repsVal > 0) {
          updatedSetData.reps = repsVal;
          updatedSetData.time_seconds = null;
      } else {
        setIsCompleted(false);
          console.warn("Cannot complete rep-based set with 0 reps (and non-negative weight).");
          return;
        }
      }
      dispatch(updateSetAction(updatedSetData));
      dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: true }));
    } else {
      dispatch(completeSetAction({ workoutExerciseId, setId: set.id, completed: false }));
    }
  };

  const handleBlur = (field: 'weight' | 'reps' | 'time') => {
    if (isCompleted) return;

    const weightVal = parseFloat(localWeight) || 0;
    const repsVal = parseInt(localReps) || 0;
    const timeVal = parseInt(localTime) || 0;
    
    let shouldUpdate = false;
    let updatePayload: any = {
            workoutExerciseId,
            setId: set.id,
        weight: weightVal,
            variation: set.variation ?? undefined,
            equipmentType: set.equipmentType ?? undefined,
    };

    if (isStatic) {
      updatePayload.reps = null;
      updatePayload.time_seconds = timeVal;
      if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
      if (field === 'time' && timeVal > 0 && timeVal !== set.time_seconds) shouldUpdate = true;
    } else {
      updatePayload.reps = repsVal;
      updatePayload.time_seconds = null;
      if (field === 'weight' && weightVal >= 0 && weightVal !== set.weight) shouldUpdate = true;
      if (field === 'reps' && repsVal > 0 && repsVal !== set.reps) shouldUpdate = true;
    }

    if (shouldUpdate) {
        dispatch(updateSetAction(updatePayload));
    }
  };

  const handleDelete = () => {
    dispatch(deleteSetAction({ workoutExerciseId, setId: set.id }));
  };

  const showWeightIndicator = previousPerformance && !weightTouched && localWeight === '';
  const showRepsIndicator = !isStatic && previousPerformance && !repsTouched && localReps === '';
  const showTimeIndicator = isStatic && previousPerformance && !timeTouched && localTime === '';
  
  const previousRepsValue = isStatic ? undefined : previousPerformance?.reps ?? undefined;
  const previousTimeValue = isStatic ? previousPerformance?.time_seconds ?? undefined : undefined;

  return (
    <motion.tr
      {...motionProps}
      key={set.id}
      className={cn(
        "group",
        isCompleted && "bg-green-100 dark:bg-green-900/30",
        "border-b-0"
      )}
    >
      <TableCell key={`${set.id}-setnum`} className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
      <TableCell key={`${set.id}-prev`} className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
        {previousPerformance 
          ? isStatic
            ? `${previousPerformance.weight}kg x ${previousPerformance.time_seconds || '-'}s` 
            : `${previousPerformance.weight}kg x ${previousPerformance.reps || '-'}`
          : '-'}
      </TableCell>
      <TableCell key={`${set.id}-weight`} className="w-[75px] px-1 py-1 align-middle relative">
        <div>
          <Input
            id={`weight-${set.id}`}
            type="number"
            inputMode="decimal"
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
          previousValue={isStatic ? previousTimeValue : previousRepsValue}
          isStatic={isStatic}
          isVisible={showWeightIndicator}
        />
      </TableCell>
      {isStatic ? (
        <TableCell key={`${set.id}-time`} className="w-[60px] px-1 py-1 align-middle relative">
          <div>
            <Input
              id={`time-${set.id}`}
              type="number"
              inputMode="numeric"
              value={localTime}
              onChange={handleTimeChange}
              onBlur={() => handleBlur('time')}
              className={cn(
                "h-9 w-full",
                "text-center",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              )}
              placeholder={previousPerformance ? String(previousPerformance.time_seconds ?? '0') : '0'}
              aria-label="Time in seconds"
              disabled={isCompleted}
            />
          </div>
          <PerformanceIndicator
            type="time"
            previousValue={previousTimeValue}
            isStatic={isStatic}
            isVisible={showTimeIndicator}
          />
        </TableCell>
      ) : (
      <TableCell key={`${set.id}-reps`} className="w-[60px] px-1 py-1 align-middle relative">
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
              placeholder={previousPerformance ? String(previousPerformance.reps ?? '0') : '0'}
            aria-label="Repetitions"
            disabled={isCompleted}
          />
        </div>
        <PerformanceIndicator
          type="reps"
            previousValue={previousRepsValue}
            isStatic={isStatic}
          isVisible={showRepsIndicator}
        />
      </TableCell>
      )}
      <TableCell key={`${set.id}-completed`} className="w-[40px] align-middle px-0 py-0">
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
    </motion.tr>
  );
};

export default SetComponent;
