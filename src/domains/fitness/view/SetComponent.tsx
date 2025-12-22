import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import {
  ExerciseSet,
  isStrengthSet,
  isCardioSet,
} from "@/lib/types/workout";
import { Input } from "@/components/core/input";
import { Checkbox } from "@/components/core/checkbox";
import { Timer, MapPin } from "lucide-react";
import {
  TableCell,
} from "@/components/core/table";
import { cn } from "@/lib/utils/cn";
import PerformanceIndicator from "./PerformanceIndicator";
import { useSet } from '../controller/useSet';

interface SetComponentProps extends MotionProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  previousPerformance: { weight: number; reps: number | null; time_seconds?: number | null } | null;
  userBodyweight?: number | null;
  isStatic: boolean;
}

const SetComponent: React.FC<SetComponentProps> = ({
  workoutExerciseId,
  set,
  setIndex,
  previousPerformance,
  userBodyweight,
  isStatic,
  ...motionProps
}) => {
  const {
    isCompleted,
    localWeight,
    localReps,
    localTime,
    localDuration,
    localDistance,
    handleWeightChange,
    handleRepsChange,
    handleTimeChange,
    handleDurationChange,
    handleDistanceChange,
    handleCompletionChange,
    handleBlur,
    showWeightIndicator,
    showRepsIndicator,
    showTimeIndicator,
    previousRepsValue,
    previousTimeValue
  } = useSet({
    workoutExerciseId,
    set,
    userBodyweight,
    isStatic,
    previousPerformance
  });

  // Handle cardio sets with table layout
  if (isCardioSet(set)) {
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
        <TableCell className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
        <TableCell className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
          -
        </TableCell>

        {/* Duration column */}
        <TableCell className="w-[75px] px-1 py-1 align-middle relative">
          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3 text-gray-400" />
            <Input
              id={`duration-${set.id}`}
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
        <TableCell className="w-[75px] px-1 py-1 align-middle relative">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <Input
              id={`distance-${set.id}`}
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
      </motion.tr>
    );
  }

  // Type guard ensures this is a StrengthSet
  if (!isStrengthSet(set)) {
    return null; // Should not happen
  }

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
      <TableCell className="font-medium text-center w-[35px] px-1 py-1 align-middle">{setIndex + 1}</TableCell>
      <TableCell className="text-center text-xs text-muted-foreground w-[70px] px-1 py-1 align-middle">
        {previousPerformance
          ? isStatic
            ? `${previousPerformance.weight}kg x ${previousPerformance.time_seconds || '-'}s`
            : `${previousPerformance.weight}kg x ${previousPerformance.reps || '-'}`
          : '-'}
      </TableCell>
      <TableCell className="w-[75px] px-1 py-1 align-middle relative">
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
          metric="weight"
          previousValue={previousRepsValue}
          isStatic={isStatic}
          visible={showWeightIndicator}
        />
      </TableCell>
      {isStatic ? (
        <TableCell className="w-[60px] px-1 py-1 align-middle relative">
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
            metric="time"
            previousValue={previousTimeValue}
            isStatic={isStatic}
            visible={showTimeIndicator}
          />
        </TableCell>
      ) : (
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
              placeholder={previousPerformance ? String(previousPerformance.reps ?? '0') : '0'}
              aria-label="Repetitions"
              disabled={isCompleted}
            />
          </div>
          <PerformanceIndicator
            metric="reps"
            previousValue={previousRepsValue}
            isStatic={isStatic}
            visible={showRepsIndicator}
          />
        </TableCell>
      )}
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
    </motion.tr>
  );
};

export default SetComponent;
