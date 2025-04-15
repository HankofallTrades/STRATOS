import { EquipmentType } from "./enums";

export interface Exercise {
  id: string;
  name: string;
  oneRepMax?: number;
  equipmentType?: EquipmentType;
  variations?: string[];
}

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  exerciseId: string;
  completed: boolean;
  equipmentType?: EquipmentType;
  variation?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  date: Date;
  duration: number; // in seconds
  exercises: WorkoutExercise[];
  completed: boolean;
}

export interface WorkoutHistory {
  workouts: Workout[];
}

export interface WeightSuggestion {
  percentage: number;
  weight: number;
}
