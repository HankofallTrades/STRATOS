import type { RecentWorkoutSummary, CompletedWeightedSetForPr } from "@/domains/analytics/data/analyticsRepository";
import type { SessionFocus } from "@/lib/types/workout";
import { calculateOneRepMax } from "@/lib/utils/workoutUtils";

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

export const inferMuscleTagsFromExercises = (exerciseNames: string[]): string[] => {
  const tags = new Set<string>();

  for (const name of exerciseNames) {
    const normalized = name.toLowerCase();
    if (normalized.includes("pull") || normalized.includes("row")) tags.add("Back");
    if (normalized.includes("bicep") || normalized.includes("curl")) tags.add("Biceps");
    if (normalized.includes("rear delt")) tags.add("Rear Delts");
    if (normalized.includes("chest") || normalized.includes("bench")) tags.add("Chest");
    if (normalized.includes("shoulder") || normalized.includes("overhead")) tags.add("Shoulders");
    if (normalized.includes("tricep") || normalized.includes("pushdown")) tags.add("Triceps");
    if (normalized.includes("leg") || normalized.includes("squat")) tags.add("Legs");
  }

  return Array.from(tags).slice(0, 3);
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
