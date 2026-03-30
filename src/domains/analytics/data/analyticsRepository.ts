import { supabase } from '@/lib/integrations/supabase/client';
import { fetchExercises } from '@/domains/fitness/data/fitnessRepository';
import { DailyMaxE1RM, DailyVolumeData } from '@/lib/types/analytics';
import type { Exercise } from '@/lib/types/workout';

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

export interface CompletedWeightedSetForPr {
    weight: number | null;
    reps: number | null;
    workoutId: string;
    exerciseId: string;
    exerciseName: string;
    workoutCreatedAt: string;
}

type NestedRelationship<T> = T | T[] | null;

interface MaxE1RMHistoryRow {
    workout_date: string;
    variation: string | null;
    equipment_type: string | null;
    max_e1rm: number;
}

interface ExerciseVolumeHistoryRow {
    workout_date: string;
    variation: string | null;
    equipment_type: string | null;
    total_sets: number;
    total_reps: number;
    total_volume: number;
}

interface RecentWorkoutSummaryRow {
    workout_id: string | null;
    workout_created_at: string | null;
    duration_seconds: number | null;
    total_completed_sets: number | null;
    exercise_names: string[] | null;
}

interface LatestMaxE1RMRow {
    exercise_id: string;
    max_e1rm: number;
    equipment_type: string | null;
}

interface LatestMaxRepsRow {
    exercise_id: string;
    max_reps: number;
}

type DetailedWorkoutExerciseRow = {
    exercise_id: string;
    order: number;
    exercises: NestedRelationship<{ name: string | null }>;
    exercise_sets: WorkoutSet[] | null;
};

// --- Analytics Data ---

export const fetchAnalyticsExercises = async (): Promise<Exercise[]> => {
    return (await fetchExercises()) as Exercise[];
};

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

    const results = (data ?? []) as MaxE1RMHistoryRow[];
    return results.map(item => ({
        workout_date: String(item.workout_date),
        variation: item.variation,
        equipment_type: item.equipment_type,
        max_e1rm: item.max_e1rm,
    }));
};

/**
 * Fetches the calculated volume history from Supabase RPC.
 */
export const fetchExerciseVolumeHistory = async (userId: string, exerciseId: string): Promise<DailyVolumeData[]> => {
    const { data, error } = await supabase.rpc('fetch_exercise_volume_history' as never, {
        p_user_id: userId,
        p_exercise_id: exerciseId,
    });

    if (error) {
        console.error('Error fetching volume history:', error);
        throw error;
    }

    const results = (data ?? []) as ExerciseVolumeHistoryRow[];
    return results.map(item => ({
        workout_date: String(item.workout_date),
        variation: item.variation,
        equipment_type: item.equipment_type,
        total_sets: Number(item.total_sets),
        total_reps: Number(item.total_reps),
        total_volume: Number(item.total_volume),
    }));
};

/**
 * Fetches weekly archetype sets for volume tracker.
 */
export const fetchWeeklyArchetypeSets = async (userId: string, start: string, end: string): Promise<WeeklyArchetypeSetData[]> => {
    const { data, error } = await supabase.rpc('fetch_weekly_archetype_sets_v2' as never, {
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

    const summaries = (data ?? []) as RecentWorkoutSummaryRow[];
    return summaries.map(item => ({
        workout_id: item?.workout_id ?? 'unknown-id',
        workout_created_at: item?.workout_created_at ? String(item.workout_created_at) : new Date().toISOString(),
        duration_seconds: item?.duration_seconds ?? 0,
        total_completed_sets: item?.total_completed_sets ?? 0,
        exercise_names: Array.isArray(item?.exercise_names) ? item.exercise_names.map(String) : []
    }));
};

const firstOrSelf = <T,>(value: NestedRelationship<T>): T | null => {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
};

export const fetchCompletedWeightedSetsForPr = async (
    userId: string
): Promise<CompletedWeightedSetForPr[]> => {
    type WeightedSetRow = {
        weight: number | null;
        reps: number | null;
        workout_exercises: NestedRelationship<{
            workout_id: string;
            exercise_id: string;
            exercises: NestedRelationship<{ name: string }>;
            workouts: NestedRelationship<{ created_at: string }>;
        }>;
    };

    const setRows: CompletedWeightedSetForPr[] = [];
    const pageSize = 1000;
    let pageStart = 0;

    while (true) {
        const { data, error } = await supabase
            .from("exercise_sets")
            .select(`
                weight,
                reps,
                workout_exercises!inner(
                    workout_id,
                    exercise_id,
                    exercises!inner(name),
                    workouts!inner(created_at, user_id)
                )
            `)
            .eq("completed", true)
            .gt("weight", 0)
            .gt("reps", 0)
            .eq("workout_exercises.workouts.user_id", userId)
            .range(pageStart, pageStart + pageSize - 1);

        if (error) {
            console.error("Error fetching weighted sets for PR analysis:", error);
            throw error;
        }

        const page = (data ?? []) as WeightedSetRow[];
        setRows.push(
            ...page.flatMap(row => {
                const workoutExercise = firstOrSelf(row.workout_exercises);
                const workout = firstOrSelf(workoutExercise?.workouts ?? null);
                const exercise = firstOrSelf(workoutExercise?.exercises ?? null);

                if (!workoutExercise || !workout?.created_at || !exercise?.name) {
                    return [];
                }

                return [{
                    weight: row.weight,
                    reps: row.reps,
                    workoutId: workoutExercise.workout_id,
                    exerciseId: workoutExercise.exercise_id,
                    exerciseName: exercise.name,
                    workoutCreatedAt: workout.created_at,
                }];
            })
        );

        if (page.length < pageSize) break;
        pageStart += pageSize;
    }

    return setRows;
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

    const results = (data ?? []) as LatestMaxE1RMRow[];
    return results.map(item => ({
        exercise_id: String(item.exercise_id),
        max_e1rm: Number(item.max_e1rm),
        equipment_type: item.equipment_type
    }));
};

/**
 * Fetches the all-time peak e1RM for a list of exercises by reusing the daily history RPC.
 * Benchmarks should compare against a user's best demonstrated performance, not only the latest workout.
 */
export const fetchPeakMaxE1RMForExercises = async (userId: string, exerciseIds: string[]): Promise<LatestMaxE1RM[]> => {
    const histories = await Promise.all(
        exerciseIds.map(async (exerciseId) => {
            const history = await fetchMaxE1RMHistory(userId, exerciseId);
            const peakEntry = history.reduce<DailyMaxE1RM | null>((best, item) => {
                if (!best || item.max_e1rm > best.max_e1rm) {
                    return item;
                }
                return best;
            }, null);

            if (!peakEntry) {
                return null;
            }

            return {
                exercise_id: exerciseId,
                max_e1rm: Number(peakEntry.max_e1rm),
                equipment_type: peakEntry.equipment_type,
            } satisfies LatestMaxE1RM;
        })
    );

    return histories.filter((item): item is LatestMaxE1RM => item !== null);
};

/**
 * Fetches the latest recorded max reps for a list of specified exercises.
 */
export const fetchLatestMaxRepsForExercises = async (userId: string, exerciseIds: string[]): Promise<LatestMaxReps[]> => {
    const { data, error } = await supabase.rpc('get_latest_max_reps_for_exercises' as never, {
        p_user_id: userId,
        p_exercise_ids: exerciseIds,
    });

    if (error) {
        console.error('Error fetching latest max reps for exercises:', error);
        throw error;
    }

    const results = (data ?? []) as LatestMaxRepsRow[];
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

    const exercises: WorkoutExerciseDetail[] = ((workoutExercisesData ?? []) as DetailedWorkoutExerciseRow[]).map(we => {
        const sets = (we.exercise_sets ?? []).map(s => ({
            set_number: s.set_number,
            reps: s.reps,
            weight: s.weight,
            time_seconds: s.time_seconds,
            completed: s.completed,
        }));
        const exercise = firstOrSelf(we.exercises);

        return {
            exercise_id: we.exercise_id,
            exercise_name: exercise?.name || 'Unknown Exercise',
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
