import { SessionFocus } from '@/lib/types/workout';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface PerformanceIndicatorDecision {
  IconComponent: React.ElementType | null;
  colorClass: string;
}

/**
 * Determines the performance indicator icon and color based on training focus and metrics
 */
export function getPerformanceIndicatorDecision(
  focus: SessionFocus | null,
  metric: 'weight' | 'reps' | 'time',
  isStatic: boolean,
  previousValue?: number,
  recentFocusPerformance?: {
    reps?: number;
    time_seconds?: number;
    withinTimeframe: boolean;
  }
): PerformanceIndicatorDecision {
  const noIndicator: PerformanceIndicatorDecision = {
    IconComponent: null,
    colorClass: "text-muted-foreground"
  };

  // Early return if no previous value
  if (previousValue === undefined) {
    return noIndicator;
  }

  // Only show indicators for strength and hypertrophy focuses
  if (focus !== 'strength' && focus !== 'hypertrophy') {
    return noIndicator;
  }

  // Weight indicators - focus-aware logic
  if (metric === 'weight') {
    if (focus === 'strength') {
      // For strength: only recommend weight increase if previous reps were ≥6
      if (previousValue >= 6) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      }
    } else if (focus === 'hypertrophy') {
      // For hypertrophy: only recommend weight increase if previous reps were ≥15
      if (previousValue >= 15) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      }
    }
    return noIndicator;
  }

  // Reps indicators - focus-aware logic
  if (metric === 'reps' && !isStatic) {
    if (focus === 'strength') {
      // Strength: recommend more reps if < 8, maintain if ≥ 8
      if (previousValue < 8) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500"
        };
      }
    } else if (focus === 'hypertrophy') {
      // Hypertrophy: recommend more reps if < 15, maintain if ≥ 15
      if (previousValue < 15) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500"
        };
      }
    }
  }

  // Time indicators for static exercises - focus-aware logic
  if (metric === 'time' && isStatic) {
    if (focus === 'strength') {
      // For static strength exercises: recommend more time if > 30s
      if (previousValue > 30) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500"
        };
      }
    } else if (focus === 'hypertrophy') {
      // For static hypertrophy exercises: similar logic but maybe different thresholds in future
      if (previousValue > 30) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500"
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500"
        };
      }
    }
  }

  return noIndicator;
} 