import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Workout } from '../../lib/types/workout';
import type { RootState } from '../store';
import { EquipmentType } from '@/lib/types/enums';

interface HistoryState {
  workoutHistory: Workout[];
}

const initialState: HistoryState = {
  workoutHistory: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addWorkoutToHistory(state, action: PayloadAction<Workout>) {
      // Ensure the workout is marked as completed before adding
      if (action.payload.completed) {
        // Avoid duplicates based on id
        if (!state.workoutHistory.some(w => w.id === action.payload.id)) {
          state.workoutHistory.unshift(action.payload); // Add to the beginning
        }
      }
    },
    deleteWorkoutFromHistory(state, action: PayloadAction<string>) { // Payload is workoutId
      state.workoutHistory = state.workoutHistory.filter(w => w.id !== action.payload);
    },
    // Load initial history (e.g., from localStorage or API)
    setHistory(state, action: PayloadAction<Workout[]>){
        state.workoutHistory = action.payload;
    },
  },
});

export const {
    addWorkoutToHistory,
    deleteWorkoutFromHistory,
    setHistory,
} = historySlice.actions;

// Selectors
export const selectWorkoutHistory = (state: RootState) => state.history.workoutHistory;
export const selectWorkoutByIdFromHistory = (state: RootState, workoutId: string) =>
    state.history.workoutHistory.find(w => w.id === workoutId);

// Selector for getting last performance of an exercise with specific equipment and variation
export const selectLastPerformance = (
  state: RootState,
  exerciseId: string,
  equipmentType: EquipmentType | undefined | null,
  variation: string | undefined | null
): { weight: number; reps: number } | null => {
  const targetVariation = variation || 'Standard'; // Treat null/undefined as 'Standard'

  for (const workout of state.history.workoutHistory) { // Iterate newest first
    for (const workoutExercise of workout.exercises) {
      if (workoutExercise.exerciseId === exerciseId) {
        // Find the best completed set matching equipment and variation
        const bestSet = workoutExercise.sets
          .filter(set => {
            const setVariation = set.variation || 'Standard'; // Treat null/undefined in history as 'Standard'
            // Match equipment (null/undefined matches null/undefined)
            const equipmentMatch = set.equipmentType === equipmentType; 
            // Match variation (after normalizing null/undefined to 'Standard')
            const variationMatch = setVariation === targetVariation; 
            return set.completed && equipmentMatch && variationMatch;
          })
          .reduce((max: { weight: number; reps: number } | null, set) => {
            // Find best set based on weight, then reps
            if (!max || set.weight > max.weight || (set.weight === max.weight && set.reps > max.reps)) {
              return { weight: set.weight, reps: set.reps };
            }
            return max;
          }, null);

        if (bestSet) return bestSet; // Found performance in the most recent workout matching criteria
      }
    }
  }
  return null; // No performance found matching criteria
};

/**
 * Selects the weight and reps for a specific set index of a given exercise,
 * matching specific equipment and variation, from the most recent workout
 * in history where that set was completed.
 */
export const selectLastPerformanceForSet = (
    state: RootState,
    exerciseId: string,
    setIndex: number, // Use 0-based index
    equipmentType: EquipmentType | undefined | null,
    variation: string | undefined | null
  ): { weight: number; reps: number } | null => {
    const targetVariation = variation || 'Standard'; // Treat null/undefined as 'Standard'

    // Iterate history from newest (index 0) to oldest
    for (const workout of state.history.workoutHistory) {
      // Find the specific exercise within this workout
      const workoutExercise = workout.exercises.find(
        (woEx) => woEx.exerciseId === exerciseId
      );

      if (workoutExercise) {
        // Check if a set exists at the specified index (setIndex)
        // We assume the order in state matches the intended set order.
        if (setIndex >= 0 && setIndex < workoutExercise.sets.length) {
          const targetSet = workoutExercise.sets[setIndex];
          // Ensure the set was completed and matches criteria
          const setVariation = targetSet.variation || 'Standard';
          const equipmentMatch = targetSet.equipmentType === equipmentType;
          const variationMatch = setVariation === targetVariation;

          if (targetSet && targetSet.completed && equipmentMatch && variationMatch) {
            // Found the most recent completed performance for this specific set index
            // matching the equipment and variation
            return { weight: targetSet.weight, reps: targetSet.reps };
          }
        }
      }
    }

    // If no matching completed set was found in history
    return null;
  };

export default historySlice.reducer; 