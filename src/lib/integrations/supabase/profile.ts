import { supabase } from './client';
import type { Database } from './types';

// Define the type for the data that can be updated in the 'profiles' table
// This uses the generated types to ensure correctness
type ProfileUpdateData = Database['public']['Tables']['profiles']['Update'];

/**
 * Updates a user's profile data in the Supabase 'profiles' table.
 *
 * @param userId The ID of the user whose profile needs updating.
 * @param profileData An object containing the profile fields to update.
 *                    Should match the structure defined by ProfileUpdateData.
 * @returns The updated profile data if successful.
 * @throws An error if the update fails.
 */
export const updateUserProfile = async (
  userId: string,
  profileData: ProfileUpdateData
): Promise<Database['public']['Tables']['profiles']['Row'] | null> => {
  if (!userId) {
    console.error('updateUserProfile called without userId.');
    throw new Error('User ID is required to update profile.');
  }

  console.log(`Updating profile for user: ${userId}`, profileData);

  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select() // Select the updated row data
    .single(); // Expect only one row to be updated and returned

  if (error) {
    console.error('Error updating user profile:', error);
    // Consider more specific error handling based on Supabase error codes if needed
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  if (!data) {
     console.warn(`Profile update for user ${userId} did not return data, though no error was thrown.`);
     // This might happen if RLS prevents seeing the updated row, or another issue.
     // Depending on requirements, you might throw an error here too.
     return null;
  }


  console.log(`Profile updated successfully for user: ${userId}`);
  return data;
}; 