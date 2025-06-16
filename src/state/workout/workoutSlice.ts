import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { Workout, ExerciseSet, WorkoutExercise, StrengthSet, CardioSet, SessionFocus } from '../../lib/types/workout';
import { isCardioSet, isStrengthSet, getTargetHeartRateZone } from '../../lib/types/workout';
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
    startWorkout(state, action?: PayloadAction<{ sessionFocus?: SessionFocus }>) {
      const startTime = Date.now(); // Get current timestamp
      state.currentWorkout = {
        id: uuidv4(),
        date: new Date(startTime).toISOString(), // Use start time for date
        duration: 0, // Duration calculated on end
        exercises: [],
        completed: false,
        workout_type: undefined, // Will be determined based on exercises added
        session_focus: action?.payload?.sessionFocus,
      };
      state.workoutStartTime = startTime; // Store start time
    },
    setSessionFocus(state, action: PayloadAction<SessionFocus>) {
      if (state.currentWorkout) {
        state.currentWorkout.session_focus = action.payload;
      }
    },

    setWorkoutNotes(state, action: PayloadAction<string>) {
      if (state.currentWorkout) {
        state.currentWorkout.notes = action.payload;
      }
    },
    endWorkout(state) {
      if (state.currentWorkout && state.workoutStartTime) {
        state.currentWorkout.duration = Math.round((Date.now() - state.workoutStartTime) / 1000); // Duration in seconds
        state.currentWorkout.completed = true; // Mark as completed
        
        // Determine workout type based on exercises
        if (state.currentWorkout.exercises.length > 0) {
          const hasStrengthExercise = state.currentWorkout.exercises.some(ex => 
            ex.exercise.exercise_type !== 'cardio'
          );
          const hasCardioExercise = state.currentWorkout.exercises.some(ex => 
            ex.exercise.exercise_type === 'cardio'
          );
          
          if (hasStrengthExercise && hasCardioExercise) {
            state.currentWorkout.workout_type = 'mixed';
          } else if (hasCardioExercise) {
            state.currentWorkout.workout_type = 'cardio';
          } else {
            state.currentWorkout.workout_type = 'strength';
          }
        }
      }
    },
    clearWorkout(state) {
      state.currentWorkout = null;
      state.workoutStartTime = null;
    },
    addExerciseToWorkout(state, action: PayloadAction<WorkoutExercise>) {
        if (state.currentWorkout) {
            state.currentWorkout.exercises.push(action.payload);
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
      let weightForNewSet = lastSet && isStrengthSet(lastSet) ? lastSet.weight : 0;
      if (
          // Check against the string "Bodyweight"
          workoutExercise.equipmentType === "Bodyweight" &&
          action.payload.userBodyweight != null &&
          action.payload.userBodyweight > 0
      ) {
          weightForNewSet = action.payload.userBodyweight;
      }

      const isStatic = action.payload.isStatic;

      const newSet: StrengthSet = {
        id: uuidv4(),
        weight: weightForNewSet, // Use calculated initial weight
        reps: isStatic ? null : (lastSet && isStrengthSet(lastSet) ? lastSet.reps : 0),
        time_seconds: isStatic ? (lastSet && isStrengthSet(lastSet) ? lastSet.time_seconds : 0) : null,
        exerciseId: action.payload.exerciseId,
        completed: false,
        variation: lastSet && isStrengthSet(lastSet) ? lastSet.variation : workoutExercise.variation ?? 'Standard', 
        equipmentType: lastSet && isStrengthSet(lastSet) ? lastSet.equipmentType : workoutExercise.equipmentType, // Use workoutExercise equipment as fallback
      };
      workoutExercise.sets.push(newSet);
    },
    addCardioSetToExercise(
        state,
        action: PayloadAction<{
            workoutExerciseId: string;
            exerciseId: string;
        }>
    ) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;

      // Create a new cardio set, potentially copying values from the last cardio set
      const lastSet = workoutExercise.sets.length > 0 ? workoutExercise.sets[workoutExercise.sets.length - 1] : null;
      const lastCardioSet = lastSet && isCardioSet(lastSet) ? lastSet : null;

      // Auto-set target heart rate zone based on session focus
      const targetZone = state.currentWorkout.session_focus ? getTargetHeartRateZone(state.currentWorkout.session_focus) : null;

      const newSet: CardioSet = {
        id: uuidv4(),
        exerciseId: action.payload.exerciseId,
        duration_seconds: lastCardioSet?.duration_seconds ?? 0,
        distance_km: lastCardioSet?.distance_km,
        pace_min_per_km: lastCardioSet?.pace_min_per_km,
        heart_rate_bpm: lastCardioSet?.heart_rate_bpm,
        target_heart_rate_zone: (targetZone as 1 | 2 | 3 | 4 | 5) || lastCardioSet?.target_heart_rate_zone,
        perceived_exertion: lastCardioSet?.perceived_exertion,
        calories_burned: lastCardioSet?.calories_burned,
        completed: false,
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
      if (set && isStrengthSet(set)) {
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
    updateCardioSet(
      state,
      action: PayloadAction<{
        workoutExerciseId: string;
        setId: string;
        duration_seconds: number;
        distance_km?: number;
        pace_min_per_km?: number;
        heart_rate_bpm?: number[];
        target_heart_rate_zone?: 1 | 2 | 3 | 4 | 5;
        perceived_exertion?: number;
        calories_burned?: number;
      }>
    ) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;
      const set = workoutExercise.sets.find((s) => s.id === action.payload.setId);
      if (set && isCardioSet(set)) {
        set.duration_seconds = action.payload.duration_seconds;
        set.distance_km = action.payload.distance_km;
        set.pace_min_per_km = action.payload.pace_min_per_km;
        set.heart_rate_bpm = action.payload.heart_rate_bpm;
        set.target_heart_rate_zone = action.payload.target_heart_rate_zone;
        set.perceived_exertion = action.payload.perceived_exertion;
        set.calories_burned = action.payload.calories_burned;
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
            // Propagate the change to non-completed strength sets only
            workoutExercise.sets.forEach(set => {
                if (!set.completed && isStrengthSet(set)) {
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
             // Propagate the change to non-completed strength sets only
            workoutExercise.sets.forEach(set => {
                if (!set.completed && isStrengthSet(set)) {
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
  setSessionFocus,
  setWorkoutNotes,
  endWorkout,
  clearWorkout,
  addExerciseToWorkout,
  addSetToExercise,
  addCardioSetToExercise,
  updateSet,
  updateCardioSet,
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
export const selectWorkoutType = (state: RootState) => state.workout.currentWorkout?.workout_type;
export const selectSessionFocus = (state: RootState) => state.workout.currentWorkout?.session_focus;

export const selectWorkoutNotes = (state: RootState) => state.workout.currentWorkout?.notes;

// Additional selectors for session focus guidance
export const selectIsZone2Workout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'zone2';
export const selectIsZone5Workout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'zone5';
export const selectIsStrengthWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'strength';
export const selectIsHypertrophyWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'hypertrophy';
export const selectIsSpeedWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'speed';

export default workoutSlice.reducer; 