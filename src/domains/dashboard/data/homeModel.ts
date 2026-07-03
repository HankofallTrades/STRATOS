import type { ProfileRow } from "@/domains/account/data/accountRepository";
import type {
  CompletedWeightedSetForPr,
  RecentWorkoutSummary,
} from "@/domains/analytics/data/analyticsRepository";
import type { HabitRow } from "@/domains/habits/data/types";
import type {
  ActiveMesocycleProgram,
  MesocycleSessionTemplate,
} from "@/domains/periodization";
import type { SessionFocus, Workout } from "@/lib/types/workout";
import { calculateOneRepMax } from "@/lib/utils/workoutUtils";

// Pure home-screen model. `buildHomeModel(inputs)` derives everything the
// dashboard displays from already-fetched inputs — no React, react-query,
// Redux, or Supabase (mirrors analytics' volumeProgress.ts seam). The hook
// (useHomeDashboard) fetches, feeds, and keeps only effects and handlers.

const E1RM_IMPROVEMENT_EPSILON = 0.001;
const GENERIC_SESSION_NAME_PATTERN = /^(workout|session|occam)\s+[a-z0-9]+$/i;

export interface RecentPrSummary {
  exerciseName: string;
  topSetWeightLabel: string;
  topSetReps: number;
  topSetRepsLabel: string;
  currentE1RMLabel: string;
  whenLabel: string;
}

export interface RecentWorkoutCardSummary {
  title: string;
  subtitle: string;
}

export const formatLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const daysAgoLabel = (isoDateTime: string): string => {
  const input = new Date(isoDateTime);
  const now = new Date();

  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInput = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const diffDays = Math.round((startOfNow.getTime() - startOfInput.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
};

export const greetingFromHour = (hour: number): string => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export const formatSessionFocusLabel = (focus: SessionFocus): string => {
  const labels: Record<SessionFocus, string> = {
    hypertrophy: "Hypertrophy",
    strength: "Strength",
    zone2: "Zone 2",
    zone5: "Zone 5",
    speed: "Speed",
    recovery: "Recovery",
    mixed: "Mixed",
  };
  return labels[focus];
};

export const estimateSessionMinutes = (
  exerciseCount: number,
  protocol?: "occams" | "custom"
): number => {
  if (exerciseCount <= 0) return 30;
  if (protocol === "occams") {
    return Math.max(20, exerciseCount * 8 + 8);
  }
  return Math.max(30, exerciseCount * 8 + 15);
};

export const inferSessionLabel = (exerciseNames: string[]): string => {
  const names = exerciseNames.map(name => name.toLowerCase());
  const isPull = names.some(name => name.includes("pull") || name.includes("row"));
  const isPush = names.some(name => name.includes("press") || name.includes("chest"));
  const isLower = names.some(
    name =>
      name.includes("leg") ||
      name.includes("squat") ||
      name.includes("lunge") ||
      name.includes("back extension")
  );

  if (isLower && (isPull || isPush)) return "Full Body";
  if (isLower) return "Lower Body";
  if (isPull && !isPush) return "Upper Body Pull";
  if (isPush && !isPull) return "Upper Body Push";
  if (isPull && isPush) return "Upper Body Mixed";
  return "Strength Session";
};

export const isGenericSessionName = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return GENERIC_SESSION_NAME_PATTERN.test(value.trim());
};

export const formatEstimatedSessionLabel = (minutes: number): string => {
  const normalized = Math.max(1, Math.round(minutes));
  return `About ${normalized} min`;
};

export const formatLiftWeight = (
  valueKg: number,
  preferredUnit: string | null | undefined
): string => {
  if ((preferredUnit ?? "").toLowerCase().includes("lb")) {
    const pounds = Math.round(valueKg * 2.20462);
    return `${pounds} lbs`;
  }

  const rounded = Number(valueKg.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
};

export const formatSessionDuration = (
  durationSeconds: number | null | undefined
): string => {
  const seconds = durationSeconds ?? 0;
  if (seconds <= 0) return "< 5 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 5) return "< 5 min";
  return `${minutes} min`;
};

export const formatReps = (value: number): string => {
  const normalized = Number(value.toFixed(1));
  return Number.isInteger(normalized) ? normalized.toFixed(0) : normalized.toFixed(1);
};

export const calculateStreak = (
  completionDates: string[],
  todayIso: string,
  includeToday: boolean
): number => {
  const dateSet = new Set(completionDates);
  const hasToday = includeToday || dateSet.has(todayIso);

  const getPrevDay = (iso: string): string => {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return formatLocalIsoDate(date);
  };

  let cursor = hasToday ? todayIso : getPrevDay(todayIso);
  let streak = 0;

  while (true) {
    if (cursor === todayIso && hasToday) {
      streak += 1;
      cursor = getPrevDay(cursor);
      continue;
    }

    if (!dateSet.has(cursor)) {
      break;
    }

    streak += 1;
    cursor = getPrevDay(cursor);
  }

  return streak;
};

export const summarizeRecentWorkout = (
  lastSession: RecentWorkoutSummary | null
): RecentWorkoutCardSummary | null => {
  if (!lastSession) return null;

  return {
    title: inferSessionLabel(lastSession.exercise_names),
    subtitle: `${daysAgoLabel(lastSession.workout_created_at)}  ·  ${formatSessionDuration(lastSession.duration_seconds)}`,
  };
};

export const summarizeRecentPr = (
  setRows: CompletedWeightedSetForPr[],
  preferredWeightUnit: string | null | undefined
): RecentPrSummary | null => {
  if (setRows.length === 0) return null;

  const bestPerWorkoutExercise = new Map<string, {
    exerciseId: string;
    exerciseName: string;
    workoutCreatedAt: string;
    maxE1RM: number;
    topSetWeightKg: number;
    topSetReps: number;
  }>();

  for (const row of setRows) {
    const weight = typeof row.weight === "number" ? row.weight : Number(row.weight);
    const reps = typeof row.reps === "number" ? row.reps : Number(row.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      continue;
    }

    const e1rm = calculateOneRepMax(weight, reps);
    if (!Number.isFinite(e1rm) || e1rm <= 0) continue;

    const key = `${row.exerciseId}:${row.workoutId}`;
    const existing = bestPerWorkoutExercise.get(key);

    if (!existing || e1rm > existing.maxE1RM) {
      bestPerWorkoutExercise.set(key, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName.trim() || "Exercise",
        workoutCreatedAt: row.workoutCreatedAt,
        maxE1RM: e1rm,
        topSetWeightKg: weight,
        topSetReps: reps,
      });
    }
  }

  const orderedPerformances = Array.from(bestPerWorkoutExercise.values()).sort(
    (a, b) =>
      new Date(a.workoutCreatedAt).getTime() - new Date(b.workoutCreatedAt).getTime()
  );

  const runningMaxByExercise = new Map<string, number>();
  let latestPrEvent: {
    exerciseName: string;
    workoutCreatedAt: string;
    maxE1RM: number;
    topSetWeightKg: number;
    topSetReps: number;
  } | null = null;

  for (const performance of orderedPerformances) {
    const previousMax = runningMaxByExercise.get(performance.exerciseId);

    if (
      previousMax !== undefined &&
      performance.maxE1RM > previousMax + E1RM_IMPROVEMENT_EPSILON
    ) {
      latestPrEvent = {
        exerciseName: performance.exerciseName,
        workoutCreatedAt: performance.workoutCreatedAt,
        maxE1RM: performance.maxE1RM,
        topSetWeightKg: performance.topSetWeightKg,
        topSetReps: performance.topSetReps,
      };
    }

    if (previousMax === undefined || performance.maxE1RM > previousMax) {
      runningMaxByExercise.set(performance.exerciseId, performance.maxE1RM);
    }
  }

  if (!latestPrEvent) return null;

  return {
    exerciseName: latestPrEvent.exerciseName,
    topSetWeightLabel: formatLiftWeight(latestPrEvent.topSetWeightKg, preferredWeightUnit),
    topSetReps: latestPrEvent.topSetReps,
    topSetRepsLabel: formatReps(latestPrEvent.topSetReps),
    currentE1RMLabel: formatLiftWeight(latestPrEvent.maxE1RM, preferredWeightUnit),
    whenLabel: daysAgoLabel(latestPrEvent.workoutCreatedAt),
  };
};

// ---------------------------------------------------------------------------
// The home model itself.

export interface HomeModelInputs {
  todayIso: string;
  hour: number;
  profile: ProfileRow | null;
  /** user_metadata first_name ?? full_name, if signed in. */
  userMetadataName: string | null;
  userEmail: string | null;
  recentWorkouts: RecentWorkoutSummary[];
  recentPrRows: CompletedWeightedSetForPr[];
  movementCompletionDates: string[];
  isLoadingSnapshot: boolean;
  habits: HabitRow[];
  completions: Record<string, boolean>;
  pendingIds: Record<string, boolean>;
  isLoadingCompletions: boolean;
  activeProgram: ActiveMesocycleProgram | null;
  currentWorkout: Workout | null;
}

export interface HomeHabitItem {
  id: string | undefined;
  label: string;
  done: boolean;
  disabled: boolean;
}

export interface HomeModel {
  // Display fields (returned to the screen as-is).
  displayName: string;
  greeting: string;
  movementStreakLabel: string;
  todayWorkoutTitle: string;
  todayWorkoutDetail: string;
  sessionActionLabel: string;
  lastSessionSummary: RecentWorkoutCardSummary | null;
  recentPr: RecentPrSummary | null;
  habitItems: HomeHabitItem[];
  isLoadingLastSession: boolean;
  isLoadingRecentPr: boolean;
  // Command inputs (the hook's effect and handlers read these).
  movementHabit: HabitRow | null;
  nextSession: MesocycleSessionTemplate | null;
  workoutLoggedToday: boolean;
  movementCompletionRecorded: boolean;
}

const findHabit = (habits: HabitRow[], title: string): HabitRow | null =>
  habits.find(habit => habit.title.toLowerCase() === title) ?? null;

export const buildHomeModel = (inputs: HomeModelInputs): HomeModel => {
  const {
    todayIso,
    hour,
    profile,
    userMetadataName,
    userEmail,
    recentWorkouts,
    recentPrRows,
    movementCompletionDates,
    isLoadingSnapshot,
    habits,
    completions,
    pendingIds,
    isLoadingCompletions,
    activeProgram,
    currentWorkout,
  } = inputs;

  const movementHabit = findHabit(habits, "movement");
  const meditationHabit = findHabit(habits, "meditation");
  const writingHabit = findHabit(habits, "writing");

  const lastSession = recentWorkouts[0] ?? null;
  const workoutLoggedToday = Boolean(
    lastSession &&
      formatLocalIsoDate(new Date(lastSession.workout_created_at)) === todayIso
  );
  const workoutStartedToday =
    !!currentWorkout && currentWorkout.date.slice(0, 10) === todayIso;
  const workoutMovementDone = workoutStartedToday || workoutLoggedToday;

  // Habits only load for a signed-in user, so their presence gates the streak.
  const movementStreak = movementHabit
    ? calculateStreak(movementCompletionDates, todayIso, workoutMovementDone)
    : 0;

  const startableSessions =
    activeProgram?.sessions.filter(session => session.exercises.length > 0) ?? [];
  const nextSession = activeProgram
    ? startableSessions.find(
        session => session.id === activeProgram.next_session_id
      ) ??
      startableSessions[0] ??
      null
    : null;

  const todayWorkoutExerciseNames = (nextSession?.exercises ?? [])
    .map(item => item.exercise?.name)
    .filter((value): value is string => !!value);

  const todayEstimatedMinutes = estimateSessionMinutes(
    nextSession?.exercises.length ?? 0,
    activeProgram?.mesocycle.protocol
  );
  const hasGenericSessionName = isGenericSessionName(nextSession?.name);
  const todayFocusLabel = activeProgram
    ? formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)
    : null;

  let todayWorkoutTitle: string;
  if (nextSession?.name && !hasGenericSessionName) {
    todayWorkoutTitle = nextSession.name;
  } else if (todayWorkoutExerciseNames.length > 0) {
    todayWorkoutTitle = inferSessionLabel(todayWorkoutExerciseNames);
  } else if (!activeProgram) {
    todayWorkoutTitle = "Today's Session";
  } else {
    todayWorkoutTitle = `${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} Session`;
  }

  let todayWorkoutDetail: string;
  if (!nextSession) {
    todayWorkoutDetail = "Ready when you are";
  } else {
    const parts: string[] = [];
    if (hasGenericSessionName && todayFocusLabel && todayFocusLabel !== "Mixed") {
      parts.push(`${todayFocusLabel} focus`);
    }
    parts.push(formatEstimatedSessionLabel(todayEstimatedMinutes));
    todayWorkoutDetail = parts.join(" · ");
  }

  const username = profile?.username?.trim();
  let displayName: string;
  if (username) {
    displayName = username;
  } else {
    const first = userMetadataName?.trim().split(/\s+/)[0];
    displayName = first || userEmail?.split("@")[0] || "Athlete";
  }

  const movementCompletionRecorded = movementHabit
    ? Boolean(completions[movementHabit.id])
    : false;
  const movementDone = movementCompletionRecorded || workoutMovementDone;
  const meditationDone = meditationHabit
    ? Boolean(completions[meditationHabit.id])
    : false;
  const writingDone = writingHabit ? Boolean(completions[writingHabit.id]) : false;

  const habitItem = (
    habit: HabitRow | null,
    label: string,
    done: boolean
  ): HomeHabitItem => ({
    id: habit?.id,
    label,
    done,
    disabled: isLoadingCompletions || !habit || !!(habit && pendingIds[habit.id]),
  });

  return {
    displayName,
    greeting: greetingFromHour(hour),
    movementStreakLabel:
      movementStreak > 0
        ? `${movementStreak}-day streak`
        : "Start your streak today",
    todayWorkoutTitle,
    todayWorkoutDetail,
    sessionActionLabel: workoutStartedToday ? "Resume Session" : "Begin Session",
    lastSessionSummary: summarizeRecentWorkout(lastSession),
    recentPr: summarizeRecentPr(recentPrRows, profile?.preferred_weight_unit),
    habitItems: [
      habitItem(movementHabit, "Movement", movementDone),
      habitItem(meditationHabit, "Meditation", meditationDone),
      habitItem(writingHabit, "Writing", writingDone),
    ],
    isLoadingLastSession: isLoadingSnapshot,
    isLoadingRecentPr: isLoadingSnapshot,
    movementHabit,
    nextSession,
    workoutLoggedToday,
    movementCompletionRecorded,
  };
};
