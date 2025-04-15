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
  const { data, error } = await supabase
    .from('exercises')
    .insert(exerciseData) // Pass the provided data
    .select()
    .single(); // Expecting a single record back

  if (error) {
    console.error('Error creating exercise:', error);
    throw new Error(`Failed to create exercise: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create exercise: No data returned.');
  }

  console.log("Exercise created successfully:", data.id);
  return data;
}; 