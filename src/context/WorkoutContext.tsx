
import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { 
  Exercise, 
  Workout, 
  WorkoutExercise, 
  ExerciseSet, 
  WeightSuggestion 
} from "@/types/workout";

interface WorkoutContextType {
  // Exercises
  exercises: Exercise[];
  addExercise: (name: string) => void;
  getExercise: (id: string) => Exercise | undefined;
  updateOneRepMax: (exerciseId: string, weight: number, reps: number) => void;
  
  // Current workout
  currentWorkout: Workout | null;
  startWorkout: () => void;
  endWorkout: () => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  
  // Sets management
  addSetToExercise: (workoutExerciseId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, weight: number, reps: number) => void;
  completeSet: (workoutExerciseId: string, setId: string, completed: boolean) => void;
  
  // History
  workoutHistory: Workout[];
  
  // Utilities
  calculateOneRepMax: (weight: number, reps: number) => number;
  getWeightSuggestions: (exerciseId: string) => WeightSuggestion[];
  getLastPerformance: (exerciseId: string) => { weight: number; reps: number } | null;
  
  // Workout timer
  workoutTime: number;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Default exercises
const defaultExercises: Exercise[] = [
  { id: uuidv4(), name: "Bench Press" },
  { id: uuidv4(), name: "Squat" },
  { id: uuidv4(), name: "Deadlift" },
  { id: uuidv4(), name: "Overhead Press" },
  { id: uuidv4(), name: "Barbell Row" },
  { id: uuidv4(), name: "Pull-up" },
  { id: uuidv4(), name: "Dumbbell Curl" },
  { id: uuidv4(), name: "Tricep Extension" },
  { id: uuidv4(), name: "Lateral Raise" },
  { id: uuidv4(), name: "Leg Press" },
];

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage keys
  const EXERCISES_STORAGE_KEY = "liftSmart_exercises";
  const WORKOUT_HISTORY_STORAGE_KEY = "liftSmart_workoutHistory";
  
  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [workoutTime, setWorkoutTime] = useState<number>(0);
  
  // Timer interval
  const [timerInterval, setTimerInterval] = useState<number | null>(null);
  
  // Initialize from local storage
  useEffect(() => {
    const storedExercises = localStorage.getItem(EXERCISES_STORAGE_KEY);
    if (storedExercises) {
      setExercises(JSON.parse(storedExercises));
    } else {
      setExercises(defaultExercises);
    }
    
    const storedHistory = localStorage.getItem(WORKOUT_HISTORY_STORAGE_KEY);
    if (storedHistory) {
      setWorkoutHistory(JSON.parse(storedHistory));
    }
  }, []);
  
  // Save to local storage when state changes
  useEffect(() => {
    if (exercises.length) {
      localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exercises));
    }
  }, [exercises]);
  
  useEffect(() => {
    if (workoutHistory.length) {
      localStorage.setItem(WORKOUT_HISTORY_STORAGE_KEY, JSON.stringify(workoutHistory));
    }
  }, [workoutHistory]);
  
  // Timer effect
  useEffect(() => {
    if (currentWorkout && !currentWorkout.completed) {
      const interval = window.setInterval(() => {
        setWorkoutTime((prev) => prev + 1);
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => {
        clearInterval(interval);
      };
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [currentWorkout]);
  
  // Calculate one rep max using Brzycki formula
  const calculateOneRepMax = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    return weight * (36 / (37 - reps));
  };
  
  // Add a new exercise
  const addExercise = (name: string) => {
    const newExercise: Exercise = {
      id: uuidv4(),
      name,
    };
    setExercises((prev) => [...prev, newExercise]);
  };
  
  // Get a specific exercise
  const getExercise = (id: string): Exercise | undefined => {
    return exercises.find((ex) => ex.id === id);
  };
  
  // Update one rep max for an exercise
  const updateOneRepMax = (exerciseId: string, weight: number, reps: number) => {
    const oneRepMax = calculateOneRepMax(weight, reps);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, oneRepMax: oneRepMax > (ex.oneRepMax || 0) ? oneRepMax : ex.oneRepMax }
          : ex
      )
    );
  };
  
  // Start a new workout
  const startWorkout = () => {
    const newWorkout: Workout = {
      id: uuidv4(),
      date: new Date(),
      duration: 0,
      exercises: [],
      completed: false,
    };
    setCurrentWorkout(newWorkout);
    setWorkoutTime(0);
  };
  
  // End the current workout
  const endWorkout = () => {
    if (currentWorkout) {
      const completedWorkout: Workout = {
        ...currentWorkout,
        completed: true,
        duration: workoutTime,
      };
      
      setWorkoutHistory((prev) => [...prev, completedWorkout]);
      setCurrentWorkout(null);
      setWorkoutTime(0);
    }
  };
  
  // Add an exercise to the current workout
  const addExerciseToWorkout = (exerciseId: string) => {
    if (!currentWorkout) return;
    
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    
    const newWorkoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseId,
      exercise,
      sets: [],
    };
    
    // Add a first empty set automatically
    const newSet: ExerciseSet = {
      id: uuidv4(),
      weight: 0,
      reps: 0,
      exerciseId,
      completed: false,
    };
    
    newWorkoutExercise.sets = [newSet];
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: [...prev.exercises, newWorkoutExercise],
      };
    });
  };
  
  // Add a set to an exercise in the current workout
  const addSetToExercise = (workoutExerciseId: string) => {
    if (!currentWorkout) return;
    
    const workoutExercise = currentWorkout.exercises.find(
      (ex) => ex.id === workoutExerciseId
    );
    if (!workoutExercise) return;
    
    const newSet: ExerciseSet = {
      id: uuidv4(),
      weight: workoutExercise.sets.length > 0 ? workoutExercise.sets[workoutExercise.sets.length - 1].weight : 0,
      reps: 0,
      exerciseId: workoutExercise.exerciseId,
      completed: false,
    };
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId
            ? { ...ex, sets: [...ex.sets, newSet] }
            : ex
        ),
      };
    });
  };
  
  // Update a set in the current workout
  const updateSet = (workoutExerciseId: string, setId: string, weight: number, reps: number) => {
    if (!currentWorkout) return;
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                sets: ex.sets.map((set) =>
                  set.id === setId ? { ...set, weight, reps } : set
                ),
              }
            : ex
        ),
      };
    });
  };
  
  // Mark a set as completed
  const completeSet = (workoutExerciseId: string, setId: string, completed: boolean) => {
    if (!currentWorkout) return;
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.id === workoutExerciseId) {
          const updatedSets = ex.sets.map((set) => {
            if (set.id === setId) {
              // If completing a set, update one rep max
              if (completed && set.weight > 0 && set.reps > 0) {
                updateOneRepMax(ex.exerciseId, set.weight, set.reps);
              }
              return { ...set, completed };
            }
            return set;
          });
          
          return { ...ex, sets: updatedSets };
        }
        return ex;
      });
      
      return { ...prev, exercises: updatedExercises };
    });
  };
  
  // Get weight suggestions based on one rep max
  const getWeightSuggestions = (exerciseId: string): WeightSuggestion[] => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise || !exercise.oneRepMax) return [];
    
    const percentages = [30, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100];
    
    return percentages.map((percentage) => ({
      percentage,
      weight: Math.round((exercise.oneRepMax! * percentage) / 100),
    }));
  };
  
  // Get the last performance (weight and reps) for an exercise
  const getLastPerformance = (exerciseId: string): { weight: number; reps: number } | null => {
    // Look at workout history in reverse chronological order
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
      const workout = workoutHistory[i];
      
      for (const workoutExercise of workout.exercises) {
        if (workoutExercise.exerciseId === exerciseId) {
          // Find the set with the highest weight
          let maxWeightSet: ExerciseSet | null = null;
          
          for (const set of workoutExercise.sets) {
            if (set.completed && (!maxWeightSet || set.weight > maxWeightSet.weight)) {
              maxWeightSet = set;
            }
          }
          
          if (maxWeightSet) {
            return {
              weight: maxWeightSet.weight,
              reps: maxWeightSet.reps,
            };
          }
        }
      }
    }
    
    return null;
  };
  
  const value = {
    exercises,
    addExercise,
    getExercise,
    updateOneRepMax,
    currentWorkout,
    startWorkout,
    endWorkout,
    addExerciseToWorkout,
    addSetToExercise,
    updateSet,
    completeSet,
    workoutHistory,
    calculateOneRepMax,
    getWeightSuggestions,
    getLastPerformance,
    workoutTime,
  };
  
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
};

export const useWorkout = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
};
