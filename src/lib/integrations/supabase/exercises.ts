import { supabase } from './client';
import type { Database } from './types'; // Import generated Database type
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

// Define type aliases for easier use (assuming types generated from Supabase include the new columns)
type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
type UserHiddenExerciseInsert = Database['public']['Tables']['user_hidden_exercises']['Insert'];

/**
 * Fetches the list of exercises from the Supabase database,
 * excluding those hidden by the current user.
 */
export const fetchExercisesFromDB = async (): Promise<ExerciseRow[]> => {
  console.log("Fetching exercises from Supabase...");

  // Get current user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user session or no user logged in:', userError);
    // Handle appropriately - maybe return only non-user exercises or throw error
    // For now, let's fetch only predefined exercises if no user is found
     const { data: predefinedData, error: predefinedError } = await supabase
      .from('exercises')
      .select('*')
      .is('created_by_user_id', null)
      .order('order', { ascending: true })
      .order('name', { ascending: true });
      
     if (predefinedError) {
      console.error('Error fetching predefined exercises:', predefinedError);
      throw new Error(`Failed to fetch predefined exercises: ${predefinedError.message}`);
     }
     console.log(`Fetched ${predefinedData?.length ?? 0} predefined exercises (no user logged in).`);
     return predefinedData || [];
  }

  console.log(`Fetching exercises for user: ${user.id}`);

  // Fetch exercises, joining with user_hidden_exercises to filter out hidden ones
  const { data, error } = await supabase
    .from('exercises')
    // Select all columns from exercises, and user_id from the hidden table to check for matches
    .select('*, user_hidden_exercises(user_id)')
    // Left join: include all exercises, but only matching hidden entries for the current user
    .is('user_hidden_exercises.user_id', null) // Filter: Only include rows where the join condition didn't find a match (i.e., not hidden)
    // Original ordering
    .order('order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching exercises:', error);
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }

  console.log(`Fetched ${data?.length ?? 0} visible exercises for user ${user.id}.`);
  // The data structure might change slightly due to the join, ensure it matches ExerciseRow expectations.
  // Supabase typically nests the joined table result.
  // We might need to explicitly list columns if `select('*')` causes issues with the join.
  // Assuming the filter works, the returned `data` should conform to ExerciseRow[]
  return data || [];
};

/**
 * Creates a new custom exercise in the Supabase database for the current user.
 * @param exerciseData - The data for the new exercise (requires name).
 */
export const createExerciseInDB = async (
  exerciseData: Pick<ExerciseInsert, 'name' | 'default_equipment_type' | 'is_static' | 'archetype_id'>
): Promise<ExerciseRow> => {
  console.log(
    "Creating custom exercise in Supabase:", 
    exerciseData.name, 
    "Static:", exerciseData.is_static,
    "Archetype ID:", exerciseData.archetype_id
  );

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('User must be logged in to create a custom exercise:', userError);
    throw new Error('Authentication required to create exercises.');
  }

  // Prepare data including the user ID
  const insertPayload: ExerciseInsert = {
    name: exerciseData.name,
    default_equipment_type: exerciseData.default_equipment_type,
    is_static: exerciseData.is_static ?? false, // Provide a default if null/undefined
    archetype_id: exerciseData.archetype_id, // Add archetype_id
    created_by_user_id: user.id, // Set the creator
  };

  const { data: exerciseDataResult, error: exerciseError } = await supabase
    .from('exercises')
    .insert(insertPayload) // Insert data with user ID
    .select()
    .single();

  if (exerciseError) {
    console.error('Error creating exercise:', exerciseError);
    throw new Error(`Failed to create exercise: ${exerciseError.message}`);
  }

  if (!exerciseDataResult) {
    throw new Error('Failed to create exercise: No data returned.');
  }

  console.log("Custom exercise created successfully:", exerciseDataResult.id, "by user", user.id);

  // Add Standard Variation (remains the same)
  try {
    console.log(`Adding default 'Standard' variation for new exercise: ${exerciseDataResult.id}`);
    await addExerciseVariationToDB(exerciseDataResult.id, 'Standard');
    console.log(`'Standard' variation added for exercise: ${exerciseDataResult.id}`);
  } catch (variationError) {
    console.error(`Failed to add 'Standard' variation for exercise ${exerciseDataResult.id}:`, variationError);
    // Consider cleanup or alternative handling
  }

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

/**
 * Hides a predefined exercise for a specific user.
 * @param userId - The UUID of the user.
 * @param exerciseId - The UUID of the exercise to hide.
 */
export const hideExerciseForUser = async (userId: string, exerciseId: string): Promise<void> => {
  console.log(`Hiding exercise ${exerciseId} for user ${userId}`);

  // Generate a new UUID for the relationship table entry
  const newId = uuidv4(); 

  const insertData: UserHiddenExerciseInsert = {
    id: newId, // Add the generated ID
    user_id: userId,
    exercise_id: exerciseId,
  };

  console.log("Inserting into user_hidden_exercises:", insertData);

  const { error } = await supabase
    .from('user_hidden_exercises')
    .insert(insertData);

  if (error) {
    // Handle potential unique constraint violation (user already hid this exercise)
    if (error.code === '23505') { 
      console.warn(`User ${userId} has already hidden exercise ${exerciseId}. Ignoring.`);
      // Don't throw an error if it's already hidden
      return; 
    }
    console.error(`Error hiding exercise ${exerciseId} for user ${userId}:`, error);
    throw new Error(`Failed to hide exercise: ${error.message}`);
  }

  console.log(`Successfully hid exercise ${exerciseId} for user ${userId}`);
};

/**
 * Deletes an exercise and its associated variations from the Supabase database.
 * Note: This assumes cascade delete is set up for related tables (like exercise_variations)
 * or handles deletion manually if necessary.
 * @param exerciseId - The UUID of the exercise to delete.
 */
export const deleteExerciseFromDB = async (exerciseId: string): Promise<void> => {
  console.log(`Attempting to delete exercise: ${exerciseId}`);

  // Add deletion logic here. 
  // This currently assumes that deleting an exercise will cascade delete 
  // related entries (like variations, history, etc.) based on foreign key constraints 
  // set up in your Supabase schema.
  // If cascade delete is NOT configured, you'll need to manually delete
  // entries from related tables first (e.g., exercise_variations, workout_sets linked to this exercise).

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) {
    console.error(`Error deleting exercise ${exerciseId}:`, error);
    throw new Error(`Failed to delete exercise: ${error.message}`);
  }

  console.log(`Successfully deleted exercise: ${exerciseId}`);
};

// Define type for the mapping
export type ExerciseMuscleGroupMapping = Record<string, string[]>; // { exerciseId: muscleGroupName[] }

/**
 * HYPOTHETICAL FUNCTION: Fetches the mapping between exercises and their targeted muscle groups.
 * Assumes a backend implementation (e.g., Supabase RPC or view) exists.
 * @returns A promise resolving to an object mapping exercise IDs to arrays of muscle group names.
 */
export const fetchExerciseMuscleGroupMappings = async (): Promise<ExerciseMuscleGroupMapping> => {
  console.log("Fetching exercise-muscle group mappings from Supabase RPC...");

  // Call the Supabase RPC function
  // The function name needs to be cast to 'any' if the generated types
  // don't include it yet after adding the function in the Supabase dashboard.
  const { data, error } = await supabase.rpc('get_exercise_muscle_group_map' as any);

  if (error) {
    console.error('Error fetching muscle group mappings from RPC:', error);
    // Depending on how critical this is, you might want to return an empty object
    // or re-throw the error.
    throw new Error(`Failed to fetch muscle group mappings: ${error.message}`);
  }

  // Ensure the data received is treated as the correct type.
  // The RPC function returns a single JSON object which should match our type.
  // Add a null check for safety.
  if (!data) {
      console.warn("Received null data from get_exercise_muscle_group_map RPC.");
      return {}; // Return empty object if data is null
  }

  console.log(`Fetched mappings for ${Object.keys(data).length} exercises.`);
  // Cast the returned JSON data to our expected type.
  // Add runtime validation here if necessary for robustness.
  return data as ExerciseMuscleGroupMapping;

  // --- Placeholder Implementation Removed --- 
  /*
  console.warn("Using placeholder data for fetchExerciseMuscleGroupMappings. Implement backend call.");
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
  return {
    // Example mapping (use actual exercise IDs from your DB)
    'UUID-Squat': ['Quadriceps', 'Gluteals', 'Hamstrings'],
    'UUID-BenchPress': ['Chest', 'Shoulders', 'Triceps'],
    'UUID-Deadlift': ['Hamstrings', 'Gluteals', 'Back', 'Lower Back (Core)'],
    'UUID-Row': ['Back', 'Biceps'],
    'UUID-OverheadPress': ['Shoulders', 'Triceps'],
    'UUID-Pullup': ['Back', 'Biceps'],
    'UUID-LegPress': ['Quadriceps', 'Gluteals'],
    // ... add mappings for all relevant exercises
  };
  */
  // --- End Placeholder --- 
 }; 