import { EquipmentType } from "./enums";

/**
 * Represents the core definition of an exercise, mirroring the Supabase 'exercises' table.
 */
export interface Exercise {
  id: string;
  name: string;
  // oneRepMax?: number; // Removed - Likely stored in user_exercise_stats
  default_equipment_type?: string | null; // Renamed from equipmentType, matching DB
  created_by_user_id?: string | null; // Add the creator user ID field
  // variations?: string[]; // Removed - Likely stored in exercise_variations
}

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  exerciseId: string; // Links to Exercise.id
  completed: boolean;
  equipmentType?: EquipmentType; // Equipment used for *this specific set*
  variation?: string; // Variation used for *this specific set*
}

/**
 * Represents an exercise instance within a specific workout.
 */
export interface WorkoutExercise {
  id: string; // Unique ID for this instance in the workout
  workoutId?: string; // Foreign key to the workout this instance belongs to
  exerciseId: string; // Foreign key to the main Exercise definition
  exercise: Exercise; // Embed the core exercise details (using updated Exercise type)
  equipmentType?: EquipmentType; // Equipment used for *this workout instance*
  variation?: string; // Variation used for *this workout instance*
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  date: string; // Store date as ISO string
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
