import { supabase } from './client';
import { EquipmentType } from '@/lib/types/enums';
import { DailyMaxE1RM } from '@/lib/types/analytics';

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
  equipmentType: EquipmentType | undefined | null,
  variation: string | undefined | null
): Promise<{ weight: number; reps: number; set_number: number }[] | null> => {
  const targetVariation = variation || 'Standard';
  const targetEquipmentType = equipmentType ?? null; // Handle null equipment type explicitly

  try {
    // Step 1: Find the most recent workout_id containing the exercise for the user
    // We only need the workout_id, and we look for any completed set of the exercise
    const { data: lastWorkoutIdData, error: lastWorkoutIdError } = await supabase
      .from('workouts')
      .select('id, date, workout_exercises!inner(exercise_id, exercise_sets!inner(completed))')
      .eq('user_id', userId)
      .eq('workout_exercises.exercise_id', exerciseId)
      .eq('workout_exercises.exercise_sets.completed', true) // Ensure at least one completed set exists for the exercise in the workout
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastWorkoutIdError) throw lastWorkoutIdError;
    if (!lastWorkoutIdData) return null; // No previous workout found for this user/exercise

    const lastWorkoutId = lastWorkoutIdData.id;

    // Step 2: Fetch all completed sets from that specific workout_id matching all criteria
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
    if (!historicalSetsData || historicalSetsData.length === 0) return null; // No sets matching criteria in that specific workout

    // Filter again in code just to be certain, especially for the 'Standard' variation case
     const matchingSets = historicalSetsData.filter(set => {
        const setVariation = set.variation || 'Standard';
        // Important: Check against targetEquipmentType which handles null correctly
        const equipmentMatch = set.equipment_type === targetEquipmentType;
        const variationMatch = setVariation === targetVariation;
        return equipmentMatch && variationMatch; // No need to check completed again, query did that
    });

    // Format the final result
    const formattedSets = matchingSets.map(set => ({
      weight: set.weight,
      reps: set.reps,
      set_number: set.set_number,
    }));
    // No need to sort again, query did that

    return formattedSets.length > 0 ? formattedSets : null;

  } catch (error) {
    console.error("Error fetching last workout exercise instance (revised):", error);
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