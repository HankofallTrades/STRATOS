import { supabase } from '@/lib/integrations/supabase/client';
import { Tables, TablesInsert } from '@/lib/integrations/supabase/types';
import { Workout as WorkoutType, isStrengthSet, isCardioSet, timeToSeconds } from "@/lib/types/workout";

// --- Types ---
export type ExerciseRow = Tables<'exercises'>;
export type ExerciseVariationRow = Tables<'exercise_variations'>;
export type ExerciseSetRow = Tables<'exercise_sets'>;
export type EquipmentTypeRow = Tables<'equipment_types'>;

export interface SingleLogData {
    exerciseId: string;
    reps: number | null;
    timeSeconds: number | null;
    weight: number;
    equipmentType: string | null;
    variation: string | null;
}

// --- Exercises ---

/**
 * Fetches exercises from the database, excluding hidden ones.
 */
export const fetchExercises = async (): Promise<ExerciseRow[]> => {
    const { data: { user } } = await supabase.auth.getUser();

    const query = supabase.from('exercises').select('*, user_hidden_exercises(user_id)');

    if (user) {
        query.is('user_hidden_exercises.user_id', null);
    } else {
        query.is('created_by_user_id', null);
    }

    const { data, error } = await query
        .order('order', { ascending: true })
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Fetches variations for a specific exercise.
 */
export const fetchVariations = async (exerciseId: string): Promise<ExerciseVariationRow[]> => {
    const { data, error } = await supabase
        .from('exercise_variations')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('variation_name', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Creates a new variation for an exercise.
 */
export const createVariation = async (exerciseId: string, variationName: string): Promise<ExerciseVariationRow> => {
    const { data, error } = await supabase
        .from('exercise_variations')
        .insert({ exercise_id: exerciseId, variation_name: variationName })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// --- Equipment ---

/**
 * Fetches all available equipment types.
 */
export const fetchEquipmentTypes = async (): Promise<EquipmentTypeRow[]> => {
    const { data, error } = await supabase
        .from('equipment_types')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
};

/**
 * Creates a new equipment type.
 */
export const createEquipmentType = async (name: string): Promise<EquipmentTypeRow> => {
    const { data, error } = await supabase
        .from('equipment_types')
        .insert({ name })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// --- Logging ---

/**
 * Fetches the most recent set for a user and exercise.
 */
export const fetchLastSetForExercise = async (userId: string, exerciseId: string): Promise<ExerciseSetRow | null> => {
    const { data, error } = await supabase
        .from('exercise_sets')
        .select('*, workout_exercises!inner(workout_id, user_id:workouts!inner(user_id))')
        .eq('workout_exercises.workouts.user_id', userId)
        .eq('workout_exercises.exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * Saves a single exercise log as a self-contained workout.
 */
export const saveSingleExerciseLog = async (userId: string, log: SingleLogData): Promise<string> => {
    // 1. Create Workout
    const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
            user_id: userId,
            duration_seconds: 0,
            completed: true,
            is_single_log: true as any, // Cast due to potential type lag
        } as any)
        .select()
        .single();

    if (workoutError || !workout) throw workoutError || new Error("Failed to create workout.");

    // 2. Link Exercise
    const { data: workoutEx, error: workoutExError } = await supabase
        .from('workout_exercises')
        .insert({
            workout_id: workout.id,
            exercise_id: log.exerciseId,
            order: 1,
        })
        .select()
        .single();

    if (workoutExError || !workoutEx) throw workoutExError || new Error("Failed to link exercise.");

    // 3. Create Set
    const { error: setError } = await supabase
        .from('exercise_sets')
        .insert({
            workout_exercise_id: workoutEx.id,
            set_number: 1,
            weight: log.weight,
            reps: log.reps,
            time_seconds: log.timeSeconds,
            completed: true,
            equipment_type: log.equipmentType,
            variation: log.variation,
        });

    if (setError) throw setError;

    return workout.id;
};

/**
 * Fetches movement archetypes.
 */
export const fetchMovementArchetypes = async () => {
    const { data, error } = await supabase
        .from('movement_archetypes')
        .select('id, name');

    if (error) throw error;
    return data || [];
};

/**
 * Creates a new custom exercise.
 */
export const createExercise = async (userId: string, exercise: {
    name: string;
    is_static: boolean;
    archetype_id: string;
}): Promise<ExerciseRow> => {
    const { data, error } = await supabase
        .from('exercises')
        .insert({
            ...exercise,
            created_by_user_id: userId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Deletes a custom exercise.
 */
export const deleteExercise = async (exerciseId: string) => {
    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

    if (error) throw error;
};

/**
 * Hides a predefined exercise for a user.
 */
export const hideExercise = async (userId: string, exerciseId: string) => {
    const { error } = await supabase
        .from('user_hidden_exercises')
        .insert({
            user_id: userId,
            exercise_id: exerciseId,
        });

    if (error) throw error;
};

/**
 * Fetches the last used equipment type and variation for a specific exercise.
 */
export const fetchLastConfigForExercise = async (
    userId: string,
    exerciseId: string
): Promise<{ equipmentType: string | null; variation: string | null } | null> => {
    const { data, error } = await supabase
        .from('exercise_sets')
        .select('equipment_type, variation, workout_exercises!inner(exercise_id, workout_id, workouts!inner(user_id, created_at))')
        .eq('workout_exercises.workouts.user_id', userId)
        .eq('workout_exercises.exercise_id', exerciseId)
        .order('created_at', { foreignTable: 'workout_exercises.workouts', ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
        equipmentType: data.equipment_type as string | null,
        variation: data.variation as string | null,
    };
};

/**
 * Fetches completed sets from the most recent workout instance for an exercise/config.
 */
export const fetchLastWorkoutExerciseInstance = async (
    userId: string,
    exerciseId: string,
    equipmentType: string | null | undefined,
    variation: string | null | undefined
): Promise<{ weight: number; reps: number | null; time_seconds: number | null; set_number: number }[] | null> => {
    const targetVariation = variation || 'Standard';
    const targetEquipmentType = equipmentType ?? null;

    // 1. Find most recent workout
    const { data: lastWorkout, error: workoutError } = await supabase
        .from('workouts')
        .select('id, created_at, workout_exercises!inner(exercise_id, exercise_sets!inner(completed, variation, equipment_type))')
        .eq('user_id', userId)
        .eq('workout_exercises.exercise_id', exerciseId)
        .eq('workout_exercises.exercise_sets.completed', true)
        .filter('workout_exercises.exercise_sets.equipment_type', targetEquipmentType === null ? 'is' : 'eq', targetEquipmentType)
        .filter(
            'workout_exercises.exercise_sets.variation',
            targetVariation === 'Standard' ? 'in' : 'eq',
            targetVariation === 'Standard' ? '("Standard", "", null)' : targetVariation
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (workoutError || !lastWorkout) return null;

    // 2. Fetch sets from that workout
    const { data: sets, error: setsError } = await supabase
        .from('exercise_sets')
        .select('weight, reps, time_seconds, set_number, variation, equipment_type, workout_exercises!inner(exercise_id, workout_id)')
        .eq('workout_exercises.workout_id', lastWorkout.id)
        .eq('workout_exercises.exercise_id', exerciseId)
        .eq('completed', true)
        .filter('equipment_type', targetEquipmentType === null ? 'is' : 'eq', targetEquipmentType)
        .filter(
            'variation',
            targetVariation === 'Standard' ? 'in' : 'eq',
            targetVariation === 'Standard' ? '("Standard", "", null)' : targetVariation
        )
        .order('set_number', { ascending: true });

    if (setsError) throw setsError;
    if (!sets) return null;

    return sets.map(set => ({
        weight: set.weight,
        reps: set.reps,
        time_seconds: set.time_seconds,
        set_number: set.set_number,
    }));
};

// --- Workout Sessions ---

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
