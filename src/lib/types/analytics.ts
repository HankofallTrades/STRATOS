export interface DailyMaxE1RM {
  workout_date: string; // Keep as string for consistency with previous date handling
  variation: string;
  equipment_type: string;
  max_e1rm: number;
}

export interface DailyVolumeData {
  workout_date: string;
  variation: string | null;
  equipment_type: string | null;
  total_sets: number;
  total_reps: number;
  total_volume: number;
}