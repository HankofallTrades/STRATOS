import { supabase } from './client';
import type { Database } from './types'; // Import generated Database type

// Define type aliases for easier use
type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

/**
 * Fetches the list of exercises from the Supabase database.
 */
export const fetchExercisesFromDB = async (): Promise<ExerciseRow[]> => {
  console.log("Fetching exercises from Supabase..."); // Log start
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('order', { ascending: true }) // Optionally order exercises
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching exercises:', error);
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  console.log(`Fetched ${data?.length ?? 0} exercises.`); // Log success
  return data || [];
};

/**
 * Creates a new exercise in the Supabase database.
 * @param exerciseData - The data for the new exercise (requires name).
 */
export const createExerciseInDB = async (
  exerciseData: Pick<ExerciseInsert, 'name' | 'default_equipment_type'>
): Promise<ExerciseRow> => {
  console.log("Creating exercise in Supabase:", exerciseData.name);
  // We only pass name and default_equipment_type, assuming others like id, created_at, created_by_user_id are handled by DB/policies.
  const { data: exerciseDataResult, error: exerciseError } = await supabase
    .from('exercises')
    .insert(exerciseData) // Pass the provided data
    .select()
    .single(); // Expecting a single record back

  if (exerciseError) {
    console.error('Error creating exercise:', exerciseError);
    throw new Error(`Failed to create exercise: ${exerciseError.message}`);
  }

  if (!exerciseDataResult) {
    throw new Error('Failed to create exercise: No data returned.');
  }

  console.log("Exercise created successfully:", exerciseDataResult.id);

  // --- Add Standard Variation --- 
  try {
    console.log(`Adding default 'Standard' variation for new exercise: ${exerciseDataResult.id}`);
    await addExerciseVariationToDB(exerciseDataResult.id, 'Standard');
    console.log(`'Standard' variation added for exercise: ${exerciseDataResult.id}`);
  } catch (variationError) {
    // Log the error, but maybe don't fail the whole exercise creation?
    // Depending on requirements, you might want to re-throw or handle this differently.
    // For example, implement cleanup logic to delete the exercise if adding the variation fails.
    console.error(`Failed to add 'Standard' variation for exercise ${exerciseDataResult.id}:`, variationError);
    // Consider throwing a more specific error or returning a status indicating partial success.
  }
  // --- End Add Standard Variation ---

  return exerciseDataResult;
};

// Define type alias for exercise variations for easier use
type ExerciseVariationRow = Database['public']['Tables']['exercise_variations']['Row'];
type ExerciseVariationInsert = Database['public']['Tables']['exercise_variations']['Insert'];

/**
 * Adds a new variation for a specific exercise in the Supabase database.
 * @param exerciseId - The UUID of the exercise.
 * @param variationName - The name of the new variation.
 */
export const addExerciseVariationToDB = async (
  exerciseId: string,
  variationName: string
): Promise<ExerciseVariationRow> => {
  console.log(`Adding variation "${variationName}" to exercise ${exerciseId}`);
  const insertData: ExerciseVariationInsert = {
    exercise_id: exerciseId,
    variation_name: variationName,
  };

  const { data, error } = await supabase
    .from('exercise_variations')
    .insert(insertData)
    .select()
    .single(); // Expecting a single record back

  if (error) {
    // Handle potential duplicate variation error (e.g., unique constraint violation)
    if (error.code === '23505') { // PostgreSQL unique violation code
      console.warn(`Variation "${variationName}" already exists for exercise ${exerciseId}.`);
      // Optionally, fetch and return the existing variation instead of throwing
      // For now, we re-throw but a more user-friendly approach might be needed
    }
    console.error('Error adding exercise variation:', error);
    throw new Error(`Failed to add exercise variation: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to add exercise variation: No data returned.');
  }

  console.log('Exercise variation added successfully:', data.id);
  return data;
};

/**
 * Fetches exercise variations for a given exercise ID, ensuring 'Standard' is first.
 * @param exerciseId - The UUID of the exercise.
 */
export async function fetchExerciseVariationsFromDB(exerciseId: string): Promise<string[]> {
  console.log(`Fetching variations for exercise ${exerciseId}`);
  const { data, error } = await supabase
    .from('exercise_variations')
    .select('variation_name')
    .eq('exercise_id', exerciseId)
    // Optionally order non-standard variations alphabetically
    .order('variation_name', { ascending: true });

  if (error) {
    console.error('Error fetching exercise variations:', error);
    // Don't throw here, allow component to handle error state via useQuery
    // Return empty array or handle specific errors if needed
    throw new Error(`Failed to fetch variations: ${error.message}`);
  }

  let variationNames = data?.map(item => item.variation_name) || [];

  // Ensure 'Standard' is present and move it to the front
  const standardIndex = variationNames.indexOf('Standard');
  if (standardIndex > 0) {
    // If 'Standard' exists but not at the front, move it
    variationNames.splice(standardIndex, 1); // Remove from current position
    variationNames.unshift('Standard'); // Add to the beginning
  } else if (standardIndex === -1) {
    // If 'Standard' doesn't exist in the DB (shouldn't happen for new exercises due to createExerciseInDB),
    // prepend it to the list anyway to ensure it's always an option.
    // This also covers existing exercises before they are backfilled.
    variationNames.unshift('Standard');
  }
  // If standardIndex is 0, it's already at the front

  console.log(`Fetched ${variationNames.length} variations for ${exerciseId}, starting with Standard.`);
  return variationNames;
} 