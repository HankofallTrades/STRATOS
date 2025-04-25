import { supabase } from './client';
import { EquipmentType } from '@/lib/types/enums';

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

  try {
    // Find the most recent workout_id that contains the exercise with matching completed sets
    const { data: workoutExerciseData, error: workoutExerciseError } = await supabase
      .from('workout_exercises')
      .select(`
        id,
        workout_id,
        workouts!inner ( date ),
        exercise_sets!inner ( * )
      `)
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId) // Ensure it belongs to the user
      .eq('exercise_sets.completed', true)
      // Handle equipment matching (null/undefined matches null/undefined)
      .filter('exercise_sets.equipment_type', equipmentType ? 'eq' : 'is', equipmentType ?? null)
       // Handle variation matching (treat null/undefined as 'Standard')
      .filter(
        'exercise_sets.variation', 
        targetVariation === 'Standard' ? 'in' : 'eq',
        targetVariation === 'Standard' ? '("Standard", "", null)' : targetVariation // Match 'Standard', empty string or NULL if target is Standard
      )
      .order('date', { foreignTable: 'workouts', ascending: false })
      .limit(1) // Limit to the most recent workout_exercise instance matching criteria
      .maybeSingle(); // Use maybeSingle as there might be no matching workout

    if (workoutExerciseError) throw workoutExerciseError;
    if (!workoutExerciseData) return null; // No matching workout exercise found

    // Now fetch all completed sets for *that specific* workout_exercise_id, matching the criteria again
    // This ensures we get all sets from that single instance, even if some didn't match the initial filter variation/equipment
    // (e.g., if the filter found the instance based on one set, but we want all completed sets from it)
    // EDIT: Actually, the previous query ALREADY filters the inner exercise_sets. So we just need to format the result.

    // Filter the returned sets again in code to be absolutely sure they match the exact criteria
    // because the DB filter for 'Standard' might be slightly broad ('in' ("Standard", "", null))
    const matchingSets = workoutExerciseData.exercise_sets.filter(set => {
        const setVariation = set.variation || 'Standard';
        const equipmentMatch = set.equipment_type === equipmentType;
        const variationMatch = setVariation === targetVariation;
        return set.completed && equipmentMatch && variationMatch;
    });

    if (matchingSets.length === 0) {
      // This might happen if the workout instance was found based on a set matching the `in` filter for Standard,
      // but not the *exact* equipment type match needed. 
      return null; 
    }

    // Format the result
    const formattedSets = matchingSets
      .map(set => ({
        weight: set.weight,
        reps: set.reps,
        set_number: set.set_number,
      }))
      .sort((a, b) => a.set_number - b.set_number); // Ensure sets are ordered by set_number

    return formattedSets.length > 0 ? formattedSets : null;

  } catch (error) {
    console.error("Error fetching last workout exercise instance:", error);
    return null;
  }
}; 