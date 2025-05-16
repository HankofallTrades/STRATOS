import { supabase } from './client';
import type { Database } from '@/lib/types/supabase';

// Define an interface for the user profile data we need
export interface UserProfileData {
  weight_kg: number | null;
  focus: string | null;
}

/**
 * Fetches the user's profile data (weight and focus) from the 'profiles' table.
 * @param userId The ID of the user.
 * @returns An object containing weight_kg and focus, or null if profile not found/error.
 */
export const getUserProfile = async (userId: string): Promise<UserProfileData | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('weight, focus') // Select weight and focus columns
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    // Depending on how you want to handle errors, you might throw or return null
    // For now, returning null to let the UI decide how to present this state.
    return null;
  }

  if (!data) {
    return null; // Profile not found
  }

  // The 'weight' column from profiles is assumed to be in kg as per previous discussions.
  // If it were in a different unit, conversion would be needed here.
  return {
    weight_kg: data.weight,
    focus: data.focus,
  };
}; 