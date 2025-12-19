import { supabase } from '@/lib/integrations/supabase/client';
import { TablesInsert } from '@/lib/integrations/supabase/types';
import { Workout as WorkoutType, isStrengthSet, isCardioSet, timeToSeconds } from "@/lib/types/workout";

export const saveWorkoutToDb = async (
    userId: string,
    workoutToEnd: WorkoutType,
    durationInSeconds: number,
    workoutType: 'strength' | 'cardio' | 'mixed'
) => {
    // 1. Insert Workout
    const workoutDataForDb = {
        user_id: userId,
        duration_seconds: durationInSeconds,
        completed: true,
        type: workoutType,
        session_focus: workoutToEnd.session_focus || null,
        notes: workoutToEnd.notes || null,
    } as TablesInsert<'workouts'>;

    const { data: savedWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutDataForDb)
        .select()
        .single();

    if (workoutError || !savedWorkout) {
        throw workoutError || new Error("Failed to save workout record.");
    }

    const workoutId = savedWorkout.id;

    // 2. Insert Workout Exercises
    const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = workoutToEnd.exercises
        .filter(exercise => exercise.sets.some(set => set.completed))
        .map((exercise, index) => ({
            workout_id: workoutId,
            exercise_id: exercise.exerciseId,
            order: index + 1,
        }));

    if (workoutExercisesDataForDb.length === 0) {
        return { workoutId, savedWorkoutExercises: [] };
    }

    const { data: savedWorkoutExercises, error: workoutExercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercisesDataForDb)
        .select();

    if (workoutExercisesError || !savedWorkoutExercises || savedWorkoutExercises.length !== workoutExercisesDataForDb.length) {
        throw workoutExercisesError || new Error("Failed to save workout exercises records.");
    }

    // 3. Insert Exercise Sets
    const exerciseSetsDataForDb: TablesInsert<'exercise_sets'>[] = [];
    workoutToEnd.exercises.forEach((exercise) => {
        const savedWorkoutExercise = savedWorkoutExercises.find(
            swe => swe.exercise_id === exercise.exerciseId && swe.workout_id === workoutId
        );

        if (!savedWorkoutExercise) return;

        exercise.sets.forEach((set, index) => {
            if (!set.completed) return;

            if (isStrengthSet(set)) {
                exerciseSetsDataForDb.push({
                    workout_exercise_id: savedWorkoutExercise.id,
                    set_number: index + 1,
                    weight: set.weight,
                    reps: set.reps,
                    time_seconds: set.time ? timeToSeconds(set.time) : null,
                    completed: true,
                    equipment_type: set.equipmentType || null,
                    variation: set.variation || null,
                });
            } else if (isCardioSet(set)) {
                exerciseSetsDataForDb.push({
                    workout_exercise_id: savedWorkoutExercise.id,
                    set_number: index + 1,
                    weight: 0,
                    reps: null,
                    time_seconds: timeToSeconds(set.time),
                    completed: true,
                    distance_km: set.distance_km,
                } as TablesInsert<'exercise_sets'>);
            }
        });
    });

    if (exerciseSetsDataForDb.length > 0) {
        const { error: setsError } = await supabase
            .from('exercise_sets')
            .insert(exerciseSetsDataForDb);

        if (setsError) throw setsError;
    }

    return { workoutId, savedWorkoutExercises };
};

// --- Nutrition ---

export interface DailyProteinIntake {
    total_protein: number;
}

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

// --- Wellbeing (Sun Exposure) ---

export interface SunExposureLog {
    id?: number;
    user_id: string;
    date: string;
    hours: number;
    created_at?: string;
}

export const addSunExposure = async (userId: string, hours: number, date: string): Promise<SunExposureLog> => {
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

export const getDailySunExposure = async (userId: string, date: string): Promise<{ total_hours: number }> => {
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

// --- Shared Fitness Data (Profiles) ---

export interface UserWeight {
    weight_kg: number | null;
}

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

export interface WeeklyZone2CardioData {
    total_minutes: number;
}

/**
 * Gets the total weekly zone 2 cardio minutes for a user.
 */
export const getWeeklyZone2CardioMinutes = async (userId: string): Promise<WeeklyZone2CardioData> => {
    // Calculate the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabase.rpc('get_weekly_zone2_cardio_minutes' as any, {
        user_id: userId,
        start_date: startOfWeek.toISOString()
    });

    if (error) {
        console.error('Error getting weekly zone 2 cardio minutes:', error);
        return { total_minutes: 0 };
    }

    return { total_minutes: (data as number) || 0 };
};
