import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

// Import slice reducers here
import workoutReducer from './workout/workoutSlice';
import exerciseReducer from './exercise/exerciseSlice';
import historyReducer from './history/historySlice';

// Placeholder reducers until slices are created
// const workoutReducer = (state = { currentWorkout: null, workoutTime: 0 }, action: any) => state;
// const exerciseReducer = (state = { exercises: [], lastUsedEquipment: {}, exerciseVariations: {} }, action: any) => state;
// const historyReducer = (state = { workoutHistory: [] }, action: any) => state;


const exercisePersistConfig = {
  key: 'exercise',
  storage,
  whitelist: ['exercises', 'lastUsedEquipment', 'exerciseVariations'], // Persist these fields
};

const historyPersistConfig = {
  key: 'history',
  storage,
  whitelist: ['workoutHistory'], // Persist workout history
};

const rootReducer = combineReducers({
  workout: workoutReducer, // Workout state is not persisted by default
  exercise: persistReducer(exercisePersistConfig, exerciseReducer),
  history: persistReducer(historyPersistConfig, historyReducer),
});

const persistedReducer = rootReducer; // Using rootReducer directly as persistence is handled per-slice

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], // Ignore redux-persist actions
      },
    }),
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 