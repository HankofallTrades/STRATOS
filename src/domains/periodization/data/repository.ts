import { supabase } from '@/lib/integrations/supabase/client';
import type {
  ActiveMesocycleProgram,
  ActiveMesocycleSummary,
  CreateCustomMesocycleSessionInput,
  CreateMesocycleInput,
  DraftedProgramInput,
  Mesocycle,
  MesocycleProtocol,
  MesocycleStatus,
  MesocycleSession,
  MesocycleSessionExerciseWithExercise,
  MesocycleSessionTemplate,
  ProgramEditResult,
  ResolvedProgramEditOp,
  SaveDraftedProgramResult,
  SessionExerciseSnapshotRow,
} from './types';
import type { Exercise, SessionFocus } from '@/lib/types/workout';
import {
  computeCurrentWeek,
  customProtocolTemplate,
  customSessionExerciseRows,
  getNextSessionInRotation,
  normalizeName,
  OCCAMS_TEMPLATE,
  occamsSessionExerciseRows,
  templateSessionRow,
  type CustomSessionTemplateDefinition,
  type OccamsSessionTemplateDefinition,
  type SessionExerciseRowPayload,
} from './programProtocol';

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

const EXERCISE_SELECT_COLUMNS =
  'id, name, order, exercise_type, archetype_id, default_equipment_type, created_by_user_id, is_static';

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

const fetchSessionExerciseNames = async (sessionId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('mesocycle_session_exercises' as never)
    .select('exercises(name)')
    .eq('mesocycle_session_id', sessionId)
    .order('exercise_order', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Array<{ exercises?: { name?: string | null } | null }>;
  return rows
    .map(row => row.exercises?.name?.trim())
    .filter((value): value is string => Boolean(value));
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

  const sessionPayload = templateSessionRow(mesocycleId, sessionOrder, definition);

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

  const resolvedExercises = await Promise.all(
    definition.exercises.map(templateExercise =>
      ensureCanonicalExerciseForUser(
        userId,
        exerciseCatalog,
        templateExercise.canonicalName,
        templateExercise.targetEquipmentType,
        templateExercise.targetVariation
      )
    )
  );
  const desiredSessionExerciseRows = occamsSessionExerciseRows(
    sessionId,
    definition,
    resolvedExercises.map(exercise => exercise.id)
  );

  await syncSessionExercises(sessionId, desiredSessionExerciseRows);
};

const syncSessionExercises = async (
  sessionId: string,
  desiredSessionExerciseRows: SessionExerciseRowPayload[]
): Promise<void> => {
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

const upsertCustomProtocolSession = async (
  mesocycleId: string,
  sessionOrder: number,
  definition: CustomSessionTemplateDefinition,
  exerciseCatalog: Exercise[],
  existingSession: MesocycleSession | null
): Promise<void> => {
  let sessionId = existingSession?.id ?? null;

  const sessionPayload = templateSessionRow(mesocycleId, sessionOrder, definition);

  if (!sessionId) {
    const { data: insertedSession, error: insertSessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .insert(sessionPayload)
      .select('*')
      .single();

    if (insertSessionError || !insertedSession) {
      throw insertSessionError ?? new Error('Failed to create custom session template.');
    }

    sessionId = insertedSession.id as string;
  } else {
    const { error: updateSessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .update(sessionPayload)
      .eq('id', sessionId);

    if (updateSessionError) throw updateSessionError;
  }

  const desiredSessionExerciseRows = customSessionExerciseRows(
    sessionId,
    definition,
    exerciseCatalog
  );

  await syncSessionExercises(sessionId, desiredSessionExerciseRows);
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

const ensureCustomProtocolSessions = async (
  mesocycleId: string,
  goalFocus: SessionFocus,
  existingSessions: MesocycleSession[]
): Promise<void> => {
  const exercises = await fetchExerciseCatalog();
  const existingByName = new Map(existingSessions.map(session => [normalizeName(session.name), session]));
  const template = customProtocolTemplate(goalFocus);

  for (let index = 0; index < template.length; index += 1) {
    const definition = template[index];
    await upsertCustomProtocolSession(
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
  const sessions = await fetchSessionsForMesocycle(mesocycle.id);

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
    current_week: computeCurrentWeek(mesocycle.start_date, mesocycle.duration_weeks, new Date()),
    last_completed_session_id: lastCompletedSessionId,
    next_session_id: nextSession?.id ?? null,
    next_session_name: nextSession?.name ?? null,
  };
};

export const fetchActiveMesocycleSummary = async (
  userId: string
): Promise<ActiveMesocycleSummary | null> => {
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
  const sessions = await fetchSessionsForMesocycle(mesocycle.id);
  const lastCompletedSessionId = await fetchLastCompletedSessionId(userId, mesocycle.id);
  const nextSession = getNextSessionInRotation(sessions, lastCompletedSessionId);
  const nextSessionExerciseNames = nextSession
    ? await fetchSessionExerciseNames(nextSession.id)
    : [];

  return {
    mesocycle,
    current_week: computeCurrentWeek(mesocycle.start_date, mesocycle.duration_weeks, new Date()),
    last_completed_session_id: lastCompletedSessionId,
    next_session_id: nextSession?.id ?? null,
    next_session_name: nextSession?.name ?? null,
    next_session_focus: nextSession?.session_focus ?? null,
    next_session_exercise_count: nextSessionExerciseNames.length,
    next_session_exercise_names: nextSessionExerciseNames,
  };
};

export const createMesocycle = async (
  userId: string,
  input: CreateMesocycleInput
): Promise<Mesocycle> => {
  return createMesocycleWithPreviousStatus(userId, input, 'completed');
};

export const resetMesocycle = async (
  userId: string,
  input: CreateMesocycleInput
): Promise<Mesocycle> => {
  return createMesocycleWithPreviousStatus(userId, input, 'cancelled');
};

// Training days describe when the user trains, not a particular block, so a
// new block starts on the schedule the one it replaces was on.
const fetchActiveTrainingWeekdays = async (userId: string): Promise<number[]> => {
  const { data, error } = await supabase
    .from('mesocycles' as never)
    .select('training_weekdays')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingPeriodizationTableError(error)) return [];
    throw error;
  }
  return ((data as { training_weekdays?: number[] } | null)?.training_weekdays) ?? [];
};

export const updateMesocycleTrainingWeekdays = async (
  userId: string,
  mesocycleId: string,
  trainingWeekdays: number[]
): Promise<void> => {
  const normalized = [...new Set(trainingWeekdays)]
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);

  const { error } = await supabase
    .from('mesocycles' as never)
    .update({ training_weekdays: normalized, updated_at: new Date().toISOString() } as never)
    .eq('id', mesocycleId)
    .eq('user_id', userId);

  if (error) throw error;
};

const createMesocycleWithPreviousStatus = async (
  userId: string,
  input: CreateMesocycleInput,
  previousStatus: MesocycleStatus
): Promise<Mesocycle> => {
  if (input.duration_weeks < 4 || input.duration_weeks > 12) {
    throw new Error('Mesocycles must be between 4 and 12 weeks.');
  }

  const trainingWeekdays = await fetchActiveTrainingWeekdays(userId);

  const nowIso = new Date().toISOString();
  const { error: deactivateError } = await supabase
    .from('mesocycles' as never)
    .update({ status: previousStatus, updated_at: nowIso })
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
      training_weekdays: trainingWeekdays,
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
  } else if (input.protocol === 'custom') {
    await ensureCustomProtocolSessions(createdMesocycle.id, createdMesocycle.goal_focus, []);
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

const fetchSessionExerciseSnapshot = async (
  sessionIds: string[]
): Promise<SessionExerciseSnapshotRow[]> => {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('mesocycle_session_exercises' as never)
    .select('id, mesocycle_session_id, exercise_id, exercise_order, target_sets, target_reps, load_increment_kg, notes')
    .in('mesocycle_session_id', sessionIds)
    .order('exercise_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionExerciseSnapshotRow[];
};

export const saveDraftedProgram = async (
  userId: string,
  draft: DraftedProgramInput
): Promise<SaveDraftedProgramResult> => {
  if (draft.durationWeeks < 4 || draft.durationWeeks > 12) {
    throw new Error('Mesocycles must be between 4 and 12 weeks.');
  }
  if (draft.sessions.length === 0) {
    throw new Error('A drafted program needs at least one session.');
  }
  if (draft.sessions.some(session => session.exercises.length === 0)) {
    throw new Error('Every drafted session needs at least one exercise.');
  }

  const { data: currentActive, error: currentActiveError } = await supabase
    .from('mesocycles' as never)
    .select('id, training_weekdays')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentActiveError && !isMissingPeriodizationTableError(currentActiveError)) {
    throw currentActiveError;
  }
  const previousActiveMesocycleId = (currentActive?.id as string | undefined) ?? null;
  const trainingWeekdays =
    (currentActive as { training_weekdays?: number[] } | null)?.training_weekdays ?? [];

  const nowIso = new Date().toISOString();
  if (previousActiveMesocycleId) {
    const { error: deactivateError } = await supabase
      .from('mesocycles' as never)
      .update({ status: 'completed', updated_at: nowIso })
      .eq('id', previousActiveMesocycleId)
      .eq('user_id', userId);
    if (deactivateError) throw deactivateError;
  }

  const { data: insertedMesocycle, error: insertError } = await supabase
    .from('mesocycles' as never)
    .insert({
      user_id: userId,
      name: draft.name.trim(),
      goal_focus: draft.goalFocus,
      protocol: 'coach',
      start_date: nowIso.slice(0, 10),
      duration_weeks: draft.durationWeeks,
      status: 'active',
      notes: draft.notes?.trim() ? draft.notes.trim() : null,
      training_weekdays: trainingWeekdays,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (insertError || !insertedMesocycle) {
    throw insertError ?? new Error('Failed to create the drafted program.');
  }
  const mesocycle = insertedMesocycle as Mesocycle;

  for (let sessionIndex = 0; sessionIndex < draft.sessions.length; sessionIndex += 1) {
    const session = draft.sessions[sessionIndex];
    const { data: insertedSession, error: sessionError } = await supabase
      .from('mesocycle_sessions' as never)
      .insert({
        mesocycle_id: mesocycle.id,
        name: session.name.trim(),
        session_order: sessionIndex + 1,
        session_focus: session.sessionFocus,
        sets_per_exercise: session.setsPerExercise,
        rep_range: session.repRange,
        progression_rule: session.progressionRule,
      })
      .select('id')
      .single();

    if (sessionError || !insertedSession) {
      throw sessionError ?? new Error(`Failed to create session "${session.name}".`);
    }

    const sessionId = (insertedSession as { id: string }).id;
    const exerciseRows = session.exercises.map((exercise, exerciseIndex) => ({
      mesocycle_session_id: sessionId,
      exercise_id: exercise.exerciseId,
      exercise_order: exerciseIndex + 1,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      load_increment_kg: exercise.loadIncrementKg,
      notes: exercise.notes,
    }));

    const { error: exercisesError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .insert(exerciseRows);
    if (exercisesError) throw exercisesError;
  }

  return { mesocycle, previousActiveMesocycleId };
};

export const applyProgramEdits = async (
  userId: string,
  mesocycleId: string,
  ops: ResolvedProgramEditOp[]
): Promise<ProgramEditResult> => {
  if (ops.length === 0) throw new Error('No program edits to apply.');

  const { data: mesocycleRow, error: mesocycleError } = await supabase
    .from('mesocycles' as never)
    .select('id, protocol')
    .eq('id', mesocycleId)
    .eq('user_id', userId)
    .single();

  if (mesocycleError || !mesocycleRow) {
    throw mesocycleError ?? new Error('Program not found.');
  }
  const protocolBefore = (mesocycleRow as { protocol: MesocycleProtocol }).protocol;

  const sessionIds = Array.from(new Set(ops.map(op => op.sessionId)));
  const snapshot = await fetchSessionExerciseSnapshot(sessionIds);

  const nextOrderBySession = new Map<string, number>();
  for (const sessionId of sessionIds) {
    const maxOrder = snapshot
      .filter(row => row.mesocycle_session_id === sessionId)
      .reduce((max, row) => Math.max(max, row.exercise_order), 0);
    nextOrderBySession.set(sessionId, maxOrder + 1);
  }

  for (const op of ops) {
    if (op.op === 'replace_exercise') {
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .update({ exercise_id: op.newExerciseId })
        .eq('id', op.rowId);
      if (error) throw error;
    } else if (op.op === 'add_exercise') {
      const order = nextOrderBySession.get(op.sessionId) ?? 1;
      nextOrderBySession.set(op.sessionId, order + 1);
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .insert({
          mesocycle_session_id: op.sessionId,
          exercise_id: op.exerciseId,
          exercise_order: order,
          target_sets: op.targetSets,
          target_reps: op.targetReps,
          load_increment_kg: null,
          notes: null,
        });
      if (error) throw error;
    } else if (op.op === 'remove_exercise') {
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .delete()
        .eq('id', op.rowId);
      if (error) throw error;
    } else {
      const updates: Record<string, unknown> = {};
      if (typeof op.targetSets !== 'undefined') updates.target_sets = op.targetSets;
      if (typeof op.targetReps !== 'undefined') updates.target_reps = op.targetReps;
      if (typeof op.loadIncrementKg !== 'undefined') updates.load_increment_kg = op.loadIncrementKg;
      if (Object.keys(updates).length === 0) continue;
      const { error } = await supabase
        .from('mesocycle_session_exercises' as never)
        .update(updates)
        .eq('id', op.rowId);
      if (error) throw error;
    }
  }

  if (protocolBefore !== 'coach') {
    const { error } = await supabase
      .from('mesocycles' as never)
      .update({ protocol: 'coach', updated_at: new Date().toISOString() })
      .eq('id', mesocycleId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  return { snapshot, protocolBefore };
};

export const revertProgramCreation = async (
  userId: string,
  payload: { mesocycleId: string; previousActiveMesocycleId: string | null }
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const { error: cancelError } = await supabase
    .from('mesocycles' as never)
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('id', payload.mesocycleId)
    .eq('user_id', userId);
  if (cancelError) throw cancelError;

  if (payload.previousActiveMesocycleId) {
    const { error: restoreError } = await supabase
      .from('mesocycles' as never)
      .update({ status: 'active', updated_at: nowIso })
      .eq('id', payload.previousActiveMesocycleId)
      .eq('user_id', userId);
    if (restoreError) throw restoreError;
  }
};

export const revertProgramEdits = async (
  userId: string,
  payload: {
    mesocycleId: string;
    snapshot: SessionExerciseSnapshotRow[];
    protocolBefore: MesocycleProtocol;
  }
): Promise<void> => {
  const { data: mesocycleRow, error: mesocycleError } = await supabase
    .from('mesocycles' as never)
    .select('id')
    .eq('id', payload.mesocycleId)
    .eq('user_id', userId)
    .single();
  if (mesocycleError || !mesocycleRow) {
    throw mesocycleError ?? new Error('Program not found.');
  }

  const sessionIds = Array.from(
    new Set(payload.snapshot.map(row => row.mesocycle_session_id))
  );

  for (const sessionId of sessionIds) {
    const { error: deleteError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .delete()
      .eq('mesocycle_session_id', sessionId);
    if (deleteError) throw deleteError;
  }

  if (payload.snapshot.length > 0) {
    const { error: insertError } = await supabase
      .from('mesocycle_session_exercises' as never)
      .insert(payload.snapshot.map(row => ({ ...row })));
    if (insertError) throw insertError;
  }

  if (payload.protocolBefore !== 'coach') {
    const { error: protocolError } = await supabase
      .from('mesocycles' as never)
      .update({ protocol: payload.protocolBefore, updated_at: new Date().toISOString() })
      .eq('id', payload.mesocycleId)
      .eq('user_id', userId);
    if (protocolError) throw protocolError;
  }
};
