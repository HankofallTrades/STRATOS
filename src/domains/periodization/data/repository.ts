import { supabase } from '@/lib/integrations/supabase/client';
import type {
  ActiveMesocycleProgram,
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

interface OccamsSessionTemplateDefinition {
  name: string;
  sessionFocus: SessionFocus;
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

interface ExistingExerciseTemplateDefinition {
  candidateNames: string[];
  presetEquipmentType?: string | null;
  presetVariation?: string | null;
  targetSets: number | null;
  targetReps: string | null;
  loadIncrementKg: number | null;
  notes: string | null;
}

interface CustomSessionTemplateDefinition {
  name: string;
  sessionFocus: SessionFocus | null;
  setsPerExercise: number;
  repRange: string | null;
  progressionRule: string | null;
  exercises: ExistingExerciseTemplateDefinition[];
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
        canonicalName: 'Overhead Press',
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
        canonicalName: 'Bench Press',
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

const HYPERTROPHY_TEMPLATE: CustomSessionTemplateDefinition[] = [
  {
    name: 'Workout A',
    sessionFocus: null,
    setsPerExercise: 1,
    repRange: null,
    progressionRule: null,
    exercises: [
      {
        candidateNames: ['Squat', 'Back Squat'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Bench Press'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Row'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
    ],
  },
  {
    name: 'Workout B',
    sessionFocus: null,
    setsPerExercise: 1,
    repRange: null,
    progressionRule: null,
    exercises: [
      {
        candidateNames: ['Back Extension'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Overhead Press'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Pull-up', 'Pull Up', 'Pullups', 'Pull-Ups'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
    ],
  },
  {
    name: 'Workout C',
    sessionFocus: null,
    setsPerExercise: 1,
    repRange: null,
    progressionRule: null,
    exercises: [
      {
        candidateNames: ['Split Squat', 'Bulgarian Split Squat'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Bench Press'],
        presetEquipmentType: 'Barbell',
        presetVariation: 'Incline',
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
      {
        candidateNames: ['Wood Chop', 'Cable Wood Chop'],
        presetEquipmentType: null,
        presetVariation: null,
        targetSets: null,
        targetReps: null,
        loadIncrementKg: null,
        notes: null,
      },
    ],
  },
];


const STRENGTH_TEMPLATE: CustomSessionTemplateDefinition[] = [
  {
    name: 'Workout A',
    sessionFocus: 'strength',
    setsPerExercise: 3,
    repRange: '3-5',
    progressionRule: 'Add load when all sets hit 5 reps with clean technique and bar speed.',
    exercises: [
      { candidateNames: ['Squat', 'Back Squat'], targetSets: 3, targetReps: '3-5', loadIncrementKg: 2.5, notes: 'Primary lower-body strength lift.', presetEquipmentType: null, presetVariation: null },
      { candidateNames: ['Bench Press'], targetSets: 3, targetReps: '3-5', loadIncrementKg: 2.5, notes: 'Primary horizontal press.', presetEquipmentType: null, presetVariation: null },
      { candidateNames: ['Row'], targetSets: 3, targetReps: '5-8', loadIncrementKg: 2.5, notes: 'Heavy pull assistance.', presetEquipmentType: null, presetVariation: null },
    ],
  },
  {
    name: 'Workout B',
    sessionFocus: 'strength',
    setsPerExercise: 3,
    repRange: '3-5',
    progressionRule: 'Hold load until all primary sets reach top reps, then increase next exposure.',
    exercises: [
      { candidateNames: ['Deadlift', 'Romanian Deadlift'], targetSets: 3, targetReps: '3-5', loadIncrementKg: 5, notes: 'Primary hinge strength lift.', presetEquipmentType: null, presetVariation: null },
      { candidateNames: ['Overhead Press'], targetSets: 3, targetReps: '3-5', loadIncrementKg: 2.5, notes: 'Primary vertical press.', presetEquipmentType: null, presetVariation: null },
      { candidateNames: ['Pull-up', 'Pull Up', 'Pullups', 'Pull-Ups'], targetSets: 3, targetReps: '3-6', loadIncrementKg: 2.5, notes: 'Weighted if possible.', presetEquipmentType: null, presetVariation: null },
    ],
  },
  {
    name: 'Workout C',
    sessionFocus: 'strength',
    setsPerExercise: 3,
    repRange: '3-5',
    progressionRule: 'Use this day to reinforce weak points while keeping heavy intent.',
    exercises: [
      { candidateNames: ['Split Squat', 'Bulgarian Split Squat'], targetSets: 3, targetReps: '5-8', loadIncrementKg: 2.5, notes: 'Single-leg strength assistance.', presetEquipmentType: null, presetVariation: null },
      { candidateNames: ['Bench Press'], targetSets: 3, targetReps: '3-5', loadIncrementKg: 2.5, notes: 'Secondary bench exposure.', presetEquipmentType: 'Barbell', presetVariation: 'Incline' },
      { candidateNames: ['Wood Chop', 'Cable Wood Chop'], targetSets: 3, targetReps: '6-10', loadIncrementKg: 2.5, notes: 'Core strength and bracing.', presetEquipmentType: null, presetVariation: null },
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

const findExistingExerciseByCandidateNames = (
  exerciseCatalog: Exercise[],
  candidateNames: string[]
): Exercise | null => {
  for (const candidateName of candidateNames) {
    const normalizedCandidateName = normalizeName(candidateName);
    const match = exerciseCatalog.find(
      exercise => normalizeName(exercise.name) === normalizedCandidateName
    );

    if (match) {
      return match;
    }
  }

  return null;
};

const buildTemplateExerciseNotes = (
  templateExercise: ExistingExerciseTemplateDefinition
): string | null => {
  const preset: Record<string, string> = {};

  if (templateExercise.presetEquipmentType) {
    preset.equipmentType = templateExercise.presetEquipmentType;
  }

  if (templateExercise.presetVariation) {
    preset.variation = templateExercise.presetVariation;
  }

  const presetLine =
    Object.keys(preset).length > 0
      ? `__preset__:${JSON.stringify(preset)}`
      : null;

  return [templateExercise.notes?.trim() || null, presetLine]
    .filter((value): value is string => Boolean(value))
    .join('\n') || null;
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
        notes: buildTemplateExerciseNotes({
          candidateNames: [templateExercise.canonicalName],
          presetEquipmentType: templateExercise.targetEquipmentType,
          presetVariation: templateExercise.targetVariation,
          targetSets: templateExercise.targetSets,
          targetReps: templateExercise.targetReps,
          loadIncrementKg: templateExercise.loadIncrementKg,
          notes: templateExercise.notes,
        }),
      } : null;
    });

  const resolvedSessionExercises = await Promise.all(desiredSessionExercises);
  const desiredSessionExerciseRows = resolvedSessionExercises
      .filter((value): value is NonNullable<typeof value> => value !== null);

  await syncSessionExercises(sessionId, desiredSessionExerciseRows);
};

type SessionExerciseRowPayload = {
  mesocycle_session_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number | null;
  target_reps: string | null;
  load_increment_kg: number | null;
  notes: string | null;
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

  const desiredSessionExerciseRows = definition.exercises.map(
    (templateExercise, exerciseIndex) => {
      const resolvedExercise = findExistingExerciseByCandidateNames(
        exerciseCatalog,
        templateExercise.candidateNames
      );

      if (!resolvedExercise) {
        throw new Error(
          `Missing exercise for ${definition.name}: ${templateExercise.candidateNames.join(' / ')}`
        );
      }

      return {
        mesocycle_session_id: sessionId as string,
        exercise_id: resolvedExercise.id,
        exercise_order: exerciseIndex + 1,
        target_sets: templateExercise.targetSets,
        target_reps: templateExercise.targetReps,
        load_increment_kg: templateExercise.loadIncrementKg,
        notes: buildTemplateExerciseNotes(templateExercise),
      };
    }
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
  const template = goalFocus === "strength" ? STRENGTH_TEMPLATE : HYPERTROPHY_TEMPLATE;

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
  let sessions = await fetchSessionsForMesocycle(mesocycle.id);

  if (mesocycle.protocol === 'occams') {
    await ensureOccamsProtocolSessions(userId, mesocycle.id, sessions);
    sessions = await fetchSessionsForMesocycle(mesocycle.id);
  } else if (mesocycle.protocol === 'custom') {
    await ensureCustomProtocolSessions(mesocycle.id, mesocycle.goal_focus, sessions);
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
  return createMesocycleWithPreviousStatus(userId, input, 'completed');
};

export const resetMesocycle = async (
  userId: string,
  input: CreateMesocycleInput
): Promise<Mesocycle> => {
  return createMesocycleWithPreviousStatus(userId, input, 'cancelled');
};

const createMesocycleWithPreviousStatus = async (
  userId: string,
  input: CreateMesocycleInput,
  previousStatus: MesocycleStatus
): Promise<Mesocycle> => {
  if (input.duration_weeks < 4 || input.duration_weeks > 12) {
    throw new Error('Mesocycles must be between 4 and 12 weeks.');
  }

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
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentActiveError && !isMissingPeriodizationTableError(currentActiveError)) {
    throw currentActiveError;
  }
  const previousActiveMesocycleId = (currentActive?.id as string | undefined) ?? null;

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
