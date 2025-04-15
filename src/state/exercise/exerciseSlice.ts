import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import type { Exercise } from '../../lib/types/workout'; // No longer needed here
import type { EquipmentType } from '../../lib/types/enums';
// import { v4 as uuidv4 } from 'uuid'; // No longer needed for adding exercises here
import type { RootState } from '../store';

interface ExerciseState {
  // exercises: Exercise[]; // Removed - Handled by TanStack Query
  lastUsedEquipment: { [exerciseId: string]: EquipmentType };
  exerciseVariations: { [exerciseId: string]: string[] };
}

const initialState: ExerciseState = {
  // exercises: [], // Removed
  lastUsedEquipment: {},
  exerciseVariations: {},
};

const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    // Removed addExercise, updateExercise, deleteExercise reducers

    // deleteExercise(state, action: PayloadAction<string>) { // Payload is exerciseId
    //   // state.exercises = state.exercises.filter(ex => ex.id !== action.payload); // Removed
    //   delete state.lastUsedEquipment[action.payload];
    //   delete state.exerciseVariations[action.payload];
    // },
    // Simplified delete action: If an exercise is deleted server-side,
    // we might want to clear related client-side state here.
    // Renaming to clarify purpose.
    clearExerciseClientState(state, action: PayloadAction<string>) { // Payload is exerciseId
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
      // Only add if variation doesn't exist for that exercise
      if (!state.exerciseVariations[exerciseId].includes(variation)) {
        state.exerciseVariations[exerciseId].push(variation);
      }
      // Removed logic trying to update exercise definition in state.exercises
    },
    // Maybe add deleteVariation?

    // Removed setExercises reducer
  },
});

export const {
    // addExercise, // Removed
    // updateExercise, // Removed
    // deleteExercise, // Removed (replaced conceptually by clearExerciseClientState)
    clearExerciseClientState,
    setLastUsedEquipment,
    addExerciseVariation,
    // setExercises, // Removed
} = exerciseSlice.actions;

// Selectors
// Removed selectAllExercises and selectExerciseById
// export const selectAllExercises = (state: RootState) => state.exercise.exercises;
// export const selectExerciseById = (state: RootState, exerciseId: string) =>
//     state.exercise.exercises.find(ex => ex.id === exerciseId);

// Keep selectors for remaining client-side state
export const selectLastUsedEquipment = (state: RootState, exerciseId: string) =>
    state.exercise.lastUsedEquipment[exerciseId];
export const selectExerciseVariations = (state: RootState, exerciseId: string) =>
    state.exercise.exerciseVariations[exerciseId] ?? [];

export default exerciseSlice.reducer; 