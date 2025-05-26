import { supabase } from './client';

interface SunExposureLog {
  id?: number;
  user_id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  created_at?: string;
}

/**
 * Adds a sun exposure log for a user.
 */
export const addSunExposure = async (userId: string, hours: number, date: string): Promise<SunExposureLog> => {
  if (!userId) throw new Error('User ID is required to log sun exposure.');
  if (hours <= 0) throw new Error('Sun exposure hours must be positive.');
  if (!date) throw new Error('Date is required to log sun exposure.');

  const { data, error } = await supabase
    .from('sun_exposure_log')
    .insert([{ user_id: userId, hours, date }])
    .select()
    .single();

  if (error) {
    console.error('Error logging sun exposure:', error);
    throw error;
  }
  return data as SunExposureLog;
};

/**
 * Retrieves the total sun exposure hours for a user on a specific date.
 */
export const getDailySunExposure = async (userId: string, date: string): Promise<{ total_hours: number }> => {
  if (!userId || !date) {
    throw new Error('User ID and date are required to fetch daily sun exposure.');
  }

  const { data, error } = await supabase
    .from('sun_exposure_log')
    .select('hours')
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('Error fetching daily sun exposure:', error);
    throw error;
  }

  const totalHours = data?.reduce((sum, current) => sum + (current.hours || 0), 0) || 0;
  return { total_hours: totalHours };
}; 