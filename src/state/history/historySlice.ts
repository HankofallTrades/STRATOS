import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Workout } from '../../lib/types/workout';
import type { RootState } from '../store';

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

// Example selector for getting last performance of an exercise (as mentioned in plan)
export const selectLastPerformance = (state: RootState, exerciseId: string): { weight: number; reps: number } | null => {
  for (const workout of state.history.workoutHistory) {
    for (const workoutExercise of workout.exercises) {
      if (workoutExercise.exerciseId === exerciseId) {
        // Find the best completed set for this exercise in this workout
        const bestSet = workoutExercise.sets
          .filter(set => set.completed)
          .reduce((max: { weight: number; reps: number } | null, set) => {
            if (!max || set.weight > max.weight || (set.weight === max.weight && set.reps > max.reps)) {
              return { weight: set.weight, reps: set.reps };
            }
            return max;
          }, null);

        if (bestSet) return bestSet; // Found performance in the most recent workout
      }
    }
  }
  return null; // No performance found
};

/**
 * Selects the weight and reps for a specific set index of a given exercise 
 * from the most recent workout in history where that set was completed.
 */
export const selectLastPerformanceForSet = (
    state: RootState,
    exerciseId: string,
    setIndex: number // Use 0-based index
  ): { weight: number; reps: number } | null => {
    // Iterate history from newest (index 0) to oldest
    for (const workout of state.history.workoutHistory) {
      // Find the specific exercise within this workout
      const workoutExercise = workout.exercises.find(
        (woEx) => woEx.exerciseId === exerciseId
      );
  
      if (workoutExercise) {
        // Check if a set exists at the specified index (setIndex)
        // Note: setIndex corresponds to the array index, not necessarily set_number if sets were deleted.
        // We assume the order in state matches the intended set order.
        if (setIndex >= 0 && setIndex < workoutExercise.sets.length) {
          const targetSet = workoutExercise.sets[setIndex];
          // Ensure the set was completed
          if (targetSet && targetSet.completed) {
            // Found the most recent completed performance for this specific set index
            return { weight: targetSet.weight, reps: targetSet.reps };
          }
        }
      }
    }
  
    // If no matching completed set was found in history
    return null;
  };

export default historySlice.reducer; 