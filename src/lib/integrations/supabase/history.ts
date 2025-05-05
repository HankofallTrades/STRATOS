import { supabase } from './client';
import { DailyMaxE1RM } from '@/lib/types/analytics';

/**
 * Fetches the last used equipment type and variation for a specific exercise by a user.
 *
 * @param userId The UUID of the user.
 * @param exerciseId The UUID of the exercise.
 * @returns An object containing { equipmentType: EquipmentType | null, variation: string | null }, or null if no history found.
 */
export const fetchLastConfigForExercise = async (
  userId: string,
  exerciseId: string
): Promise<{ equipmentType: string | null; variation: string | null } | null> => {
  try {
    // Query the exercise_sets table, join up to workouts to filter by user and order by date
    const { data, error } = await supabase
      .from('exercise_sets')
      .select(
        'equipment_type, variation, workout_exercises!inner(exercise_id, workout_id, workouts!inner(user_id, created_at))'
      )
      .eq('workout_exercises.workouts.user_id', userId)
      .eq('workout_exercises.exercise_id', exerciseId)
      // Consider only sets that were part of a completed workout or maybe just any recorded set?
      // For now, let's order by the workout creation time to get the most recent session
      .order('created_at', {
        foreignTable: 'workout_exercises.workouts',
        ascending: false,
      })
      // Also order by set_number descending within that workout to get the last set's config?
      // Or maybe just the first set encountered from the latest workout is fine.
      // Let's stick to workout creation time for simplicity.
      .limit(1) // Get the most recent record
      .maybeSingle(); // Expect 0 or 1 result

    if (error) throw error;

    if (!data) {
      console.log(`No history found for exercise ${exerciseId} by user ${userId}`);
      return null;
    }

    // Return the equipment type and variation from the most recent set found
    return {
      equipmentType: data.equipment_type as string | null,
      variation: data.variation as string | null,
    };

  } catch (error) {
    console.error("Error fetching last exercise config:", error);
    return null; // Return null on error
  }
};

/**
 * Fetches the completed sets from the most recent workout instance
 * for a specific exercise, user, equipment type, and variation.
 *
 * @param userId The UUID of the user.
 * @param exerciseId The UUID of the exercise.
 * @param equipmentType The equipment type used (or null/undefined).
 * @param variation The exercise variation used (null/undefined treated as 'Standard').
 * @returns An array of { weight: number, reps: number, set_number: number } for completed sets, or null if no matching history found.
 */
export const fetchLastWorkoutExerciseInstanceFromDB = async (
  userId: string,
  exerciseId: string,
  equipmentType: string | undefined | null,
  variation: string | undefined | null
): Promise<{ weight: number; reps: number; set_number: number }[] | null> => {
  const targetVariation = variation || 'Standard';
  const targetEquipmentType = equipmentType ?? null;

  try {
    // Step 1: Find the most recent workout_id where the user completed sets
    // for this exercise WITH the specified equipment and variation.
    // Start from workouts and join down to apply filters and order easily.
    const { data: lastWorkoutData, error: lastWorkoutError } = await supabase
      .from('workouts')
      .select('id, created_at, workout_exercises!inner(exercise_id, exercise_sets!inner(completed, variation, equipment_type))') // Select id, date and join down
      .eq('user_id', userId) // Filter by user ID on workouts table
      .eq('workout_exercises.exercise_id', exerciseId) // Filter by exercise ID on joined table
      .eq('workout_exercises.exercise_sets.completed', true) // Filter by completed on doubly joined table
      // Filter by equipment type (handle null) on doubly joined table
      .filter('workout_exercises.exercise_sets.equipment_type', targetEquipmentType === null ? 'is' : 'eq', targetEquipmentType)
      // Filter by variation (handle 'Standard') on doubly joined table
      .filter(
        'workout_exercises.exercise_sets.variation',
        targetVariation === 'Standard' ? 'in' : 'eq',
        targetVariation === 'Standard' ? '("Standard", "", null)' : targetVariation
      )
      .order('created_at', { ascending: false }) // Order directly by workout creation time
      .limit(1) // Get the most recent one
      .maybeSingle(); // Expect 0 or 1 result

    if (lastWorkoutError) throw lastWorkoutError;
    // If no workout entry matches all criteria, return null
    if (!lastWorkoutData) { // Simpler check now
        console.log('No previous workout found matching all criteria (user, exercise, equipment, variation).');
        return null;
    }

    const lastWorkoutId = lastWorkoutData.id; // Simpler access
    console.log('Found last matching workout ID:', lastWorkoutId);

    // Step 2: Fetch all completed sets from that specific workout_id matching all criteria again (for safety)
    const { data: historicalSetsData, error: historicalSetsError } = await supabase
      .from('exercise_sets')
      .select('weight, reps, set_number, variation, equipment_type, workout_exercises!inner(exercise_id, workout_id)')
      .eq('workout_exercises.workout_id', lastWorkoutId) // Filter by the workout_id found in step 1
      .eq('workout_exercises.exercise_id', exerciseId) // Filter by exercise_id
      .eq('completed', true) // Only completed sets
      // Filter by equipment type (handle null)
      .filter('equipment_type', targetEquipmentType === null ? 'is' : 'eq', targetEquipmentType)
      // Filter by variation (handle 'Standard' meaning Standard, null, or empty)
      .filter(
        'variation',
        targetVariation === 'Standard' ? 'in' : 'eq',
        targetVariation === 'Standard' ? '("Standard", "", null)' : targetVariation
      )
      .order('set_number', { ascending: true }); // Order the results by set number

    if (historicalSetsError) throw historicalSetsError;
    if (!historicalSetsData || historicalSetsData.length === 0) {
        console.log('Found matching workout ID, but failed to fetch sets from it. This should not happen.');
        return null; // Should technically not happen if Step 1 succeeded, but good failsafe
    }

    // No need for the extra JS filter anymore, the DB queries are specific enough.

    // Format the final result
    const formattedSets = historicalSetsData.map(set => ({
      weight: set.weight,
      reps: set.reps,
      set_number: set.set_number,
    }));

    return formattedSets; // formattedSets cannot be empty if we reached here

  } catch (error) {
    console.error("Error fetching last workout exercise instance (revised logic):", error);
    return null;
  }
};

// Function to fetch the pre-calculated max e1RM history from Supabase RPC
export async function fetchMaxE1RMHistory(userId: string, exerciseId: string): Promise<DailyMaxE1RM[]> {
  // Basic validation
  if (!userId || !exerciseId) {
    console.warn("User ID or Exercise ID missing for fetchMaxE1RMHistory call");
    return []; // Return empty array if IDs are missing
  }

  // Call the Supabase RPC function (without generic type argument)
  const { data, error } = await supabase.rpc('get_exercise_max_e1rm_history', {
    p_user_id: userId,
    p_exercise_id: exerciseId,
  });

  // Handle potential errors during the RPC call
  if (error) {
    console.error('Error fetching max e1RM history from Supabase RPC:', error);
    throw new Error(`Supabase RPC Error: ${error.message}`);
  }

  // Explicitly cast the result to the expected array type after checking for null/undefined
  const results = (data as any[] | null) ?? [];

  // Map and ensure date is string
  const formattedData = results.map((item: any) => ({
    workout_date: String(item.workout_date), // Ensure date is string
    variation: item.variation,
    equipment_type: item.equipment_type,
    max_e1rm: item.max_e1rm,
  }));

  return formattedData as DailyMaxE1RM[]; // Final cast for return type safety
}

// Structure for the result of the new RPC function
export interface LatestMaxE1RM {
  exercise_id: string;
  max_e1rm: number;
  equipment_type: string | null;
}

/**
 * Fetches the latest calculated max e1RM for a list of specified exercises.
 * Assumes a Supabase RPC function 'get_latest_max_e1rm_for_exercises' exists.
 *
 * @param userId The UUID of the user.
 * @param exerciseIds An array of UUIDs for the exercises.
 * @returns A promise resolving to an array of { exercise_id: string, max_e1rm: number }.
 */
export async function fetchLatestMaxE1RMForExercises(
  userId: string,
  exerciseIds: string[]
): Promise<LatestMaxE1RM[]> {
  if (!userId || !exerciseIds || exerciseIds.length === 0) {
    console.warn("User ID or Exercise IDs missing/empty for fetchLatestMaxE1RMForExercises call");
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_latest_max_e1rm_for_exercises', {
      p_user_id: userId,
      p_exercise_ids: exerciseIds,
    });

    if (error) {
      console.error('Error fetching latest max e1RM from Supabase RPC:', error);
      throw new Error(`Supabase RPC Error: ${error.message}`);
    }

    // Ensure data is an array and conforms to the expected structure
    const results = (data as any[] | null) ?? [];
    const validatedData = results.map(item => ({
        exercise_id: String(item.exercise_id), // Ensure string
        max_e1rm: Number(item.max_e1rm), // Ensure number
        equipment_type: item.equipment_type as string | null // Map the new field
    })).filter(item => item.exercise_id && !isNaN(item.max_e1rm)); // Basic validation

    return validatedData as LatestMaxE1RM[];

  } catch (error) {
    console.error("Client-side error in fetchLatestMaxE1RMForExercises:", error);
    // Re-throw or return empty array depending on desired error handling
    // For now, let's return empty to avoid crashing the analytics page
    return []; 
  }
}

// Structure for the result of the max reps RPC function
export interface LatestMaxReps {
  exercise_id: string;
  max_reps: number;
}

/**
 * Fetches the latest recorded max reps for a list of specified exercises.
 * This is typically used for bodyweight or calisthenic exercises where weight is 0 or null.
 * Assumes a Supabase RPC function 'get_latest_max_reps_for_exercises' exists.
 *
 * @param userId The UUID of the user.
 * @param exerciseIds An array of UUIDs for the exercises.
 * @returns A promise resolving to an array of { exercise_id: string, max_reps: number }.
 */
export async function fetchLatestMaxRepsForExercises(
  userId: string,
  exerciseIds: string[]
): Promise<LatestMaxReps[]> {
  if (!userId || !exerciseIds || exerciseIds.length === 0) {
    console.warn("User ID or Exercise IDs missing/empty for fetchLatestMaxRepsForExercises call");
    return [];
  }

  try {
    // Note: The RPC function 'get_latest_max_reps_for_exercises' needs to be created in Supabase SQL.
    // Cast the function name to 'any' to bypass strict type checking if types are out of sync
    const { data, error } = await supabase.rpc('get_latest_max_reps_for_exercises' as any, {
      p_user_id: userId,
      p_exercise_ids: exerciseIds,
    });

    if (error) {
      console.error('Error fetching latest max reps from Supabase RPC:', error);
      // Consider more specific error handling or logging here
      throw new Error(`Supabase RPC Error: ${error.message}`);
    }

    // Ensure data is an array and conforms to the expected structure
    const results = (data as any[] | null) ?? [];
    const validatedData = results.map(item => ({
        exercise_id: String(item.exercise_id), // Ensure string
        max_reps: Number(item.max_reps) // Ensure number
    })).filter(item => item.exercise_id && !isNaN(item.max_reps) && item.max_reps >= 0); // Basic validation

    return validatedData as LatestMaxReps[];

  } catch (error) {
    console.error("Client-side error in fetchLatestMaxRepsForExercises:", error);
    // Return empty array to prevent crashing the UI component
    return []; 
  }
}

// Define expected structure for daily volume data from the backend
export interface DailyVolumeData {
    workout_date: string; // YYYY-MM-DD
    variation: string | null;
    equipment_type: string | null;
    total_sets: number;
    total_reps: number;
    total_volume: number; // Sum of (weight * reps) for the day/combo
}

// Function to fetch the calculated volume history from Supabase RPC
export async function fetchExerciseVolumeHistory(userId: string, exerciseId: string): Promise<DailyVolumeData[]> {
  // Basic validation
  if (!userId || !exerciseId) {
    console.warn("User ID or Exercise ID missing for fetchExerciseVolumeHistory call");
    return []; // Return empty array if IDs are missing
  }

  try {
    // Call the Supabase RPC function (assumed name)
    // Cast function name to 'any' to bypass strict type checking until types are updated
    const { data, error } = await supabase.rpc('fetch_exercise_volume_history' as any, { 
      p_user_id: userId,
      p_exercise_id: exerciseId,
    });

    // Handle potential errors during the RPC call
    if (error) {
      console.error('Error fetching volume history from Supabase RPC:', error);
      throw new Error(`Supabase RPC Error: ${error.message}`);
    }

    // Explicitly cast the result to the expected array type after checking for null/undefined
    const results = (data as any[] | null) ?? [];

    // Map and validate data types
    const formattedData = results.map((item: any) => ({
      workout_date: String(item.workout_date), // Ensure string
      variation: item.variation as string | null,
      equipment_type: item.equipment_type as string | null,
      total_sets: Number(item.total_sets),
      total_reps: Number(item.total_reps),
      total_volume: Number(item.total_volume),
    })).filter(item => 
      item.workout_date && 
      !isNaN(item.total_sets) && 
      !isNaN(item.total_reps) && 
      !isNaN(item.total_volume)
    );

    return formattedData as DailyVolumeData[]; // Final cast for return type safety
  } catch (error) {
    console.error("Client-side error in fetchExerciseVolumeHistory:", error);
    // Depending on needs, might re-throw or return empty array
    return []; 
  }
} 