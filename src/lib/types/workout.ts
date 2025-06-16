/**
 * Represents the core definition of an exercise, mirroring the Supabase 'exercises' table.
 */
export interface Exercise {
  id: string;
  name: string;
  exercise_type?: 'strength' | 'cardio'; // Added: Exercise type for cardio support
  archetype_id?: string | null; // Added for movement archetype support
  // oneRepMax?: number; // Removed - Likely stored in user_exercise_stats
  default_equipment_type?: string | null; // Renamed from equipmentType, matching DB
  created_by_user_id?: string | null; // Add the creator user ID field
  // variations?: string[]; // Removed - Likely stored in exercise_variations
  muscle_groups?: string[]; // Added: Array of muscle group names targeted
  is_static?: boolean | null; // Added is_static
}

/**
 * Specific training focus types for workouts
 */
export type SessionFocus = 
  | 'strength'      // Heavy lifting, low reps, high weight
  | 'hypertrophy'   // Muscle building, moderate reps/weight
  | 'zone2'         // Aerobic base building, low-moderate intensity cardio
  | 'zone5'         // High intensity cardio, anaerobic/VO2 max work
  | 'speed'         // Power and speed development
  | 'recovery'      // Active recovery, mobility, light movement
  | 'mixed';        // Combination of focuses

/**
 * Cardio-specific exercise extending base Exercise interface
 */
export interface CardioExercise extends Exercise {
  exercise_type: 'cardio';
  default_duration_minutes?: number;
  tracks_distance: boolean;
  tracks_heart_rate: boolean;
  primary_focus?: SessionFocus; // What training focus this exercise primarily supports
}

/**
 * Strength-specific set data structure (existing)
 */
export interface StrengthSet {
  id: string;
  weight: number;
  reps: number | null; // Made reps nullable
  time_seconds?: number | null; // Added time_seconds
  exerciseId: string; // Links to Exercise.id
  completed: boolean;
  equipmentType?: string; // Changed to string
  variation?: string; // Variation used for *this specific set*
}

/**
 * Cardio-specific set data structure
 */
export interface CardioSet {
  id: string;
  exerciseId: string;
  duration_seconds: number;
  distance_km?: number;
  pace_min_per_km?: number;
  heart_rate_bpm?: number[]; // Array for heart rate zones/readings
  target_heart_rate_zone?: 1 | 2 | 3 | 4 | 5; // Heart rate training zones
  perceived_exertion?: number; // RPE scale 1-10
  calories_burned?: number;
  completed: boolean;
}

/**
 * Union type for exercise sets - supports both strength and cardio
 */
export type ExerciseSet = StrengthSet | CardioSet;

/**
 * Type guard to check if set is a strength set
 */
export function isStrengthSet(set: ExerciseSet): set is StrengthSet {
  return 'weight' in set && 'reps' in set;
}

/**
 * Type guard to check if set is a cardio set
 */
export function isCardioSet(set: ExerciseSet): set is CardioSet {
  return 'duration_seconds' in set && !('weight' in set);
}

/**
 * Type guard to check if exercise is a cardio exercise
 */
export function isCardioExercise(exercise: Exercise): exercise is CardioExercise {
  return exercise.exercise_type === 'cardio';
}

/**
 * Helper function to get recommended rep ranges for different focuses
 */
export function getRecommendedRepRange(focus: SessionFocus): { min: number; max: number } | null {
  switch (focus) {
    case 'strength':
      return { min: 1, max: 5 };
    case 'hypertrophy':
      return { min: 6, max: 12 };
    case 'speed':
      return { min: 1, max: 3 };
    default:
      return null; // Cardio focuses don't use rep ranges
  }
}

/**
 * Helper function to get target heart rate zones for cardio focuses
 */
export function getTargetHeartRateZone(focus: SessionFocus): number | null {
  switch (focus) {
    case 'zone2':
      return 2;
    case 'zone5':
      return 5;
    case 'recovery':
      return 1;
    default:
      return null;
  }
}

/**
 * Represents an exercise instance within a specific workout.
 */
export interface WorkoutExercise {
  id: string; // Unique ID for this instance in the workout
  workoutId?: string; // Foreign key to the workout this instance belongs to
  exerciseId: string; // Foreign key to the main Exercise definition
  exercise: Exercise; // Embed the core exercise details (using updated Exercise type)
  equipmentType?: string; // Changed to string
  variation?: string; // Variation used for *this workout instance*
  sets: ExerciseSet[];
}

export interface Workout {
  id: string;
  date: string; // Store date as ISO string
  duration: number; // in seconds
  exercises: WorkoutExercise[];
  completed: boolean;
  workout_type?: 'strength' | 'cardio' | 'mixed'; // Auto-determined based on exercises
  session_focus?: SessionFocus; // User-selected training focus
  notes?: string; // Workout notes
}

export interface WorkoutHistory {
  workouts: Workout[];
}

export interface WeightSuggestion {
  percentage: number;
  weight: number;
}
