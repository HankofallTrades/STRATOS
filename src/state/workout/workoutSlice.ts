import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { Workout, ExerciseSet, WorkoutExercise } from '../../lib/types/workout';
import type { RootState } from '../store'; // Import RootState for selectors

interface WorkoutState {
  currentWorkout: Workout | null;
  workoutStartTime: number | null; // Store start time as timestamp (ms)
}

const initialState: WorkoutState = {
  currentWorkout: null,
  workoutStartTime: null, // Initialize as null
};

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout(state) {
      const startTime = Date.now(); // Get current timestamp
      state.currentWorkout = {
        id: uuidv4(),
        date: new Date(startTime).toISOString(), // Use start time for date
        duration: 0, // Duration calculated on end
        exercises: [],
        completed: false,
      };
      state.workoutStartTime = startTime; // Store start time
    },
    endWorkout(state) {
      if (state.currentWorkout && state.workoutStartTime) {
        const endTime = Date.now();
        const durationInSeconds = Math.round((endTime - state.workoutStartTime) / 1000);
        state.currentWorkout.completed = true;
        state.currentWorkout.duration = durationInSeconds; // Save calculated duration
        // Keep currentWorkout until it's saved/discarded by the component
        // state.currentWorkout = null; // Don't nullify here
        state.workoutStartTime = null; // Clear start time
      }
    },
    clearWorkout(state) {
      state.currentWorkout = null;
      state.workoutStartTime = null;
    },
    addExerciseToWorkout(state, action: PayloadAction<WorkoutExercise>) {
        if (state.currentWorkout) {
            if (!state.currentWorkout.exercises.some(ex => ex.exerciseId === action.payload.exerciseId)) {
                state.currentWorkout.exercises.push(action.payload);
            }
        }
    },
    addSetToExercise(
        state,
        action: PayloadAction<{
            workoutExerciseId: string;
            exerciseId: string;
            isStatic: boolean; // Added isStatic
            userBodyweight?: number | null; // Add optional bodyweight
        }>
    ) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;

      // Create a new set, potentially copying weight/reps/variation/equipment from the last set
      const lastSet = workoutExercise.sets.length > 0 ? workoutExercise.sets[workoutExercise.sets.length - 1] : null;

      // Determine initial weight: Bodyweight if applicable, else last set weight or 0
      let weightForNewSet = lastSet?.weight ?? 0;
      if (
          // Check against the string "Bodyweight"
          workoutExercise.equipmentType === "Bodyweight" &&
          action.payload.userBodyweight != null &&
          action.payload.userBodyweight > 0
      ) {
          weightForNewSet = action.payload.userBodyweight;
      }

      const isStatic = action.payload.isStatic;

      const newSet: ExerciseSet = {
        id: uuidv4(),
        weight: weightForNewSet, // Use calculated initial weight
        reps: isStatic ? null : (lastSet?.reps ?? 0),
        time_seconds: isStatic ? (lastSet?.time_seconds ?? 0) : null,
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
        reps: number | null; // Make reps nullable
        time_seconds?: number | null; // Add time_seconds
        variation?: string | null; // Add optional variation
        equipmentType?: string | null; // Add optional equipmentType
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
        set.time_seconds = action.payload.time_seconds; // Assign time_seconds
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
    updateWorkoutExerciseEquipment(state, action: PayloadAction<{ workoutExerciseId: string; equipmentType: string }>) {
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
    clearWorkout,
    addExerciseToWorkout,
    addSetToExercise,
    updateSet,
    deleteSet,
    completeSet,
    updateWorkoutExerciseEquipment,
    updateWorkoutExerciseVariation,
    deleteWorkoutExercise,
} = workoutSlice.actions;

// Selectors
export const selectCurrentWorkout = (state: RootState) => state.workout.currentWorkout;
export const selectWorkoutStartTime = (state: RootState) => state.workout.workoutStartTime;
export const selectIsWorkoutActive = (state: RootState) => state.workout.currentWorkout !== null && !state.workout.currentWorkout.completed && state.workout.workoutStartTime !== null;

// --- End Placeholder Selectors ---

export default workoutSlice.reducer; 