import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { Workout, ExerciseSet, WorkoutExercise } from '../../lib/types/workout';
import type { EquipmentType } from '../../lib/types/enums'; // Import EquipmentType
import type { RootState } from '../store'; // Import RootState for selectors

interface WorkoutState {
  currentWorkout: Workout | null;
  workoutTime: number; // in seconds
}

const initialState: WorkoutState = {
  currentWorkout: null,
  workoutTime: 0,
};

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout(state) {
      state.currentWorkout = {
        id: uuidv4(),
        date: new Date().toISOString(), // Store as ISO string
        duration: 0,
        exercises: [],
        completed: false,
      };
      state.workoutTime = 0;
    },
    endWorkout(state) {
      if (state.currentWorkout) {
        state.currentWorkout.completed = true;
        state.currentWorkout.duration = state.workoutTime;
        state.currentWorkout = null;
      }
    },
    addExerciseToWorkout(state, action: PayloadAction<WorkoutExercise>) {
        if (state.currentWorkout) {
            if (!state.currentWorkout.exercises.some(ex => ex.exerciseId === action.payload.exerciseId)) {
                state.currentWorkout.exercises.push(action.payload);
            }
        }
    },
    addSetToExercise(state, action: PayloadAction<{ workoutExerciseId: string; exerciseId: string }>) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;

      // Create a new set, potentially copying weight/reps/variation/equipment from the last set
      const lastSet = workoutExercise.sets.at(-1);
      const newSet: ExerciseSet = {
        id: uuidv4(),
        weight: lastSet?.weight ?? 0,
        reps: lastSet?.reps ?? 0,
        exerciseId: action.payload.exerciseId,
        completed: false,
        variation: lastSet?.variation ?? workoutExercise.variation ?? 'Standard', 
        equipmentType: lastSet?.equipmentType ?? workoutExercise.equipmentType, // Use workoutExercise equipment as fallback
      };
      workoutExercise.sets.push(newSet);
    },
    updateSet(
      state,
      action: PayloadAction<{
        workoutExerciseId: string;
        setId: string;
        weight: number;
        reps: number;
        variation?: string | null; // Add optional variation
        equipmentType?: EquipmentType | null; // Add optional equipmentType
      }>
    ) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;
      const set = workoutExercise.sets.find((s) => s.id === action.payload.setId);
      if (set) {
        set.weight = action.payload.weight;
        set.reps = action.payload.reps;
        if (action.payload.variation !== undefined) {
            set.variation = action.payload.variation ?? undefined; // Handle null
        }
        if (action.payload.equipmentType !== undefined) {
             set.equipmentType = action.payload.equipmentType ?? undefined; // Handle null
        }
      }
    },
    deleteSet(state, action: PayloadAction<{ workoutExerciseId: string; setId: string }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (workoutExercise) {
            workoutExercise.sets = workoutExercise.sets.filter((s) => s.id !== action.payload.setId);
        }
    },
    completeSet(state, action: PayloadAction<{ workoutExerciseId: string; setId: string; completed: boolean }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (!workoutExercise) return;
        const set = workoutExercise.sets.find((s) => s.id === action.payload.setId);
        if (set) {
            set.completed = action.payload.completed;
        }
    },
    tickWorkoutTime(state) {
        if (state.currentWorkout && !state.currentWorkout.completed) {
            state.workoutTime += 1;
        }
    },
    updateWorkoutExerciseEquipment(state, action: PayloadAction<{ workoutExerciseId: string; equipmentType: EquipmentType }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (workoutExercise) {
            // Update the parent workoutExercise object
            workoutExercise.equipmentType = action.payload.equipmentType;
            // Propagate the change to non-completed sets
            workoutExercise.sets.forEach(set => {
                if (!set.completed) {
                    set.equipmentType = action.payload.equipmentType;
                }
            });
        }
    },
    updateWorkoutExerciseVariation(state, action: PayloadAction<{ workoutExerciseId: string; variation: string }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (workoutExercise) {
             // Update the parent workoutExercise object
            workoutExercise.variation = action.payload.variation;
             // Propagate the change to non-completed sets
            workoutExercise.sets.forEach(set => {
                if (!set.completed) {
                    set.variation = action.payload.variation;
                }
            });
        }
    },
    deleteWorkoutExercise(state, action: PayloadAction<string>) { // workoutExerciseId
        if (state.currentWorkout) {
            state.currentWorkout.exercises = state.currentWorkout.exercises.filter(
                (ex) => ex.id !== action.payload
            );
        }
    },
  },
});

export const {
    startWorkout,
    endWorkout,
    addExerciseToWorkout,
    addSetToExercise,
    updateSet,
    deleteSet,
    completeSet,
    tickWorkoutTime,
    updateWorkoutExerciseEquipment,
    updateWorkoutExerciseVariation,
    deleteWorkoutExercise,
} = workoutSlice.actions;

// Selectors
export const selectCurrentWorkout = (state: RootState) => state.workout.currentWorkout;
export const selectWorkoutTime = (state: RootState) => state.workout.workoutTime;
export const selectIsWorkoutActive = (state: RootState) => state.workout.currentWorkout !== null && !state.workout.currentWorkout.completed;

// --- Placeholder Selectors (TODO: Move to workoutSlice.ts and implement properly) ---
// export const selectLastPerformanceForExercise = (state: RootState, exerciseId: string): { weight: number; reps: number } | null => {
//   console.warn(`Placeholder selector used for selectLastPerformanceForExercise (exerciseId: ${exerciseId})`);
//   // Actual logic will query workoutHistory slice
//   return null;
// };

export const selectOneRepMaxForExercise = (state: RootState, exerciseId: string): number | null => {
  console.warn(`Placeholder selector used for selectOneRepMaxForExercise (exerciseId: ${exerciseId})`);
  // Actual logic might query user_exercise_stats or calculate from history
  return null;
};
// --- End Placeholder Selectors ---

export default workoutSlice.reducer; 