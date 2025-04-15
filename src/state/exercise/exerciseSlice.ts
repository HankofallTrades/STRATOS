import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Exercise } from '../../lib/types/workout';
import type { EquipmentType } from '../../lib/types/enums';
import { v4 as uuidv4 } from 'uuid';
import type { RootState } from '../store';

interface ExerciseState {
  exercises: Exercise[];
  lastUsedEquipment: { [exerciseId: string]: EquipmentType };
  exerciseVariations: { [exerciseId: string]: string[] };
}

const initialState: ExerciseState = {
  exercises: [],
  lastUsedEquipment: {},
  exerciseVariations: {},
};

const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    addExercise(state, action: PayloadAction<Omit<Exercise, 'id'> | Exercise>) {
      const newExercise: Exercise = 'id' in action.payload
        ? action.payload
        : { ...action.payload, id: uuidv4() };

      // Avoid duplicates
      if (!state.exercises.some(ex => ex.name === newExercise.name && ex.equipmentType === newExercise.equipmentType)) {
        state.exercises.push(newExercise);
      }
    },
    updateExercise(state, action: PayloadAction<Exercise>) {
      const index = state.exercises.findIndex(ex => ex.id === action.payload.id);
      if (index !== -1) {
        state.exercises[index] = action.payload;
      }
    },
    deleteExercise(state, action: PayloadAction<string>) { // Payload is exerciseId
      state.exercises = state.exercises.filter(ex => ex.id !== action.payload);
      delete state.lastUsedEquipment[action.payload];
      delete state.exerciseVariations[action.payload];
    },
    setLastUsedEquipment(state, action: PayloadAction<{ exerciseId: string; equipmentType: EquipmentType }>) {
      state.lastUsedEquipment[action.payload.exerciseId] = action.payload.equipmentType;
    },
    addExerciseVariation(state, action: PayloadAction<{ exerciseId: string; variation: string }>) {
      const { exerciseId, variation } = action.payload;
      if (!state.exerciseVariations[exerciseId]) {
        state.exerciseVariations[exerciseId] = [];
      }
      if (!state.exerciseVariations[exerciseId].includes(variation)) {
        state.exerciseVariations[exerciseId].push(variation);
      }
      // Also update the exercise definition itself if found
      const exercise = state.exercises.find(ex => ex.id === exerciseId);
      if (exercise) {
        if (!exercise.variations) {
            exercise.variations = [];
        }
        if (!exercise.variations.includes(variation)) {
            exercise.variations.push(variation);
        }
      }
    },
    // Maybe add deleteVariation?

    // Load initial exercises (e.g., from localStorage or API)
    setExercises(state, action: PayloadAction<Exercise[]>){
        state.exercises = action.payload;
    },
  },
});

export const {
    addExercise,
    updateExercise,
    deleteExercise,
    setLastUsedEquipment,
    addExerciseVariation,
    setExercises,
} = exerciseSlice.actions;

// Selectors
export const selectAllExercises = (state: RootState) => state.exercise.exercises;
export const selectExerciseById = (state: RootState, exerciseId: string) =>
    state.exercise.exercises.find(ex => ex.id === exerciseId);
export const selectLastUsedEquipment = (state: RootState, exerciseId: string) =>
    state.exercise.lastUsedEquipment[exerciseId];
export const selectExerciseVariations = (state: RootState, exerciseId: string) =>
    state.exercise.exerciseVariations[exerciseId] ?? [];

export default exerciseSlice.reducer; 