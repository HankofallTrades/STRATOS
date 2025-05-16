import { supabase } from './client'; // Assuming supabase client is exported from here
import type { Database } from '@/lib/types/supabase'; // Import generated types

// Explicitly type a row from the profiles table if needed for clarity, or use Tables<'profiles'>
// type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface DailyProteinIntake {
  total_protein: number;
}

export interface UserWeight {
  weight_kg: number | null;
}

/**
 * Adds a protein intake entry for a user.
 * @param userId The ID of the user.
 * @param amountGrams The amount of protein in grams.
 * @param entryDate The date of the intake (YYYY-MM-DD).
 */
export const addProteinIntake = async (
  userId: string, 
  amountGrams: number, 
  entryDate: string
): Promise<void> => {
  const { error } = await supabase
    .from('protein_intake')
    .insert([
      { user_id: userId, amount_grams: amountGrams, date: entryDate },
    ]);

  if (error) {
    console.error('Error adding protein intake:', error);
    throw error;
  }
};

/**
 * Gets the total daily protein intake for a user on a specific date.
 * @param userId The ID of the user.
 * @param queryDate The date to query (YYYY-MM-DD).
 * @returns An object containing the total protein or 0 if none.
 */
export const getDailyProteinIntake = async (
  userId: string, 
  queryDate: string
): Promise<DailyProteinIntake> => {
  const { data, error } = await supabase
    .from('protein_intake')
    .select('amount_grams')
    .eq('user_id', userId)
    .eq('date', queryDate);

  if (error) {
    console.error('Error getting daily protein intake:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return { total_protein: 0 };
  }

  const totalProtein = data.reduce((sum, entry) => sum + (entry.amount_grams || 0), 0);
  return { total_protein: totalProtein };
};

/**
 * Gets the user's weight from the profiles table.
 * @param userId The ID of the user.
 * @returns An object containing the user's weight (as weight_kg) or null if not set.
 */
export const getUserWeight = async (userId: string): Promise<UserWeight | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('weight')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting user weight from profiles:', error);
    throw error;
  }
  return data ? { weight_kg: data.weight } : { weight_kg: null };
};

/**
 * Updates or inserts the user's weight in the profiles table.
 * @param userId The ID of the user.
 * @param weightKg The user's weight in kilograms.
 */
export const updateUserWeight = async (userId: string, weightKg: number): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ weight: weightKg, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user weight in profiles:', error);
    throw error;
  }
}; 