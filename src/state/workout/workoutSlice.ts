import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { Workout, ExerciseSet, WorkoutExercise, StrengthSet, CardioSet, SessionFocus } from '../../lib/types/workout';
import { isCardioSet, isStrengthSet, timeToSeconds, secondsToTime } from '../../lib/types/workout';
import type { RootState } from '../store'; // Import RootState for selectors

interface WorkoutState {
  currentWorkout: Workout | null;
  ownerUserId: string | null;
  workoutStartTime: number | null; // Store start time as timestamp (ms)
  warmupStartTime: number | null;
}

interface StartWorkoutPayload {
  sessionFocus?: SessionFocus;
  initialExercises?: WorkoutExercise[];
  mesocycleId?: string;
  mesocycleSessionId?: string;
  mesocycleWeek?: number;
  mesocycleProtocol?: 'occams' | 'custom';
  ownerUserId?: string | null;
}

const initialState: WorkoutState = {
  currentWorkout: null,
  ownerUserId: null,
  workoutStartTime: null,
  warmupStartTime: null,
};

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout(state, action?: PayloadAction<StartWorkoutPayload>) {
      const startTime = Date.now(); // Get current timestamp
      const initialExercises = (action?.payload?.initialExercises ?? []).map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({ ...set })),
      }));
      state.currentWorkout = {
        id: uuidv4(),
        date: new Date(startTime).toISOString(), // Use start time for date
        duration: 0, // Duration calculated on end
        exercises: initialExercises,
        completed: false,
        workout_type: undefined, // Will be determined based on exercises added
        session_focus: action?.payload?.sessionFocus,
        mesocycle_id: action?.payload?.mesocycleId,
        mesocycle_session_id: action?.payload?.mesocycleSessionId,
        mesocycle_week: action?.payload?.mesocycleWeek,
        mesocycle_protocol: action?.payload?.mesocycleProtocol,
      };
      state.ownerUserId = action?.payload?.ownerUserId ?? null;
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
      state.ownerUserId = null;
      state.workoutStartTime = null;
      state.warmupStartTime = null;
    },
    startWarmup(state) {
      state.warmupStartTime = Date.now();
    },
    stopWarmup(state) {
      if (state.currentWorkout && state.warmupStartTime) {
        state.currentWorkout.warmup_seconds = Math.round((Date.now() - state.warmupStartTime) / 1000);
        state.warmupStartTime = null;
      }
    },
    addExerciseToWorkout(state, action: PayloadAction<WorkoutExercise>) {
        if (state.currentWorkout) {
            state.currentWorkout.exercises.push(action.payload);
        }
    },
    replaceWorkoutExercise(state, action: PayloadAction<WorkoutExercise>) {
        if (!state.currentWorkout) return;
        const exerciseIndex = state.currentWorkout.exercises.findIndex(
            (ex) => ex.id === action.payload.id
        );
        if (exerciseIndex === -1) return;
        state.currentWorkout.exercises[exerciseIndex] = action.payload;
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

      const isStatic = action.payload.isStatic;

      const newSet: StrengthSet = {
        id: uuidv4(),
        weight: 0,
        reps: isStatic ? null : 0,
        time: null,
        exerciseId: action.payload.exerciseId,
        completed: false,
        variation: workoutExercise.variation ?? 'Standard',
        equipmentType: workoutExercise.equipmentType,
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

      const newSet: CardioSet = {
        id: uuidv4(),
        exerciseId: action.payload.exerciseId,
        time: secondsToTime(0),
        distance_km: undefined,
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
        time?: { hours: number; minutes: number; seconds: number } | null; // Add time structure
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
        set.time = action.payload.time; // Assign time structure
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
        time: { hours: number; minutes: number; seconds: number };
        distance_km?: number;
      }>
    ) {
      if (!state.currentWorkout) return;
      const workoutExercise = state.currentWorkout.exercises.find(
        (ex) => ex.id === action.payload.workoutExerciseId
      );
      if (!workoutExercise) return;
      const set = workoutExercise.sets.find((s) => s.id === action.payload.setId);
      if (set && isCardioSet(set)) {
        set.time = action.payload.time;
        set.distance_km = action.payload.distance_km;
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
            if (action.payload.completed && state.warmupStartTime) {
                state.currentWorkout.warmup_seconds = Math.round((Date.now() - state.warmupStartTime) / 1000);
                state.warmupStartTime = null;
            }
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
  startWarmup,
  stopWarmup,
  addExerciseToWorkout,
  replaceWorkoutExercise,
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
export const selectWorkoutOwnerUserId = (state: RootState) => state.workout.ownerUserId;
export const selectWorkoutStartTime = (state: RootState) => state.workout.workoutStartTime;
export const selectIsWorkoutActive = (state: RootState) => state.workout.currentWorkout !== null && !state.workout.currentWorkout.completed && state.workout.workoutStartTime !== null;
export const selectWorkoutType = (state: RootState) => state.workout.currentWorkout?.workout_type;
export const selectSessionFocus = (state: RootState) => state.workout.currentWorkout?.session_focus;
export const selectMesocycleProtocol = (state: RootState) => state.workout.currentWorkout?.mesocycle_protocol;

export const selectWorkoutNotes = (state: RootState) => state.workout.currentWorkout?.notes;
export const selectWarmupStartTime = (state: RootState) => state.workout.warmupStartTime;
export const selectWarmupSeconds = (state: RootState) => state.workout.currentWorkout?.warmup_seconds;

// Additional selectors for session focus guidance
export const selectIsZone2Workout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'zone2';
export const selectIsZone5Workout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'zone5';
export const selectIsStrengthWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'strength';
export const selectIsHypertrophyWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'hypertrophy';
export const selectIsSpeedWorkout = (state: RootState) => state.workout.currentWorkout?.session_focus === 'speed';

export default workoutSlice.reducer; 
