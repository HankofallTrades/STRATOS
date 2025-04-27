import { Exercise, Workout, WeightSuggestion, ExerciseSet } from '@/lib/types/workout';
import { EquipmentType } from "@/lib/types/enums";

// Calculate one rep max using Brzycki formula
export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps <= 0) return 0; // Avoid division by zero or negative reps
  // Ensure reps is not too high to cause division by zero or negative denominator
  if (reps >= 37) return weight; // Or handle as per desired logic for high reps
  return weight * (36 / (37 - reps));
};

// Get weight suggestions based on 1RM
export const getWeightSuggestions = (oneRepMax: number | null | undefined): WeightSuggestion[] => {
  // If no 1RM is provided or it's zero/negative, return empty suggestions
  if (!oneRepMax || oneRepMax <= 0) return [];

  const suggestions: WeightSuggestion[] = [];
  const percentages = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

  percentages.forEach((p) => {
    suggestions.push({
      percentage: p * 100,
      weight: Math.round((oneRepMax * p) / 2.5) * 2.5, // Round to nearest 2.5
    });
  });

  return suggestions;
};

// Get the last performance for a specific exercise
export const getLastPerformance = (exerciseId: string, workoutHistory: Workout[]): { weight: number; reps: number } | null => {
  let lastPerformance: { weight: number; reps: number } | null = null;

  // Iterate through history backwards
  for (let i = workoutHistory.length - 1; i >= 0; i--) {
    const workout = workoutHistory[i];
    // Iterate through exercises in the workout backwards
    for (let j = workout.exercises.length - 1; j >= 0; j--) {
      const workoutExercise = workout.exercises[j];
      if (workoutExercise.exerciseId === exerciseId) {
        // Iterate through sets in the exercise backwards
        for (let k = workoutExercise.sets.length - 1; k >= 0; k--) {
          const set = workoutExercise.sets[k];
          if (set.completed) {
            lastPerformance = { weight: set.weight, reps: set.reps };
            // Found the most recent completed set for this exercise, break loops
            return lastPerformance;
          }
        }
      }
    }
  }
  return lastPerformance; // Return null if no performance found
};


// Get the last performance for a specific set number, optionally filtering by equipment and variation
export const getLastSetPerformance = (
  exerciseId: string,
  setNumber: number, // 1-indexed
  workoutHistory: Workout[],
  equipmentType?: EquipmentType,
  variation?: string
): { weight: number; reps: number } | null => {
  // Iterate through history backwards
  for (let i = workoutHistory.length - 1; i >= 0; i--) {
    const workout = workoutHistory[i];
    const workoutExercise = workout.exercises.find(we => we.exerciseId === exerciseId);

    if (workoutExercise) {
      // Find sets matching criteria, filter out incomplete sets first
      const completedSets = workoutExercise.sets.filter(s => s.completed);
      const matchingSets = completedSets.filter(set => {
        // Check equipment type if provided
        const equipmentMatch = !equipmentType || set.equipmentType === equipmentType;
        // Check variation if provided
        const variationMatch = !variation || set.variation === variation;
        return equipmentMatch && variationMatch;
      });

      // Check if the requested setNumber exists within the matching sets
      if (matchingSets.length >= setNumber) {
        // Get the specific set (0-indexed access for setNumber-1)
        const targetSet = matchingSets[setNumber - 1];
        // Check if this specific set index actually exists (redundant check, but safe)
         if (targetSet) {
           return { weight: targetSet.weight, reps: targetSet.reps };
         }
      }
    }
  }

  return null; // Return null if no matching performance found across history
}; 