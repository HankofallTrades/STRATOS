import { SessionFocus } from '@/lib/types/workout';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface PerformanceIndicatorDecision {
  IconComponent: React.ElementType | null;
  colorClass: string;
  description?: string;
}

/**
 * Determines the performance indicator icon and color based on training focus and metrics
 */
export function getPerformanceIndicatorDecision(
  focus: SessionFocus | null,
  mesocycleProtocol: 'occams' | 'custom' | undefined,
  metric: 'weight' | 'reps' | 'time',
  isStatic: boolean,
  previousValue?: number,
  recentFocusPerformance?: {
    reps?: number;
    time_seconds?: number;
    withinTimeframe: boolean;
  },
  exerciseName?: string,
  previousWeightKg?: number
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

  const getOccamsRepRange = (name?: string): { min: number; max: number } => {
    const normalized = (name ?? '').trim().toLowerCase();
    if (normalized.includes('leg press') || normalized.includes('squat')) {
      return { min: 10, max: 12 };
    }
    return { min: 7, max: 12 };
  };

  const OCCAMS_PERCENT_INCREASE = 0.1;
  const OCCAMS_MIN_INCREASE_KG = 5;
  const OCCAMS_ROUNDING_INCREMENT_KG = 0.5;
  const snapToIncrement = (value: number, increment: number): number =>
    Math.round(value / increment) * increment;
  const formatKg = (value: number): string => {
    const normalized = Number(value.toFixed(2));
    return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
  };
  const getOccamsSuggestedWeight = (currentWeightKg: number): number => {
    const increaseKg = Math.max(OCCAMS_MIN_INCREASE_KG, currentWeightKg * OCCAMS_PERCENT_INCREASE);
    return snapToIncrement(currentWeightKg + increaseKg, OCCAMS_ROUNDING_INCREMENT_KG);
  };

  const occamsRepRange = getOccamsRepRange(exerciseName);
  const isOccams = mesocycleProtocol === 'occams' && focus === 'hypertrophy';

  if (isOccams) {
    if (metric === 'weight') {
      if (previousValue >= occamsRepRange.min) {
        const suggestedWeight =
          previousWeightKg && previousWeightKg > 0
            ? getOccamsSuggestedWeight(previousWeightKg)
            : null;
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: suggestedWeight
            ? `Occam: increase load to ${formatKg(suggestedWeight)}kg (max +5kg or +10%, snapped to ${OCCAMS_ROUNDING_INCREMENT_KG}kg).`
            : `Occam: increase load next time (met minimum ${occamsRepRange.min} reps).`,
        };
      }
      return {
        IconComponent: Minus,
        colorClass: "text-yellow-500",
        description: `Occam: keep load the same and build reps to at least ${occamsRepRange.min}.`,
      };
    }

    if (metric === 'reps' && !isStatic) {
      if (previousValue < occamsRepRange.min) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: `Occam: push reps up to at least ${occamsRepRange.min}.`,
        };
      }

      if (previousValue > occamsRepRange.max) {
        const suggestedWeight =
          previousWeightKg && previousWeightKg > 0
            ? getOccamsSuggestedWeight(previousWeightKg)
            : null;
        return {
          IconComponent: ArrowDown,
          colorClass: "text-sky-500",
          description: suggestedWeight
            ? `Occam: reps above ${occamsRepRange.max}; increase to ${formatKg(suggestedWeight)}kg (max +5kg or +10%, snapped to ${OCCAMS_ROUNDING_INCREMENT_KG}kg).`
            : `Occam: reps are above ${occamsRepRange.max}; increase load so reps come back into range.`,
        };
      }

      return {
        IconComponent: Minus,
        colorClass: "text-yellow-500",
        description: "Occam: reps are in target range; keep execution strict and progress load when ready.",
      };
    }

    if (metric === 'time' && isStatic) {
      return {
        IconComponent: Minus,
        colorClass: "text-yellow-500",
        description: "Occam: keep static hold quality consistent before progressing load.",
      };
    }
  }

  // Weight indicators - focus-aware logic
  if (metric === 'weight') {
    if (focus === 'strength') {
      // For strength: only recommend weight increase if previous reps were ≥6
      if (previousValue >= 6) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: "Increase weight next set.",
        };
      }
    } else if (focus === 'hypertrophy') {
      // For hypertrophy: only recommend weight increase if previous reps were ≥15
      if (previousValue >= 15) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: "Increase weight next set.",
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
          colorClass: "text-green-500",
          description: "Push for more reps.",
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500",
          description: "Hold steady.",
        };
      }
    } else if (focus === 'hypertrophy') {
      // Hypertrophy: recommend more reps if < 15, maintain if ≥ 15
      if (previousValue < 15) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: "Push for more reps.",
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500",
          description: "Hold steady.",
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
          colorClass: "text-green-500",
          description: "Increase hold time.",
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500",
          description: "Hold steady.",
        };
      }
    } else if (focus === 'hypertrophy') {
      // For static hypertrophy exercises: similar logic but maybe different thresholds in future
      if (previousValue > 30) {
        return {
          IconComponent: ArrowUp,
          colorClass: "text-green-500",
          description: "Increase hold time.",
        };
      } else {
        return {
          IconComponent: Minus,
          colorClass: "text-yellow-500",
          description: "Hold steady.",
        };
      }
    }
  }

  return noIndicator;
} 
