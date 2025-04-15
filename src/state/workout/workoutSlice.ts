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
        // Logic to add to history will be handled in historySlice or via thunk
      }
    },
    addExerciseToWorkout(state, action: PayloadAction<WorkoutExercise>) {
        if (state.currentWorkout) {
            state.currentWorkout.exercises.push(action.payload);
        }
    },
    addSetToExercise(state, action: PayloadAction<{ workoutExerciseId: string; exerciseId: string }>) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;

      // Create a new set, potentially copying weight from the last set
      const lastSet = workoutExercise.sets.at(-1);
      const newSet: ExerciseSet = {
        id: uuidv4(),
        weight: lastSet?.weight ?? 0,
        reps: lastSet?.reps ?? 0, // Or default to 0
        exerciseId: action.payload.exerciseId,
        completed: false,
      };
      workoutExercise.sets.push(newSet);
    },
    updateSet(state, action: PayloadAction<{ workoutExerciseId: string; setId: string; weight: number; reps: number }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
          (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (!workoutExercise) return;
        const set = workoutExercise.sets.find((s) => s.id === action.payload.setId);
        if (set) {
          set.weight = action.payload.weight;
          set.reps = action.payload.reps;
        }
    },
    deleteSet(state, action: PayloadAction<{ workoutExerciseId: string; setId: string }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
          (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (!workoutExercise) return;
        workoutExercise.sets = workoutExercise.sets.filter((s) => s.id !== action.payload.setId);
    },
    completeSet(state, action: PayloadAction<{ workoutExerciseId: string; setId: string; completed: boolean }>){
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
            workoutExercise.equipmentType = action.payload.equipmentType;
            // Optionally update equipment on all sets? Or handle in SetComponent?
        }
    },
    updateWorkoutExerciseVariation(state, action: PayloadAction<{ workoutExerciseId: string; variation: string }>) {
        if (!state.currentWorkout) return;
        const workoutExercise = state.currentWorkout.exercises.find(
            (ex) => ex.id === action.payload.workoutExerciseId
        );
        if (workoutExercise) {
            // Update the variation property on the WorkoutExercise instance
            workoutExercise.variation = action.payload.variation;
        }
    },
    // TODO: Add reducer for deleting a WorkoutExercise from currentWorkout
    deleteWorkoutExercise(state, action: PayloadAction<string>) { // workoutExerciseId
        if (state.currentWorkout) {
            state.currentWorkout.exercises = state.currentWorkout.exercises.filter(
                (ex) => ex.id !== action.payload
            );
        }
    },
    // TODO: Add reducers for updating equipment/variation within the workout context if needed
    // updateExerciseEquipment, updateExerciseVariation
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

export default workoutSlice.reducer; 