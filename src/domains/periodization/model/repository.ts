import { supabase } from '@/lib/integrations/supabase/client';
import type {
  ActiveMesocycleProgram,
  CreateCustomMesocycleSessionInput,
  CreateMesocycleInput,
  Mesocycle,
  MesocycleSession,
  MesocycleSessionExerciseWithExercise,
  MesocycleSessionTemplate,
} from './types';
import type { Exercise } from '@/lib/types/workout';

interface OccamsSessionTemplateDefinition {
  name: string;
  sessionFocus: 'hypertrophy';
  setsPerExercise: number;
  repRange: string;
  progressionRule: string;
  exercises: Array<{
    canonicalName: string;
    targetSets: number;
    targetReps: string;
    targetEquipmentType: string;
    targetVariation: string;
    loadIncrementKg: number;
    notes: string;
  }>;
}

const OCCAMS_TEMPLATE: OccamsSessionTemplateDefinition[] = [
  {
    name: 'Occam A',
    sessionFocus: 'hypertrophy',
    setsPerExercise: 1,
    repRange: '7-12',
    progressionRule:
      'One all-out work set per exercise to technical failure at 5s up / 5s down. If you hit >=7 reps with clean tempo, increase next session by about max(10 lb, 10%). If below minimum reps, keep load and add rest days. Optional accessories: myotatic crunches or vacuum breathing work.',
    exercises: [
      {
        canonicalName: 'Pulldown',
        targetSets: 1,
        targetReps: '7-12',
        targetEquipmentType: 'Machine',
        targetVariation: 'Supinated',
        loadIncrementKg: 4.54,
        notes: '5s up / 5s down tempo, one set to technical failure.',
      },
      {
        canonicalName: 'Shoulder Press',
        targetSets: 1,
        targetReps: '7-12',
        targetEquipmentType: 'Machine',
        targetVariation: 'Standard',
        loadIncrementKg: 4.54,
        notes: '5s up / 5s down tempo, one set to technical failure.',
      },
    ],
  },
  {
    name: 'Occam B',
    sessionFocus: 'hypertrophy',
    setsPerExercise: 1,
    repRange: '7-12 (Leg Press: 10-12)',
    progressionRule:
      'One all-out work set per exercise to technical failure at 5s up / 5s down. For leg press use 10-12 reps minimum. Increase load by about max(10 lb, 10%) when minimum reps are met. Optional posterior-chain finisher: high-rep swings.',
    exercises: [
      {
        canonicalName: 'Chest Press',
        targetSets: 1,
        targetReps: '7-12',
        targetEquipmentType: 'Machine',
        targetVariation: 'Incline',
        loadIncrementKg: 4.54,
        notes: '5s up / 5s down tempo, one set to technical failure.',
      },
      {
        canonicalName: 'Leg Press',
        targetSets: 1,
        targetReps: '10-12',
        targetEquipmentType: 'Machine',
        targetVariation: 'Standard',
        loadIncrementKg: 9.07,
        notes: '5s up / 5s down tempo, one set to technical failure.',
      },
    ],
  },
];

const PERIODIZATION_TABLES_MISSING_ERROR_CODES = new Set(['PGRST205', '42P01']);

const isMissingPeriodizationTableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? '');
  return (
    (code !== undefined && PERIODIZATION_TABLES_MISSING_ERROR_CODES.has(code)) ||
    message.toLowerCase().includes('mesocycles') ||
    message.toLowerCase().includes('mesocycle_sessions')
  );
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const EXERCISE_SELECT_COLUMNS =
  'id, name, order, exercise_type, archetype_id, default_equipment_type, created_by_user_id, is_static';

const computeCurrentWeek = (startDateIso: string, durationWeeks: number): number => {
  const start = new Date(startDateIso);
  const now = new Date();
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedWeeks = Math.floor(Math.max(0, elapsedMs) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(durationWeeks, elapsedWeeks + 1);
};

const fetchExerciseCatalog = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_SELECT_COLUMNS)
    .order('order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Exercise[];
};

const getNextExerciseOrder = (exerciseCatalog: Exercise[]): number => {
  const maxOrder = exerciseCatalog.reduce((max, exercise) => {
    const order = Number((exercise as { order?: number }).order ?? 0);
    return order > max ? order : max;
  }, 0);
  return maxOrder + 1;
};

const ensureExerciseVariation = async (exerciseId: string, variationName: string): Promise<void> => {
  if (!variationName || variationName === 'Standard') return;

  const { data: existingVariation, error: existingVariationError } = await supabase
    .from('exercise_variations')
    .select('id')
    .eq('exercise_id', exerciseId)
    .eq('variation_name', variationName)
    .maybeSingle();

  if (existingVariationError) throw existingVariationError;
  if (existingVariation) return;

  const { error: insertVariationError } = await supabase
    .from('exercise_variations')
    .insert({
      exercise_id: exerciseId,
      variation_name: variationName,
    });

  if (insertVariationError) throw insertVariationError;
};

const ensureCanonicalExerciseForUser = async (
  userId: string,
  exerciseCatalog: Exercise[],
  canonicalName: string,
  defaultEquipmentType: string,
  requiredVariation: string
): Promise<Exercise> => {
  const canonicalNormalized = normalizeName(canonicalName);
  const exactMatch = exerciseCatalog.find(exercise => normalizeName(exercise.name) === canonicalNormalized);
  if (exactMatch) {
    await ensureExerciseVariation(exactMatch.id, requiredVariation);
    return exactMatch;
  }

  const nextOrder = getNextExerciseOrder(exerciseCatalog);
  const { data: insertedExercise, error: insertExerciseError } = await supabase
    .from('exercises')
    .insert({
      name: canonicalName,
      order: nextOrder,
      created_by_user_id: userId,
      default_equipment_type: defaultEquipmentType,
      exercise_type: 'strength',
      is_static: false,
      archetype_id: null,
    })
    .select(EXERCISE_SELECT_COLUMNS)
    .single();

  if (insertExerciseError || !insertedExercise) {
    throw insertExerciseError ?? new Error(`Failed to create protocol exercise: ${canonicalName}`);
  }

  const createdExercise = insertedExercise as Exercise;
  exerciseCatalog.push(createdExercise);
  await ensureExerciseVariation(createdExercise.id, requiredVariation);
  return createdExercise;
};

const fetchSessionsForMesocycle = async (mesocycleId: string): Promise<MesocycleSession[]> => {
  const { data, error } = await supabase
    .from('mesocycle_sessions' as never)
    .select('*')
    .eq('mesocycle_id', mesocycleId)
    .order('session_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MesocycleSession[];
};

const fetchSessionExercises = async (
  sessionIds: string[]
): Promise<Record<string, MesocycleSessionExerciseWithExercise[]>> => {
  if (sessionIds.length === 0) return {};

  const { data, error } = await supabase
    .from('mesocycle_session_exercises' as never)
    .select('*, exercises(id, name, exercise_type, archetype_id, default_equipment_type, created_by_user_id, is_static)')
    .in('mesocycle_session_id', sessionIds)
    .order('exercise_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Array<
    Omit<MesocycleSessionExerciseWithExercise, 'exercise'> & { exercises?: Exercise | null }
  >;

  return rows.reduce<Record<string, MesocycleSessionExerciseWithExercise[]>>((acc, row) => {
    if (!acc[row.mesocycle_session_id]) {
      acc[row.mesocycle_session_id] = [];
    }
    acc[row.mesocycle_session_id].push({
      ...row,
      exercise: row.exercises ?? null,
    });
    return acc;
  }, {});
};

const fetchLastCompletedSessionId = async (
  userId: string,
  mesocycleId: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('workouts')
    .select('mesocycle_session_id')
    .eq('user_id', userId)
    .eq('mesocycle_id', mesocycleId)
    .not('mesocycle_session_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.mesocycle_session_id as string | null) ?? null;
};

const getNextSessionInRotation = (
  sessions: MesocycleSessionTemplate[],
  lastCompletedSessionId: string | null
): MesocycleSessionTemplate | null => {
  if (sessions.length === 0) return null;
  if (!lastCompletedSessionId) return sessions[0];

  const currentIndex = sessions.findIndex(session => session.id === lastCompletedSessionId);
  if (currentIndex < 0) return sessions[0];

  return sessions[(currentIndex + 1) % sessions.length];
};

const upsertOccamsProtocolSession = async (
  userId: string,
  mesocycleId: string,
  sessionOrder: number,
  definition: OccamsSessionTemplateDefinition,
  exerciseCatalog: Exercise[],
  existingSession: MesocycleSession | null
): Promise<void> => {
  let sessionId = existingSession?.id ?? null;

  const sessionPayload = {
    mesocycle_id: mesocycleId,
    name: definition.name,
    session_order: sessionOrder,
    session_focus: definition.sessionFocus,
    sets_per_exercise: definition.setsPerExercise,
    rep_range: definition.repRange,
    progression_rule: definition.progressionRule,
  };

  if (!sessionId) {
    const { data: insertedSession, error: insertSessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .insert(sessionPayload)
      .select('*')
      .single();

    if (insertSessionError || !insertedSession) {
      throw insertSessionError ?? new Error('Failed to create Occam session.');
    }

    sessionId = insertedSession.id as string;
  } else {
    const { error: updateSessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .update(sessionPayload)
      .eq('id', sessionId);

    if (updateSessionError) throw updateSessionError;
  }

  const desiredSessionExercises = definition.exercises
    .map(async (templateExercise, exerciseIndex) => {
      const resolved = await ensureCanonicalExerciseForUser(
        userId,
        exerciseCatalog,
        templateExercise.canonicalName,
        templateExercise.targetEquipmentType,
        templateExercise.targetVariation
      );

      return resolved ? {
        mesocycle_session_id: sessionId as string,
        exercise_id: resolved.id,
        exercise_order: exerciseIndex + 1,
        target_sets: templateExercise.targetSets,
        target_reps: templateExercise.targetReps,
        load_increment_kg: templateExercise.loadIncrementKg,
        notes: templateExercise.notes,
      } : null;
    });

  const resolvedSessionExercises = await Promise.all(desiredSessionExercises);
  const desiredSessionExerciseRows = resolvedSessionExercises
      .filter((value): value is NonNullable<typeof value> => value !== null);

  if (desiredSessionExerciseRows.length === 0) return;

  const { data: currentSessionExercises, error: currentSessionExercisesError } = await supabase
    .from('mesocycle_session_exercises' as never)
    .select('exercise_id, exercise_order, target_sets, target_reps, load_increment_kg, notes')
    .eq('mesocycle_session_id', sessionId)
    .order('exercise_order', { ascending: true });

  if (currentSessionExercisesError) throw currentSessionExercisesError;

  type CurrentSessionExerciseShape = {
    exercise_id: string;
    exercise_order: number;
    target_sets: number | null;
    target_reps: string | null;
    load_increment_kg: number | null;
    notes: string | null;
  };

  const currentSerialized = JSON.stringify(
    ((currentSessionExercises ?? []) as CurrentSessionExerciseShape[]).map(row => ({
      exercise_id: row.exercise_id,
      exercise_order: row.exercise_order,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      load_increment_kg: row.load_increment_kg,
      notes: row.notes,
    }))
  );
  const desiredSerialized = JSON.stringify(
    desiredSessionExerciseRows.map(row => ({
      exercise_id: row.exercise_id,
      exercise_order: row.exercise_order,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      load_increment_kg: row.load_increment_kg,
      notes: row.notes,
    }))
  );

  if (currentSerialized === desiredSerialized) return;

  const { error: deleteExercisesError } = await supabase
    .from('mesocycle_session_exercises' as never)
    .delete()
    .eq('mesocycle_session_id', sessionId);

  if (deleteExercisesError) throw deleteExercisesError;

  const { error: insertExercisesError } = await supabase
    .from('mesocycle_session_exercises' as never)
    .insert(desiredSessionExerciseRows);

  if (insertExercisesError) throw insertExercisesError;
};

const ensureOccamsProtocolSessions = async (
  userId: string,
  mesocycleId: string,
  existingSessions: MesocycleSession[]
): Promise<void> => {
  const exercises = await fetchExerciseCatalog();
  const existingByName = new Map(existingSessions.map(session => [normalizeName(session.name), session]));

  for (let index = 0; index < OCCAMS_TEMPLATE.length; index += 1) {
    const definition = OCCAMS_TEMPLATE[index];
    await upsertOccamsProtocolSession(
      userId,
      mesocycleId,
      index + 1,
      definition,
      exercises,
      existingByName.get(normalizeName(definition.name)) ?? null
    );
  }
};

export const getActiveMesocycleProgram = async (userId: string): Promise<ActiveMesocycleProgram | null> => {
  const { data, error } = await supabase
    .from('mesocycles' as never)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingPeriodizationTableError(error)) return null;
    throw error;
  }
  if (!data) return null;

  const mesocycle = data as Mesocycle;
  let sessions = await fetchSessionsForMesocycle(mesocycle.id);

  if (mesocycle.protocol === 'occams') {
    await ensureOccamsProtocolSessions(userId, mesocycle.id, sessions);
    sessions = await fetchSessionsForMesocycle(mesocycle.id);
  }

  const groupedExercises = await fetchSessionExercises(sessions.map(session => session.id));
  const lastCompletedSessionId = await fetchLastCompletedSessionId(userId, mesocycle.id);

  const sessionTemplates: MesocycleSessionTemplate[] = sessions.map(session => ({
    ...session,
    exercises: groupedExercises[session.id] ?? [],
  })).sort((a, b) => a.session_order - b.session_order);

  const nextSession = getNextSessionInRotation(sessionTemplates, lastCompletedSessionId);

  return {
    mesocycle,
    sessions: sessionTemplates,
    current_week: computeCurrentWeek(mesocycle.start_date, mesocycle.duration_weeks),
    last_completed_session_id: lastCompletedSessionId,
    next_session_id: nextSession?.id ?? null,
    next_session_name: nextSession?.name ?? null,
  };
};

export const createMesocycle = async (
  userId: string,
  input: CreateMesocycleInput
): Promise<Mesocycle> => {
  if (input.duration_weeks < 4 || input.duration_weeks > 12) {
    throw new Error('Mesocycles must be between 4 and 12 weeks.');
  }

  const nowIso = new Date().toISOString();
  const { error: deactivateError } = await supabase
    .from('mesocycles' as never)
    .update({ status: 'completed', updated_at: nowIso })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (deactivateError && !isMissingPeriodizationTableError(deactivateError)) {
    throw deactivateError;
  }

  const { data, error } = await supabase
    .from('mesocycles' as never)
    .insert({
      user_id: userId,
      name: input.name.trim(),
      goal_focus: input.goal_focus,
      protocol: input.protocol,
      start_date: input.start_date,
      duration_weeks: input.duration_weeks,
      status: 'active',
      notes: input.notes?.trim() ? input.notes.trim() : null,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (error || !data) {
    if (isMissingPeriodizationTableError(error)) {
      throw new Error('Periodization tables are missing. Apply the latest migration first.');
    }
    throw error ?? new Error('Failed to create mesocycle.');
  }

  const createdMesocycle = data as Mesocycle;

  if (input.protocol === 'occams') {
    await ensureOccamsProtocolSessions(userId, createdMesocycle.id, []);
  }

  return createdMesocycle;
};

export const createCustomMesocycleSession = async (
  userId: string,
  input: CreateCustomMesocycleSessionInput
): Promise<MesocycleSession> => {
  const { data: mesocycle, error: mesocycleError } = await supabase
    .from('mesocycles' as never)
    .select('id, user_id')
    .eq('id', input.mesocycle_id)
    .eq('user_id', userId)
    .single();

  if (mesocycleError || !mesocycle) {
    throw mesocycleError ?? new Error('Mesocycle not found.');
  }

  const { data: latestSession, error: latestSessionError } = await supabase
    .from('mesocycle_sessions' as never)
    .select('session_order')
    .eq('mesocycle_id', input.mesocycle_id)
    .order('session_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSessionError) throw latestSessionError;
  const nextOrder = ((latestSession?.session_order as number | undefined) ?? 0) + 1;

  const { data: insertedSession, error: insertSessionError } = await supabase
    .from('mesocycle_sessions' as never)
    .insert({
      mesocycle_id: input.mesocycle_id,
      name: input.name.trim(),
      session_order: nextOrder,
      session_focus: input.session_focus ?? null,
      sets_per_exercise: null,
      rep_range: null,
      progression_rule: null,
    })
    .select('*')
    .single();

  if (insertSessionError || !insertedSession) {
    throw insertSessionError ?? new Error('Failed to create custom session.');
  }

  return insertedSession as MesocycleSession;
};
