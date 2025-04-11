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
  updateExerciseEquipment: (workoutExerciseId: string, equipmentType: 'DB' | 'BB' | 'KB' | 'Cable' | 'Free') => void;
  updateExerciseVariation: (workoutExerciseId: string, variation: string) => void;
  
  // Current workout
  currentWorkout: Workout | null;
  startWorkout: () => void;
  endWorkout: () => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  
  // Sets management
  addSetToExercise: (workoutExerciseId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, weight: number, reps: number) => void;
  completeSet: (workoutExerciseId: string, setId: string, completed: boolean) => void;
  deleteSet: (workoutExerciseId: string, setId: string) => void;
  
  // History
  workoutHistory: Workout[];
  
  // Utilities
  calculateOneRepMax: (weight: number, reps: number) => number;
  getWeightSuggestions: (exerciseId: string) => WeightSuggestion[];
  getLastPerformance: (exerciseId: string) => { weight: number; reps: number } | null;
  
  // Workout timer
  workoutTime: number;
  
  // New additions
  addExerciseVariation: (exerciseId: string, variation: string) => void;
  getExerciseVariations: (exerciseId: string) => string[];
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Default exercises with their default equipment types and variations
const defaultExercises: Exercise[] = [
  { 
    id: uuidv4(), 
    name: "Bench Press", 
    equipmentType: "BB",
    variations: ["Flat", "Incline", "Decline"]
  },
  { 
    id: uuidv4(), 
    name: "Squat", 
    equipmentType: "BB",
    variations: ["Back", "Front", "Overhead"]
  },
  { 
    id: uuidv4(), 
    name: "Deadlift", 
    equipmentType: "BB",
    variations: ["Conventional", "Sumo", "Romanian", "Single Leg"]
  },
  { 
    id: uuidv4(), 
    name: "Overhead Press", 
    equipmentType: "BB",
    variations: ["Standing", "Seated", "Push Press"]
  },
  { 
    id: uuidv4(), 
    name: "Barbell Row", 
    equipmentType: "BB",
    variations: ["Bent Over", "Pendlay", "Meadows"]
  },
  { 
    id: uuidv4(), 
    name: "Pull-up", 
    equipmentType: "Free",
    variations: ["Wide Grip", "Close Grip", "Chin-up"]
  },
  { 
    id: uuidv4(), 
    name: "Dumbbell Curl", 
    equipmentType: "DB",
    variations: ["Standing", "Seated", "Hammer", "Concentration"]
  },
  { 
    id: uuidv4(), 
    name: "Tricep Extension", 
    equipmentType: "Cable",
    variations: ["Rope", "Bar", "Single Arm"]
  },
  { 
    id: uuidv4(), 
    name: "Lateral Raise", 
    equipmentType: "DB",
    variations: ["Standing", "Seated", "Cable"]
  },
  { 
    id: uuidv4(), 
    name: "Leg Press", 
    equipmentType: "Free",
    variations: ["Standard", "Single Leg", "Narrow Stance"]
  },
];

// Track last used equipment type for each exercise
interface LastUsedEquipment {
  [exerciseId: string]: 'DB' | 'BB' | 'KB' | 'Cable' | 'Free';
}

// Track custom variations for each exercise
interface ExerciseVariations {
  [exerciseId: string]: string[];
}

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local storage keys
  const EXERCISES_STORAGE_KEY = "liftSmart_exercises";
  const WORKOUT_HISTORY_STORAGE_KEY = "liftSmart_workoutHistory";
  
  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [workoutTime, setWorkoutTime] = useState<number>(0);
  const [lastUsedEquipment, setLastUsedEquipment] = useState<LastUsedEquipment>({});
  const [exerciseVariations, setExerciseVariations] = useState<ExerciseVariations>({});
  
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
  
  // Load last used equipment from localStorage
  useEffect(() => {
    const storedLastUsedEquipment = localStorage.getItem("liftSmart_lastUsedEquipment");
    if (storedLastUsedEquipment) {
      setLastUsedEquipment(JSON.parse(storedLastUsedEquipment));
    }
  }, []);

  // Save last used equipment to localStorage
  useEffect(() => {
    localStorage.setItem("liftSmart_lastUsedEquipment", JSON.stringify(lastUsedEquipment));
  }, [lastUsedEquipment]);
  
  // Load custom variations from localStorage
  useEffect(() => {
    const storedVariations = localStorage.getItem("liftSmart_exerciseVariations");
    if (storedVariations) {
      setExerciseVariations(JSON.parse(storedVariations));
    }
  }, []);

  // Save custom variations to localStorage
  useEffect(() => {
    localStorage.setItem("liftSmart_exerciseVariations", JSON.stringify(exerciseVariations));
  }, [exerciseVariations]);
  
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
  
  // Update last used equipment when an exercise is completed
  const updateLastUsedEquipment = (exerciseId: string, equipmentType: 'DB' | 'BB' | 'KB' | 'Cable' | 'Free') => {
    setLastUsedEquipment(prev => ({
      ...prev,
      [exerciseId]: equipmentType
    }));
  };

  // Get the appropriate equipment type for an exercise
  const getEquipmentTypeForExercise = (exerciseId: string): 'DB' | 'BB' | 'KB' | 'Cable' | 'Free' => {
    // First check if there's a last used equipment type
    if (lastUsedEquipment[exerciseId]) {
      return lastUsedEquipment[exerciseId];
    }
    
    // If not, get the default from the exercise list
    const exercise = exercises.find(ex => ex.id === exerciseId);
    return exercise?.equipmentType || 'BB'; // Default to BB if nothing else is found
  };

  // Update the addExerciseToWorkout function to use the appropriate equipment type
  const addExerciseToWorkout = (exerciseId: string) => {
    if (!currentWorkout) return;
    
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    
    const equipmentType = getEquipmentTypeForExercise(exerciseId);
    
    const newWorkoutExercise: WorkoutExercise = {
      id: uuidv4(),
      exerciseId,
      exercise: {
        ...exercise,
        equipmentType,
      },
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
  
  // Delete a set from an exercise
  const deleteSet = (workoutExerciseId: string, setId: string) => {
    if (!currentWorkout) return;
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                sets: ex.sets.filter((set) => set.id !== setId),
              }
            : ex
        ),
      };
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
  
  // Update the updateExerciseEquipment function to track last used equipment
  const updateExerciseEquipment = (workoutExerciseId: string, equipmentType: 'DB' | 'BB' | 'KB' | 'Cable' | 'Free') => {
    if (!currentWorkout) return;
    
    const workoutExercise = currentWorkout.exercises.find(ex => ex.id === workoutExerciseId);
    if (!workoutExercise) return;
    
    // Update last used equipment
    updateLastUsedEquipment(workoutExercise.exerciseId, equipmentType);
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                exercise: {
                  ...ex.exercise,
                  equipmentType,
                },
              }
            : ex
        ),
      };
    });
  };

  // Update exercise variation
  const updateExerciseVariation = (workoutExerciseId: string, variation: string) => {
    if (!currentWorkout) return;
    
    if (variation === 'add_new') {
      // This will be handled by the UI component
      return;
    }
    
    setCurrentWorkout((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId
            ? {
                ...ex,
                exercise: {
                  ...ex.exercise,
                  variations: [variation],
                },
              }
            : ex
        ),
      };
    });
  };
  
  // Add a new variation to an exercise
  const addExerciseVariation = (exerciseId: string, variation: string) => {
    setExerciseVariations(prev => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] || []), variation]
    }));
  };

  // Get all variations for an exercise (default + custom)
  const getExerciseVariations = (exerciseId: string): string[] => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    const defaultVariations = exercise?.variations || [];
    const customVariations = exerciseVariations[exerciseId] || [];
    return [...new Set([...defaultVariations, ...customVariations])];
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
    deleteSet,
    workoutHistory,
    calculateOneRepMax,
    getWeightSuggestions,
    getLastPerformance,
    workoutTime,
    updateExerciseEquipment,
    updateExerciseVariation,
    addExerciseVariation,
    getExerciseVariations,
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
