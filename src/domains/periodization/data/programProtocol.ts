// The Program protocol: the fixed templates a block can be built from, and the
// rules that turn a block into sessions and say where in it the user is. Pure —
// the periodization repository fetches and persists around it.
import type { MesocycleSession } from './types';
import type { Exercise, SessionFocus } from '@/lib/types/workout';

export interface OccamsSessionTemplateDefinition {
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

export interface ExistingExerciseTemplateDefinition {
  candidateNames: string[];
  presetEquipmentType?: string | null;
  presetVariation?: string | null;
  targetSets: number | null;
  targetReps: string | null;
  loadIncrementKg: number | null;
  notes: string | null;
}

export interface CustomSessionTemplateDefinition {
  name: string;
  sessionFocus: SessionFocus | null;
  setsPerExercise: number;
  repRange: string | null;
  progressionRule: string | null;
  exercises: ExistingExerciseTemplateDefinition[];
}

export const OCCAMS_TEMPLATE: OccamsSessionTemplateDefinition[] = [
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

export const HYPERTROPHY_TEMPLATE: CustomSessionTemplateDefinition[] = [
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

export const STRENGTH_TEMPLATE: CustomSessionTemplateDefinition[] = [
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


export type SessionExerciseRowPayload = {
  mesocycle_session_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number | null;
  target_reps: string | null;
  load_increment_kg: number | null;
  notes: string | null;
};

export const normalizeName = (value: string) => value.trim().toLowerCase();

export const customProtocolTemplate = (goalFocus: SessionFocus): CustomSessionTemplateDefinition[] =>
  goalFocus === "strength" ? STRENGTH_TEMPLATE : HYPERTROPHY_TEMPLATE;

// Week 1 runs from the start date; before the start it is still week 1, and past
// the end the block stays on its final week.
export const computeCurrentWeek = (startDateIso: string, durationWeeks: number, now: Date): number => {
  const start = new Date(startDateIso);
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedWeeks = Math.floor(Math.max(0, elapsedMs) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(durationWeeks, elapsedWeeks + 1);
};

// Sessions are taken in order, wrapping around. With nothing completed, or a last
// completed session the program no longer holds, the rotation starts over.
export const getNextSessionInRotation = <T extends { id: string }>(
  sessions: T[],
  lastCompletedSessionId: string | null
): T | null => {
  if (sessions.length === 0) return null;
  if (!lastCompletedSessionId) return sessions[0];

  const currentIndex = sessions.findIndex(session => session.id === lastCompletedSessionId);
  if (currentIndex < 0) return sessions[0];

  return sessions[(currentIndex + 1) % sessions.length];
};

export const templateSessionRow = (
  mesocycleId: string,
  sessionOrder: number,
  definition: OccamsSessionTemplateDefinition | CustomSessionTemplateDefinition
): Omit<MesocycleSession, 'id' | 'created_at'> => ({
  mesocycle_id: mesocycleId,
  name: definition.name,
  session_order: sessionOrder,
  session_focus: definition.sessionFocus,
  sets_per_exercise: definition.setsPerExercise,
  rep_range: definition.repRange,
  progression_rule: definition.progressionRule,
});

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

// Occam's exercises are resolved (and created if missing) by the repository;
// `exerciseIds` lines up with `definition.exercises`.
export const occamsSessionExerciseRows = (
  sessionId: string,
  definition: OccamsSessionTemplateDefinition,
  exerciseIds: string[]
): SessionExerciseRowPayload[] =>
  definition.exercises.map((templateExercise, exerciseIndex) => ({
    mesocycle_session_id: sessionId,
    exercise_id: exerciseIds[exerciseIndex],
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
  }));

export const customSessionExerciseRows = (
  sessionId: string,
  definition: CustomSessionTemplateDefinition,
  exerciseCatalog: Exercise[]
): SessionExerciseRowPayload[] =>
  definition.exercises.map((templateExercise, exerciseIndex) => {
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
      mesocycle_session_id: sessionId,
      exercise_id: resolvedExercise.id,
      exercise_order: exerciseIndex + 1,
      target_sets: templateExercise.targetSets,
      target_reps: templateExercise.targetReps,
      load_increment_kg: templateExercise.loadIncrementKg,
      notes: buildTemplateExerciseNotes(templateExercise),
    };
  });
