import { supabase } from '@/lib/integrations/supabase/client';
import { DailyMaxE1RM, DailyVolumeData } from '@/lib/types/analytics';

// --- Types ---

export interface WeeklyArchetypeSetData {
    base_archetype_name: string;
    archetype_subtype_name: string | null;
    muscle_definition_name?: string;
    total_sets: number;
}

export interface RecentWorkoutSummary {
    workout_id: string;
    workout_created_at: string;
    duration_seconds: number | null;
    total_completed_sets: number;
    exercise_names: string[];
}

export interface LatestMaxE1RM {
    exercise_id: string;
    max_e1rm: number;
    equipment_type: string | null;
}

export interface LatestMaxReps {
    exercise_id: string;
    max_reps: number;
}

export interface WorkoutSet {
    set_number: number;
    reps: number | null;
    weight: number;
    time_seconds: number | null;
    completed: boolean;
}

export interface WorkoutExerciseDetail {
    exercise_id: string;
    exercise_name: string;
    order: number;
    sets: WorkoutSet[];
    completed_sets_count: number;
}

export interface DetailedWorkout {
    workout_id: string;
    workout_created_at: string;
    exercises: WorkoutExerciseDetail[];
}

export interface PerformanceStats {
    total_workouts: number;
    total_duration_seconds: number;
    most_common_exercise_id: string | null;
}

// --- Analytics Data ---

/**
 * Fetches the pre-calculated max e1RM history from Supabase RPC.
 */
export const fetchMaxE1RMHistory = async (userId: string, exerciseId: string): Promise<DailyMaxE1RM[]> => {
    const { data, error } = await supabase.rpc('get_exercise_max_e1rm_history', {
        p_user_id: userId,
        p_exercise_id: exerciseId,
    });

    if (error) {
        console.error('Error fetching max e1RM history:', error);
        throw error;
    }

    const results = (data as any[] | null) ?? [];
    return results.map((item: any) => ({
        workout_date: String(item.workout_date),
        variation: item.variation,
        equipment_type: item.equipment_type,
        max_e1rm: item.max_e1rm,
    })) as DailyMaxE1RM[];
};

/**
 * Fetches the calculated volume history from Supabase RPC.
 */
export const fetchExerciseVolumeHistory = async (userId: string, exerciseId: string): Promise<DailyVolumeData[]> => {
    const { data, error } = await supabase.rpc('fetch_exercise_volume_history' as any, {
        p_user_id: userId,
        p_exercise_id: exerciseId,
    });

    if (error) {
        console.error('Error fetching volume history:', error);
        throw error;
    }

    const results = (data as any[] | null) ?? [];
    return results.map((item: any) => ({
        workout_date: String(item.workout_date),
        variation: item.variation as string | null,
        equipment_type: item.equipment_type as string | null,
        total_sets: Number(item.total_sets),
        total_reps: Number(item.total_reps),
        total_volume: Number(item.total_volume),
    }));
};

/**
 * Fetches weekly archetype sets for volume tracker.
 */
export const fetchWeeklyArchetypeSets = async (userId: string, start: string, end: string): Promise<WeeklyArchetypeSetData[]> => {
    const { data, error } = await supabase.rpc('fetch_weekly_archetype_sets_v2' as any, {
        p_user_id: userId,
        p_start_date: start,
        p_end_date: end,
    });

    if (error) {
        console.error('Error fetching weekly archetype sets:', error);
        throw error;
    }

    return (data || []) as WeeklyArchetypeSetData[];
};

/**
 * Fetches summary of recent workouts.
 */
export const fetchRecentWorkoutsSummary = async (userId: string, limit: number = 5): Promise<RecentWorkoutSummary[]> => {
    const { data, error } = await supabase.rpc('get_recent_workouts_summary', {
        p_user_id: userId,
        p_limit: limit
    });

    if (error) {
        console.error("Error fetching recent workouts summary:", error);
        throw error;
    }

    const summaries = (data ?? []) as any[];
    return summaries.map((item: any) => ({
        workout_id: item?.workout_id ?? 'unknown-id',
        workout_created_at: item?.workout_created_at ? String(item.workout_created_at) : new Date().toISOString(),
        duration_seconds: item?.duration_seconds ?? 0,
        total_completed_sets: item?.total_completed_sets ?? 0,
        exercise_names: Array.isArray(item?.exercise_names) ? item.exercise_names.map(String) : []
    }));
};

// --- Benchmarks Data ---

/**
 * Fetches the latest calculated max e1RM for a list of specified exercises.
 */
export const fetchLatestMaxE1RMForExercises = async (userId: string, exerciseIds: string[]): Promise<LatestMaxE1RM[]> => {
    const { data, error } = await supabase.rpc('get_latest_max_e1rm_for_exercises', {
        p_user_id: userId,
        p_exercise_ids: exerciseIds,
    });

    if (error) {
        console.error('Error fetching latest max e1RM for exercises:', error);
        throw error;
    }

    const results = (data as any[] | null) ?? [];
    return results.map(item => ({
        exercise_id: String(item.exercise_id),
        max_e1rm: Number(item.max_e1rm),
        equipment_type: item.equipment_type as string | null
    }));
};

/**
 * Fetches the latest recorded max reps for a list of specified exercises.
 */
export const fetchLatestMaxRepsForExercises = async (userId: string, exerciseIds: string[]): Promise<LatestMaxReps[]> => {
    const { data, error } = await supabase.rpc('get_latest_max_reps_for_exercises' as any, {
        p_user_id: userId,
        p_exercise_ids: exerciseIds,
    });

    if (error) {
        console.error('Error fetching latest max reps for exercises:', error);
        throw error;
    }

    const results = (data as any[] | null) ?? [];
    return results.map(item => ({
        exercise_id: String(item.exercise_id),
        max_reps: Number(item.max_reps)
    }));
};

/**
 * Fetches detailed information for a specific workout.
 */
export const fetchDetailedWorkoutById = async (userId: string, workoutId: string): Promise<DetailedWorkout | null> => {
    const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('id, created_at, user_id')
        .eq('id', workoutId)
        .eq('user_id', userId)
        .single();

    if (workoutError || !workoutData) throw workoutError || new Error("Workout not found");

    const { data: workoutExercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
        exercise_id,
        order,
        exercises ( name ),
        exercise_sets ( set_number, reps, weight, time_seconds, completed )
      `)
        .eq('workout_id', workoutId)
        .order('order', { ascending: true })
        .order('set_number', { foreignTable: 'exercise_sets', ascending: true });

    if (exercisesError) throw exercisesError;

    const exercises: WorkoutExerciseDetail[] = (workoutExercisesData || []).map((we: any) => {
        const sets = (we.exercise_sets || []).map((s: any) => ({
            set_number: s.set_number,
            reps: s.reps,
            weight: s.weight,
            time_seconds: s.time_seconds,
            completed: s.completed,
        }));
        return {
            exercise_id: we.exercise_id,
            exercise_name: we.exercises?.name || 'Unknown Exercise',
            order: we.order,
            sets: sets,
            completed_sets_count: sets.filter((s: WorkoutSet) => s.completed).length,
        };
    });

    return {
        workout_id: workoutData.id,
        workout_created_at: workoutData.created_at as string,
        exercises: exercises,
    };
};

/**
 * Fetches general performance statistics for a user.
 */
export const fetchPerformanceStats = async (userId: string): Promise<PerformanceStats> => {
    const { data, error } = await supabase.rpc('get_user_performance_stats', {
        p_user_id: userId,
    });

    if (error) {
        console.error("Error fetching performance stats:", error);
        throw error;
    }

    const stats = Array.isArray(data) ? data[0] : data;
    return {
        total_workouts: stats?.total_workouts ?? 0,
        total_duration_seconds: stats?.total_duration_seconds ?? 0,
        most_common_exercise_id: stats?.most_common_exercise_id ?? null,
    };
};
