import React, { useState, useEffect } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { ExerciseSet, StrengthSet, CardioSet, isStrengthSet, isCardioSet } from "@/lib/types/workout";
import { useAppDispatch } from "@/hooks/redux";
import { 
  updateSet as updateSetAction, 
  updateCardioSet as updateCardioSetAction,
  deleteSet as deleteSetAction, 
  completeSet as completeSetAction 
} from "@/state/workout/workoutSlice";
import { Input } from "@/components/core/input";
import { Button } from "@/components/core/button";
import { Checkbox } from "@/components/core/checkbox";
import { Trash2, ArrowUp, ArrowDown, Minus, Timer, MapPin } from "lucide-react";
import {
  TableRow,
  TableCell,
} from "@/components/core/table";
import { cn } from "@/lib/utils/cn";
import CardioSetComponent from "./CardioSetComponent";

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

// Helper function to format duration as MM:SS
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format distance
const formatDistance = (km?: number) => {
  if (!km || km === 0) return '';
  return `${km.toFixed(1)}km`;
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

  // Handle cardio sets with table layout
  if (isCardioSet(set)) {
    const cardioSet: CardioSet = set;
    const [localDuration, setLocalDuration] = useState(() => cardioSet.duration_seconds.toString());
    const [localDistance, setLocalDistance] = useState(() => (cardioSet.distance_km || 0).toString());
    const [isCompleted, setIsCompleted] = useState(cardioSet.completed);

    useEffect(() => {
      setLocalDuration(cardioSet.duration_seconds.toString());
    }, [cardioSet.duration_seconds]);

    useEffect(() => {
      setLocalDistance((cardioSet.distance_km || 0).toString());
    }, [cardioSet.distance_km]);

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalDuration(e.target.value);
    };

    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalDistance(e.target.value);
    };

    const handleCompletionChange = (checked: boolean | 'indeterminate') => {
      const isNowCompleted = !!checked;
      setIsCompleted(isNowCompleted);

      const durationVal = parseInt(localDuration) || 0;
      const distanceVal = parseFloat(localDistance) || 0;

      if (isNowCompleted && durationVal > 0) {
        dispatch(updateCardioSetAction({
          workoutExerciseId,
          setId: cardioSet.id,
          duration_seconds: durationVal,
          distance_km: distanceVal > 0 ? distanceVal : undefined,
        }));
        dispatch(completeSetAction({ workoutExerciseId, setId: cardioSet.id, completed: true }));
      } else if (!isNowCompleted) {
        dispatch(completeSetAction({ workoutExerciseId, setId: cardioSet.id, completed: false }));
      }
    };

    const handleBlur = (field: 'duration' | 'distance') => {
      if (isCompleted) return;

      const durationVal = parseInt(localDuration) || 0;
      const distanceVal = parseFloat(localDistance) || 0;
      
      let shouldUpdate = false;
      if (field === 'duration' && durationVal !== cardioSet.duration_seconds) shouldUpdate = true;
      if (field === 'distance' && distanceVal !== (cardioSet.distance_km || 0)) shouldUpdate = true;

      if (shouldUpdate) {
        dispatch(updateCardioSetAction({
          workoutExerciseId,
          setId: cardioSet.id,
          duration_seconds: durationVal,
          distance_km: distanceVal > 0 ? distanceVal : undefined,
        }));
      }
    };

    const handleDelete = () => {
      dispatch(deleteSetAction({ workoutExerciseId, setId: cardioSet.id }));
    };

    return (
      <motion.tr
        {...motionProps}
        key={cardioSet.id}
        className={cn(
          "group",
          isCompleted && "bg-green-100 dark:bg-green-900/30",
          "border-b-0"
        )}
      >
        <TableCell key={`${cardioSet.id}-setnum`} className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
        <TableCell key={`${cardioSet.id}-prev`} className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
          {/* Previous performance for cardio - could show last duration/distance */}
          -
        </TableCell>
        
        {/* Duration column */}
        <TableCell key={`${cardioSet.id}-duration`} className="w-[75px] px-1 py-1 align-middle relative">
          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3 text-gray-400" />
            <Input
              id={`duration-${cardioSet.id}`}
              type="number"
              inputMode="numeric"
              value={localDuration}
              onChange={handleDurationChange}
              onBlur={() => handleBlur('duration')}
              className={cn(
                "h-9 w-full text-xs",
                "text-center",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              )}
              placeholder="0"
              aria-label="Duration in seconds"
              disabled={isCompleted}
            />
          </div>
        </TableCell>
        
        {/* Distance column */}
        <TableCell key={`${cardioSet.id}-distance`} className="w-[75px] px-1 py-1 align-middle relative">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <Input
              id={`distance-${cardioSet.id}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={localDistance}
              onChange={handleDistanceChange}
              onBlur={() => handleBlur('distance')}
              className={cn(
                "h-9 w-full text-xs",
                "text-center",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              )}
              placeholder="0.0"
              aria-label="Distance in kilometers"
              disabled={isCompleted}
            />
          </div>
        </TableCell>
        
        {/* Completion checkbox */}
        <TableCell key={`${cardioSet.id}-completed`} className="w-[40px] align-middle px-0 py-0">
          <div className="flex justify-center items-center h-full">
            <Checkbox
              id={`completed-${cardioSet.id}`}
              checked={isCompleted}
              onCheckedChange={handleCompletionChange}
              className="w-5 h-5"
              aria-label="Mark set as completed"
            />
          </div>
        </TableCell>
      </motion.tr>
    );
  }

  // Type guard ensures this is a StrengthSet
  if (!isStrengthSet(set)) {
    return null; // Should not happen, but safety check
  }

  // Rest of the component handles strength sets
  const strengthSet: StrengthSet = set;

  const [localWeight, setLocalWeight] = useState(() => (strengthSet.weight > 0 ? strengthSet.weight.toString() : ''));
  const [localReps, setLocalReps] = useState(() => (strengthSet.reps ? strengthSet.reps.toString() : ''));
  const [localTime, setLocalTime] = useState(() => (strengthSet.time_seconds ? strengthSet.time_seconds.toString() : ''));
  const [weightTouched, setWeightTouched] = useState(false);
  const [repsTouched, setRepsTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [isCompleted, setIsCompleted] = useState(strengthSet.completed);

  useEffect(() => {
    if (
      strengthSet.equipmentType === "Bodyweight" && 
      userBodyweight && 
      userBodyweight > 0 && 
      !weightTouched && 
      (!localWeight || parseFloat(localWeight) === 0)
    ) {
      setLocalWeight(String(userBodyweight));
    }
  }, [strengthSet.equipmentType, userBodyweight, weightTouched, localWeight]);

  useEffect(() => {
    setLocalWeight(strengthSet.weight > 0 ? strengthSet.weight.toString() : '');
  }, [strengthSet.weight]);

  useEffect(() => {
    setLocalReps(strengthSet.reps ? strengthSet.reps.toString() : '');
  }, [strengthSet.reps]);

  useEffect(() => {
    setLocalTime(strengthSet.time_seconds ? strengthSet.time_seconds.toString() : '');
  }, [strengthSet.time_seconds]);

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
          setId: strengthSet.id,
        weight: weightVal,
          variation: strengthSet.variation ?? undefined,
          equipmentType: strengthSet.equipmentType ?? undefined,
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
      dispatch(completeSetAction({ workoutExerciseId, setId: strengthSet.id, completed: true }));
    } else {
      dispatch(completeSetAction({ workoutExerciseId, setId: strengthSet.id, completed: false }));
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
            setId: strengthSet.id,
        weight: weightVal,
            variation: strengthSet.variation ?? undefined,
            equipmentType: strengthSet.equipmentType ?? undefined,
    };

    if (isStatic) {
      updatePayload.reps = null;
      updatePayload.time_seconds = timeVal;
      if (field === 'weight' && weightVal >= 0 && weightVal !== strengthSet.weight) shouldUpdate = true;
      if (field === 'time' && timeVal > 0 && timeVal !== strengthSet.time_seconds) shouldUpdate = true;
    } else {
      updatePayload.reps = repsVal;
      updatePayload.time_seconds = null;
      if (field === 'weight' && weightVal >= 0 && weightVal !== strengthSet.weight) shouldUpdate = true;
      if (field === 'reps' && repsVal > 0 && repsVal !== strengthSet.reps) shouldUpdate = true;
    }

    if (shouldUpdate) {
        dispatch(updateSetAction(updatePayload));
    }
  };

  const handleDelete = () => {
    dispatch(deleteSetAction({ workoutExerciseId, setId: strengthSet.id }));
  };

  const showWeightIndicator = previousPerformance && !weightTouched && localWeight === '';
  const showRepsIndicator = !isStatic && previousPerformance && !repsTouched && localReps === '';
  const showTimeIndicator = isStatic && previousPerformance && !timeTouched && localTime === '';
  
  const previousRepsValue = isStatic ? undefined : previousPerformance?.reps ?? undefined;
  const previousTimeValue = isStatic ? previousPerformance?.time_seconds ?? undefined : undefined;

  return (
    <motion.tr
      {...motionProps}
      key={strengthSet.id}
      className={cn(
        "group",
        isCompleted && "bg-green-100 dark:bg-green-900/30",
        "border-b-0"
      )}
    >
      <TableCell key={`${strengthSet.id}-setnum`} className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
      <TableCell key={`${strengthSet.id}-prev`} className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
        {previousPerformance 
          ? isStatic
            ? `${previousPerformance.weight}kg x ${previousPerformance.time_seconds || '-'}s` 
            : `${previousPerformance.weight}kg x ${previousPerformance.reps || '-'}`
          : '-'}
      </TableCell>
      <TableCell key={`${strengthSet.id}-weight`} className="w-[75px] px-1 py-1 align-middle relative">
        <div>
          <Input
            id={`weight-${strengthSet.id}`}
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
        <TableCell key={`${strengthSet.id}-time`} className="w-[60px] px-1 py-1 align-middle relative">
          <div>
            <Input
              id={`time-${strengthSet.id}`}
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
      <TableCell key={`${strengthSet.id}-reps`} className="w-[60px] px-1 py-1 align-middle relative">
        <div>
          <Input
            id={`reps-${strengthSet.id}`}
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
      <TableCell key={`${strengthSet.id}-completed`} className="w-[40px] align-middle px-0 py-0">
        <div className="flex justify-center items-center h-full">
          <Checkbox
            id={`completed-${strengthSet.id}`}
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
