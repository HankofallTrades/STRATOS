import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import type { RecommendedStrengthSetPerformance } from '../data/recommendations';
import {
  ExerciseSet,
  isStrengthSet,
  isCardioSet,
} from "@/lib/types/workout";
import { Input } from "@/components/core/input";
import { Timer, MapPin, Check, Play, Square } from "lucide-react";
import {
  TableCell,
} from "@/components/core/table";
import { cn } from "@/lib/utils/cn";
import PerformanceIndicator from "./PerformanceIndicator";
import { useSet } from '../hooks/useSet';

interface SetComponentProps extends MotionProps {
  workoutExerciseId: string;
  set: ExerciseSet;
  setIndex: number;
  previousPerformance: { weight: number; reps: number | null; time_seconds?: number | null } | null;
  recommendedPerformance: RecommendedStrengthSetPerformance | null;
  userBodyweight?: number | null;
  isStatic: boolean;
  isActive?: boolean;
  onComplete?: () => void;
}

const SetComponent: React.FC<SetComponentProps> = ({
  workoutExerciseId,
  set,
  setIndex,
  previousPerformance,
  recommendedPerformance,
  userBodyweight,
  isStatic,
  isActive = false,
  onComplete,
  ...motionProps
}) => {
  const {
    isCompleted,
    localWeight,
    localReps,
    localTime,
    localDuration,
    localDistance,
    cardioTimerRunning,
    handleWeightChange,
    handleRepsChange,
    handleTimeChange,
    handleDurationChange,
    handleDistanceChange,
    handleCompletionChange,
    handleBlur,
    handleStartCardioTimer,
    handleStopCardioTimer,
    showWeightIndicator,
    showRepsIndicator,
    showTimeIndicator
  } = useSet({
    workoutExerciseId,
    set,
    userBodyweight,
    isStatic,
    previousPerformance,
    recommendedPerformance,
    onComplete,
  });
  const weightIndicatorDirection =
    recommendedPerformance?.action === 'increase_load'
      ? 'up'
      : recommendedPerformance?.action === 'decrease_load'
        ? 'down'
        : null;
  const repsIndicatorDirection =
    recommendedPerformance?.action === 'increase_reps' ? 'up' : null;

  // Handle cardio sets with table layout
  if (isCardioSet(set)) {
    return (
      <motion.tr
        {...motionProps}
        key={set.id}
        className={cn(
          "group stone-seam border-b",
          isCompleted && "stone-row-complete",
          !isCompleted && isActive && "stone-row-active"
        )}
      >
        <TableCell className={cn(
          "w-[42px] px-2 py-2 text-center align-middle text-sm font-semibold text-foreground/85",
          isCompleted && "text-foreground/62"
        )}>{setIndex + 1}</TableCell>

        {/* Duration column */}
        <TableCell className="relative w-[88px] px-2 py-2 align-middle">
          <div className="flex items-center gap-1">
            {!isCompleted ? (
              <button
                onClick={cardioTimerRunning ? handleStopCardioTimer : handleStartCardioTimer}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] transition-colors",
                  cardioTimerRunning
                    ? "bg-rose-500/12 text-rose-400"
                    : "text-muted-foreground/60 hover:text-foreground/80"
                )}
                aria-label={cardioTimerRunning ? "Stop timer" : "Start timer"}
              >
                {cardioTimerRunning ? <Square size={10} className="fill-current" /> : <Play size={10} className="fill-current" />}
              </button>
            ) : (
              <Timer className="h-3 w-3 text-muted-foreground/60" />
            )}
            <Input
              id={`duration-${set.id}`}
              type="number"
              inputMode="numeric"
              value={localDuration}
              onChange={handleDurationChange}
              onBlur={() => handleBlur('duration')}
              className={cn(
                "stone-inset h-10 w-full rounded-[14px] px-0 text-center text-sm font-medium text-foreground shadow-none focus-visible:ring-0",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isCompleted && "stone-inset-complete text-foreground/58",
                cardioTimerRunning && "tabular-nums"
              )}
              placeholder={previousPerformance?.time_seconds ? String(previousPerformance.time_seconds) : "0"}
              aria-label="Duration in seconds"
              disabled={isCompleted || cardioTimerRunning}
            />
          </div>
        </TableCell>

        {/* Distance column */}
        <TableCell className="relative w-[88px] px-2 py-2 align-middle">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground/60" />
            <Input
              id={`distance-${set.id}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={localDistance}
              onChange={handleDistanceChange}
              onBlur={() => handleBlur('distance')}
              className={cn(
                "stone-inset h-10 w-full rounded-[14px] px-0 text-center text-sm font-medium text-foreground shadow-none focus-visible:ring-0",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isCompleted && "stone-inset-complete text-foreground/58"
              )}
              placeholder="0.0"
              aria-label="Distance in kilometers"
              disabled={isCompleted}
            />
          </div>
        </TableCell>

        {/* Completion checkbox */}
        <TableCell className="w-[52px] align-middle px-0 py-0">
          <div className="flex justify-center items-center h-full">
            <button
              id={`completed-${set.id}`}
              onClick={() => handleCompletionChange(!isCompleted)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[10px] bg-transparent transition-colors",
                isCompleted
                  ? "text-[#689f90]"
                  : "text-muted-foreground/58 hover:text-foreground/82"
              )}
              aria-label="Mark set as completed"
            >
              <Check size={20} className={cn(isCompleted && "stroke-[3px]")} />
            </button>
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
        "group stone-seam border-b",
        isCompleted && "stone-row-complete",
        !isCompleted && isActive && "stone-row-active"
      )}
    >
      <TableCell className={cn(
        "w-[42px] px-2 py-2 text-center align-middle text-sm font-semibold text-foreground/85",
        isCompleted && "text-foreground/62"
      )}>{setIndex + 1}</TableCell>
      <TableCell className="relative w-[92px] px-2 py-2 align-middle">
        <div>
          <input
            id={`weight-${set.id}`}
            type="number"
            inputMode="decimal"
            value={localWeight}
            onChange={handleWeightChange}
            onBlur={() => handleBlur('weight')}
            className={cn(
              "h-10 w-full rounded-[14px] border-0 bg-white/[0.018] px-0 text-center text-base font-medium text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              isCompleted && "bg-transparent text-foreground/58",
              !isCompleted && isActive && "bg-white/[0.03]"
            )}
            placeholder={previousPerformance ? String(previousPerformance.weight) : '0'}
            aria-label="Weight in kilograms"
            disabled={isCompleted}
          />
        </div>
        <PerformanceIndicator
          direction={weightIndicatorDirection}
          visible={showWeightIndicator && !isCompleted}
          description={weightIndicatorDirection === 'up' ? 'Increase load.' : 'Reduce load.'}
        />
      </TableCell>
      {isStatic ? (
        <TableCell className="relative w-[84px] px-2 py-2 align-middle">
          <div>
            <input
              id={`time-${set.id}`}
              type="number"
              inputMode="numeric"
              value={localTime}
              onChange={handleTimeChange}
              onBlur={() => handleBlur('time')}
              className={cn(
                "h-10 w-full rounded-[14px] border-0 bg-white/[0.018] px-0 text-center text-base font-medium text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isCompleted && "bg-transparent text-foreground/58",
                !isCompleted && isActive && "bg-white/[0.03]"
              )}
              placeholder={previousPerformance ? String(previousPerformance.time_seconds ?? '0') : '0'}
              aria-label="Time in seconds"
              disabled={isCompleted}
            />
          </div>
          <PerformanceIndicator
            direction={null}
            visible={showTimeIndicator && !isCompleted}
          />
        </TableCell>
      ) : (
        <TableCell className="relative w-[84px] px-2 py-2 align-middle">
          <div>
            <input
              id={`reps-${set.id}`}
              type="number"
              inputMode="numeric"
              value={localReps}
              onChange={handleRepsChange}
              onBlur={() => handleBlur('reps')}
              className={cn(
                "h-10 w-full rounded-[14px] border-0 bg-white/[0.018] px-0 text-center text-base font-medium text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isCompleted && "bg-transparent text-foreground/58",
                !isCompleted && isActive && "bg-white/[0.03]"
              )}
              placeholder={previousPerformance ? String(previousPerformance.reps ?? '0') : '0'}
              aria-label="Repetitions"
              disabled={isCompleted}
            />
          </div>
          <PerformanceIndicator
            direction={repsIndicatorDirection}
            visible={showRepsIndicator && !isCompleted}
            description="Increase reps."
          />
        </TableCell>
      )}
      <TableCell className="w-[52px] align-middle px-0 py-0">
        <div className="flex justify-center items-center h-full">
          <button
            id={`completed-${set.id}`}
            onClick={() => handleCompletionChange(!isCompleted)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-[10px] bg-transparent transition-colors",
              isCompleted
                ? "text-[#689f90]"
                : "text-muted-foreground/58 hover:text-foreground/82"
            )}
            aria-label="Mark set as completed"
          >
            <Check size={20} className={cn(isCompleted && "stroke-[3px]")} />
          </button>
        </div>
      </TableCell>
    </motion.tr>
  );
};

export default SetComponent;
