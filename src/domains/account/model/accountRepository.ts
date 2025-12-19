import { supabase } from '@/lib/integrations/supabase/client';
import type { Database } from '@/lib/integrations/supabase/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdateData = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetches a user's profile data from the Supabase 'profiles' table.
 */
export const fetchUserProfile = async (userId: string): Promise<ProfileRow | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Row not found
        console.error('Error fetching user profile:', error);
        throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return data;
};

/**
 * Updates a user's profile data in the Supabase 'profiles' table.
 */
export const updateUserProfile = async (
    userId: string,
    profileData: ProfileUpdateData
): Promise<ProfileRow | null> => {
    if (!userId) {
        throw new Error('User ID is required to update profile.');
    }

    const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
};
