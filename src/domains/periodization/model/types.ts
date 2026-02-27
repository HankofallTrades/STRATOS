import type { Exercise, SessionFocus } from '@/lib/types/workout';

export type MesocycleProtocol = 'occams' | 'custom';
export type MesocycleStatus = 'active' | 'completed' | 'cancelled';
export type MesocycleGoalFocus = SessionFocus;

export interface Mesocycle {
  id: string;
  user_id: string;
  name: string;
  goal_focus: MesocycleGoalFocus;
  protocol: MesocycleProtocol;
  start_date: string;
  duration_weeks: number;
  status: MesocycleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MesocycleSession {
  id: string;
  mesocycle_id: string;
  name: string;
  session_order: number;
  session_focus: SessionFocus | null;
  sets_per_exercise: number | null;
  rep_range: string | null;
  progression_rule: string | null;
  created_at: string;
}

export interface MesocycleSessionExercise {
  id: string;
  mesocycle_session_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number | null;
  target_reps: string | null;
  load_increment_kg: number | null;
  notes: string | null;
  created_at: string;
}

export interface MesocycleSessionExerciseWithExercise extends MesocycleSessionExercise {
  exercise: Exercise | null;
}

export interface MesocycleSessionTemplate extends MesocycleSession {
  exercises: MesocycleSessionExerciseWithExercise[];
}

export interface ActiveMesocycleProgram {
  mesocycle: Mesocycle;
  sessions: MesocycleSessionTemplate[];
  current_week: number;
  last_completed_session_id: string | null;
  next_session_id: string | null;
  next_session_name: string | null;
}

export interface CreateMesocycleInput {
  name: string;
  goal_focus: MesocycleGoalFocus;
  protocol: MesocycleProtocol;
  start_date: string;
  duration_weeks: number;
  notes?: string;
}

export interface CreateCustomMesocycleSessionInput {
  mesocycle_id: string;
  name: string;
  session_focus?: SessionFocus | null;
}
