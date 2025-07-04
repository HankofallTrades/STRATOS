import React from 'react';
import { useAppSelector } from "@/hooks/redux";
import { selectSessionFocus } from "@/state/workout/workoutSlice";
import { cn } from "@/lib/utils/cn";
import { getPerformanceIndicatorDecision } from "@/lib/utils/performanceIndicatorUtils";

interface PerformanceIndicatorProps {
  metric: 'weight' | 'reps' | 'time';
  previousValue?: number;
  isStatic: boolean;
  visible: boolean;
  exerciseId?: string; // For future focus-specific performance lookup
  recentFocusPerformance?: {
    reps?: number;
    time_seconds?: number;
    withinTimeframe: boolean;
  };
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  metric,
  previousValue,
  isStatic,
  visible,
  exerciseId,
  recentFocusPerformance
}) => {
  const sessionFocus = useAppSelector(selectSessionFocus);
  
  // Early return if not visible or no previous value
  if (!visible || previousValue === undefined) {
    return null;
  }

  const decision = getPerformanceIndicatorDecision(
    sessionFocus,
    metric,
    isStatic,
    previousValue,
    recentFocusPerformance
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
      aria-hidden="true"
    />
  );
};

export default PerformanceIndicator; 