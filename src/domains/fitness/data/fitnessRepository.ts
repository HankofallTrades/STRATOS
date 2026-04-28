import { supabase } from '@/lib/integrations/supabase/client';
import { Tables, TablesInsert } from '@/lib/integrations/supabase/types';
import { Workout as WorkoutType, isStrengthSet, isCardioSet, timeToSeconds } from "@/lib/types/workout";
import type { PersistedWorkoutType } from './workoutPersistence';

// --- Types ---
export type ExerciseRow = Tables<'exercises'>;
export type ExerciseVariationRow = Tables<'exercise_variations'>;
export type ExerciseSetRow = Tables<'exercise_sets'>;
export type EquipmentTypeRow = Tables<'equipment_types'>;
export type ExerciseMuscleGroupMapping = Record<string, string[]>;
export type LastWorkoutExerciseInstanceSet = {
    weight: number;
    reps: number | null;
    time_seconds: number | null;
    set_number: number;
};

export interface WorkoutExerciseHistoryLookup {
    exerciseId: string;
    equipmentType: string | null | undefined;
    variation: string | null | undefined;
}

export type WorkoutExerciseHistoryMap = Record<string, LastWorkoutExerciseInstanceSet[]>;
export type ExerciseVariationMap = Record<string, ExerciseVariationRow[]>;
export type LastExerciseConfigMap = Record<
    string,
    { equipmentType: string | null; variation: string | null }
>;

export interface LatestSingleExerciseLogData extends ExerciseSetRow {
    exercise_id: string;
}

export interface SingleLogData {
    exerciseId: string;
    reps: number | null;
    timeSeconds: number | null;
    weight: number;
    equipmentType: string | null;
    variation: string | null;
}

const DEFAULT_VARIATION = 'Standard';

const normalizeWorkoutExerciseVariation = (variation: string | null | undefined) =>
    variation && variation.trim().length > 0 ? variation : DEFAULT_VARIATION;

const normalizeWorkoutExerciseEquipmentType = (equipmentType: string | null | undefined) =>
    equipmentType ?? null;

export const buildWorkoutExerciseHistoryKey = ({
    exerciseId,
    equipmentType,
    variation,
}: WorkoutExerciseHistoryLookup) =>
    [
        exerciseId,
        normalizeWorkoutExerciseEquipmentType(equipmentType) ?? '__none__',
        normalizeWorkoutExerciseVariation(variation),
    ].join('::');

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

export const fetchVariationsForExercises = async (
    exerciseIds: string[]
): Promise<ExerciseVariationMap> => {
    const uniqueExerciseIds = [...new Set(exerciseIds)].filter(Boolean);

    if (uniqueExerciseIds.length === 0) {
        return {};
    }

    const { data, error } = await supabase
        .from('exercise_variations')
        .select('*')
        .in('exercise_id', uniqueExerciseIds)
        .order('variation_name', { ascending: true });

    if (error) throw error;

    const variationsByExerciseId = uniqueExerciseIds.reduce<ExerciseVariationMap>((acc, exerciseId) => {
        acc[exerciseId] = [];
        return acc;
    }, {});

    for (const variation of data || []) {
        if (!variationsByExerciseId[variation.exercise_id]) {
            variationsByExerciseId[variation.exercise_id] = [];
        }
        variationsByExerciseId[variation.exercise_id].push(variation);
    }

    return variationsByExerciseId;
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

export const fetchLatestSingleExerciseLog = async (
    userId: string
): Promise<LatestSingleExerciseLogData | null> => {
    type NestedSetData = ExerciseSetRow & {
        workout_exercises: { exercise_id: string } | null;
    };

    const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
            *,
            workout_exercises!inner(
                exercise_id,
                workouts!inner(is_single_log, user_id)
            )
        `)
        .eq('workout_exercises.workouts.user_id', userId)
        .eq('workout_exercises.workouts.is_single_log', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<NestedSetData[]>()
        .maybeSingle();

    if (error) {
        console.error('Error fetching latest single exercise log:', error);
        return null;
    }

    if (!data || !data.workout_exercises) {
        return null;
    }

    return {
        ...data,
        exercise_id: data.workout_exercises.exercise_id,
    };
};

/**
 * Saves a single exercise log as a self-contained workout.
 */
export const saveSingleExerciseLog = async (userId: string, log: SingleLogData): Promise<string> => {
    // 1. Create Workout
    const workoutInsert: TablesInsert<'workouts'> & Record<string, unknown> = {
        user_id: userId,
        duration_seconds: 0,
        completed: true,
    };
    workoutInsert.is_single_log = true;

    const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutInsert as TablesInsert<'workouts'>)
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

export const fetchExerciseMuscleGroupMappings = async (): Promise<ExerciseMuscleGroupMapping> => {
    const { data, error } = await supabase.rpc('get_exercise_muscle_group_map' as never);

    if (error) {
        console.error('Error fetching muscle group mappings from RPC:', error);
        throw new Error(`Failed to fetch muscle group mappings: ${error.message}`);
    }

    if (!data) {
        return {};
    }

    return data as ExerciseMuscleGroupMapping;
};

/**
 * Creates a new custom exercise.
 */
export const createExercise = async (userId: string, exercise: {
    name: string;
    is_static: boolean;
    archetype_id: string;
    exercise_category?: string;
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
    // Anchor on the latest completed workout first so we do not rely on ordering
    // exercise_sets through a nested workout join, which can surface an older config.
    const { data: lastWorkout, error: workoutError } = await supabase
        .from('workouts')
        .select('id, workout_exercises!inner(id)')
        .eq('user_id', userId)
        .eq('completed', true)
        .eq('workout_exercises.exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (workoutError) throw workoutError;
    if (!lastWorkout) return null;

    const { data: workoutExercise, error: workoutExerciseError } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', lastWorkout.id)
        .eq('exercise_id', exerciseId)
        .limit(1)
        .maybeSingle();

    if (workoutExerciseError) throw workoutExerciseError;
    if (!workoutExercise) return null;

    const { data, error } = await supabase
        .from('exercise_sets')
        .select('equipment_type, variation')
        .eq('workout_exercise_id', workoutExercise.id)
        .eq('completed', true)
        .order('set_number', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
        equipmentType: (data.equipment_type as string | null) || null,
        variation: (data.variation as string | null) || null,
    };
};

type RecentWorkoutExerciseConfigRow = {
    exercise_id: string;
    exercise_sets: Array<{
        completed: boolean | null;
        equipment_type: string | null;
        set_number: number | null;
        variation: string | null;
    }> | null;
    workouts: {
        created_at: string;
    } | null;
};

export const fetchLastConfigsForExercises = async (
    userId: string,
    exerciseIds: string[]
): Promise<LastExerciseConfigMap> => {
    const uniqueExerciseIds = [...new Set(exerciseIds)].filter(Boolean);

    if (!userId || uniqueExerciseIds.length === 0) {
        return {};
    }

    const { data, error } = await supabase
        .from("workout_exercises")
        .select(`
            exercise_id,
            workouts!inner(created_at, user_id, completed),
            exercise_sets(set_number, completed, equipment_type, variation)
        `)
        .eq("workouts.user_id", userId)
        .eq("workouts.completed", true)
        .in("exercise_id", uniqueExerciseIds);

    if (error) throw error;

    const latestConfigByExerciseId = uniqueExerciseIds.reduce<LastExerciseConfigMap>(
        (acc, exerciseId) => {
            acc[exerciseId] = { equipmentType: null, variation: null };
            return acc;
        },
        {}
    );
    const latestWorkoutTimestampByExerciseId = new Map<string, number>();

    for (const row of (data ?? []) as RecentWorkoutExerciseConfigRow[]) {
        const workoutCreatedAt = row.workouts?.created_at;
        if (!workoutCreatedAt) {
            continue;
        }

        const latestCompletedSet = (row.exercise_sets ?? [])
            .filter(setRow => setRow.completed)
            .sort((left, right) => (right.set_number ?? 0) - (left.set_number ?? 0))[0];

        if (!latestCompletedSet) {
            continue;
        }

        const workoutTimestamp = new Date(workoutCreatedAt).getTime();
        const previousTimestamp =
            latestWorkoutTimestampByExerciseId.get(row.exercise_id) ?? Number.NEGATIVE_INFINITY;

        if (workoutTimestamp < previousTimestamp) {
            continue;
        }

        latestWorkoutTimestampByExerciseId.set(row.exercise_id, workoutTimestamp);
        latestConfigByExerciseId[row.exercise_id] = {
            equipmentType: latestCompletedSet.equipment_type ?? null,
            variation: latestCompletedSet.variation ?? null,
        };
    }

    return latestConfigByExerciseId;
};

/**
 * Fetches completed sets from the most recent workout instance for an exercise/config.
 */
export const fetchLastWorkoutExerciseInstance = async (
    userId: string,
    exerciseId: string,
    equipmentType: string | null | undefined,
    variation: string | null | undefined
): Promise<LastWorkoutExerciseInstanceSet[] | null> => {
    const targetVariation = normalizeWorkoutExerciseVariation(variation);
    const targetEquipmentType = normalizeWorkoutExerciseEquipmentType(equipmentType);

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

type BatchedWorkoutExerciseSetRow = {
    weight: number;
    reps: number | null;
    time_seconds: number | null;
    set_number: number;
    variation: string | null;
    equipment_type: string | null;
    workout_exercises: {
        exercise_id: string;
        workout_id: string;
        workouts: {
            created_at: string;
            user_id: string;
        } | null;
    } | null;
};

export const fetchLastWorkoutExerciseInstances = async (
    userId: string,
    lookups: WorkoutExerciseHistoryLookup[]
): Promise<WorkoutExerciseHistoryMap> => {
    const uniqueLookups = [...new Map(
        lookups
            .filter(({ exerciseId }) => Boolean(exerciseId))
            .map(lookup => [buildWorkoutExerciseHistoryKey(lookup), lookup])
    ).values()];

    if (uniqueLookups.length === 0) {
        return {};
    }

    const requestedKeys = new Set(
        uniqueLookups.map(lookup => buildWorkoutExerciseHistoryKey(lookup))
    );
    const exerciseIds = [...new Set(uniqueLookups.map(lookup => lookup.exerciseId))];

    const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
            weight,
            reps,
            time_seconds,
            set_number,
            variation,
            equipment_type,
            workout_exercises!inner(
                exercise_id,
                workout_id,
                workouts!inner(
                    user_id,
                    created_at
                )
            )
        `)
        .eq('completed', true)
        .eq('workout_exercises.workouts.user_id', userId)
        .in('workout_exercises.exercise_id', exerciseIds)
        .returns<BatchedWorkoutExerciseSetRow[]>();

    if (error) throw error;

    const orderedRows = (data || []).slice().sort((left, right) => {
        const leftCreatedAt = left.workout_exercises?.workouts?.created_at ?? '';
        const rightCreatedAt = right.workout_exercises?.workouts?.created_at ?? '';

        if (leftCreatedAt !== rightCreatedAt) {
            return leftCreatedAt < rightCreatedAt ? 1 : -1;
        }

        if (left.workout_exercises?.workout_id !== right.workout_exercises?.workout_id) {
            return (left.workout_exercises?.workout_id ?? '').localeCompare(
                right.workout_exercises?.workout_id ?? ''
            );
        }

        return left.set_number - right.set_number;
    });

    const latestWorkoutIdByLookupKey = new Map<string, string>();
    const setsByLookupKey: WorkoutExerciseHistoryMap = {};

    for (const row of orderedRows) {
        if (!row.workout_exercises) {
            continue;
        }

        const lookupKey = buildWorkoutExerciseHistoryKey({
            exerciseId: row.workout_exercises.exercise_id,
            equipmentType: row.equipment_type,
            variation: row.variation,
        });

        if (!requestedKeys.has(lookupKey)) {
            continue;
        }

        const workoutId = row.workout_exercises.workout_id;
        const recordedWorkoutId = latestWorkoutIdByLookupKey.get(lookupKey);

        if (!recordedWorkoutId) {
            latestWorkoutIdByLookupKey.set(lookupKey, workoutId);
            setsByLookupKey[lookupKey] = [];
        }

        if (latestWorkoutIdByLookupKey.get(lookupKey) !== workoutId) {
            continue;
        }

        setsByLookupKey[lookupKey].push({
            weight: row.weight,
            reps: row.reps,
            time_seconds: row.time_seconds,
            set_number: row.set_number,
        });
    }

    return setsByLookupKey;
};

// --- Workout Sessions ---

export const saveWorkoutToDb = async (
    userId: string,
    workoutToEnd: WorkoutType,
    durationInSeconds: number,
    workoutType: PersistedWorkoutType
) => {
    const workoutDataForDb: TablesInsert<'workouts'> & Record<string, unknown> = {
        id: workoutToEnd.id,
        user_id: userId,
        duration_seconds: durationInSeconds,
        completed: true,
        type: workoutType,
        session_focus: workoutToEnd.session_focus || null,
        notes: workoutToEnd.notes || null,
        warmup_seconds: workoutToEnd.warmup_seconds || null,
    };

    const optionalPeriodizationFields: Record<string, unknown> = {};
    if (workoutToEnd.mesocycle_id) {
        optionalPeriodizationFields.mesocycle_id = workoutToEnd.mesocycle_id;
    }
    if (workoutToEnd.mesocycle_session_id) {
        optionalPeriodizationFields.mesocycle_session_id = workoutToEnd.mesocycle_session_id;
    }
    if (typeof workoutToEnd.mesocycle_week === 'number') {
        optionalPeriodizationFields.mesocycle_week = workoutToEnd.mesocycle_week;
    }

    const attemptUpsertWorkout = async (payload: Record<string, unknown>) => supabase
        .from('workouts')
        .upsert(payload as unknown as TablesInsert<'workouts'>, {
            onConflict: 'id',
        })
        .select()
        .single();

    let { data: savedWorkout, error: workoutError } = await attemptUpsertWorkout({
        ...workoutDataForDb,
        ...optionalPeriodizationFields,
    });

    if (workoutError && Object.keys(optionalPeriodizationFields).length > 0) {
        const errorMessage = `${workoutError.message || ''} ${workoutError.details || ''}`.toLowerCase();
        const isMissingPeriodizationColumn =
            errorMessage.includes('mesocycle_id') ||
            errorMessage.includes('mesocycle_session_id') ||
            errorMessage.includes('mesocycle_week') ||
            workoutError.code === 'PGRST204';

        if (isMissingPeriodizationColumn) {
            ({ data: savedWorkout, error: workoutError } = await attemptUpsertWorkout(workoutDataForDb));
        }
    }

    if (workoutError || !savedWorkout) {
        throw workoutError || new Error("Failed to save workout record.");
    }

    const workoutId = savedWorkout.id;

    const exerciseOrder: string[] = [];
    const exerciseGroups: Record<string, typeof workoutToEnd.exercises> = {};

    workoutToEnd.exercises.forEach(exercise => {
        if (!exercise.sets.some(set => set.completed)) return;

        if (!exerciseGroups[exercise.exerciseId]) {
            exerciseOrder.push(exercise.exerciseId);
            exerciseGroups[exercise.exerciseId] = [];
        }
        exerciseGroups[exercise.exerciseId].push(exercise);
    });

    if (exerciseOrder.length === 0) {
        return { workoutId };
    }

    const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = exerciseOrder.map((exerciseId, index) => ({
        id: exerciseGroups[exerciseId][0].id,
        workout_id: workoutId,
        exercise_id: exerciseId,
        order: index + 1,
    }));

    const { data: savedWorkoutExercises, error: workoutExercisesError } = await supabase
        .from('workout_exercises')
        .upsert(workoutExercisesDataForDb, {
            onConflict: 'id',
        })
        .select();

    if (workoutExercisesError || !savedWorkoutExercises || savedWorkoutExercises.length !== workoutExercisesDataForDb.length) {
        throw workoutExercisesError || new Error("Failed to save workout exercises records.");
    }

    const exerciseSetsDataForDb: TablesInsert<'exercise_sets'>[] = [];

    savedWorkoutExercises.forEach((savedWorkoutExercise) => {
        const originalExercises = exerciseGroups[savedWorkoutExercise.exercise_id];
        if (!originalExercises) return;

        let globalSetIndex = 0;
        originalExercises.forEach((exercise) => {
            exercise.sets.forEach((set) => {
                if (!set.completed) return;

                globalSetIndex++;

                if (isStrengthSet(set)) {
                    exerciseSetsDataForDb.push({
                        id: set.id,
                        workout_exercise_id: savedWorkoutExercise.id,
                        set_number: globalSetIndex,
                        weight: set.weight,
                        reps: set.reps,
                        time_seconds: set.time ? timeToSeconds(set.time) : null,
                        completed: true,
                        equipment_type: set.equipmentType || null,
                        variation: set.variation || null,
                    });
                } else if (isCardioSet(set)) {
                    exerciseSetsDataForDb.push({
                        id: set.id,
                        workout_exercise_id: savedWorkoutExercise.id,
                        set_number: globalSetIndex,
                        weight: 0,
                        reps: null,
                        time_seconds: timeToSeconds(set.time),
                        completed: true,
                        distance_km: set.distance_km,
                    } as TablesInsert<'exercise_sets'>);
                }
            });
        });
    });

    if (exerciseSetsDataForDb.length > 0) {
        const { error: setsError } = await supabase
            .from('exercise_sets')
            .upsert(exerciseSetsDataForDb, {
                onConflict: 'id',
            });

        if (setsError) throw setsError;
    }

    return { workoutId };
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

    const { data, error } = await supabase.rpc('get_weekly_zone2_cardio_minutes' as never, {
        user_id: userId,
        start_date: startOfWeek.toISOString()
    });

    if (error) {
        console.error('Error getting weekly zone 2 cardio minutes:', error);
        return { total_minutes: 0 };
    }

    return { total_minutes: (data as number) || 0 };
};
