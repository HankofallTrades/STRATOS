import React from 'react';
import { useAppSelector } from "@/hooks/redux";
import { selectMesocycleProtocol, selectSessionFocus } from "@/state/workout/workoutSlice";
import { cn } from "@/lib/utils/cn";
import { getPerformanceIndicatorDecision } from "@/lib/utils/performanceIndicatorUtils";

interface PerformanceIndicatorProps {
  metric: 'weight' | 'reps' | 'time';
  previousValue?: number;
  previousWeightKg?: number;
  isStatic: boolean;
  visible: boolean;
  exerciseName?: string;
  recentFocusPerformance?: {
    reps?: number;
    time_seconds?: number;
    withinTimeframe: boolean;
  };
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  metric,
  previousValue,
  previousWeightKg,
  isStatic,
  visible,
  exerciseName,
  recentFocusPerformance
}) => {
  const sessionFocus = useAppSelector(selectSessionFocus);
  const mesocycleProtocol = useAppSelector(selectMesocycleProtocol);
  
  // Early return if not visible or no previous value
  if (!visible || previousValue === undefined) {
    return null;
  }

  const decision = getPerformanceIndicatorDecision(
    sessionFocus,
    mesocycleProtocol,
    metric,
    isStatic,
    previousValue,
    recentFocusPerformance,
    exerciseName,
    previousWeightKg
  );

  if (!decision.IconComponent) {
    return null;
  }

  return (
    <decision.IconComponent
      size={16}
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
        decision.colorClass
      )}
      title={decision.description}
      aria-hidden="true"
    />
  );
};

export default PerformanceIndicator; 
