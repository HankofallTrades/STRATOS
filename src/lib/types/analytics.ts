export interface DailyMaxE1RM {
  workout_date: string; // Keep as string for consistency with previous date handling
  variation: string;
  equipment_type: string;
  max_e1rm: number;
} 