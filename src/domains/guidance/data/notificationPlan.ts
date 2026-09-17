import { addDays, isAfter, startOfDay } from "date-fns";

import type { ActiveMesocycleProgram } from "@/domains/periodization";
import type { Workout } from "@/lib/types/workout";

// Pure notification plan builder. Decides which local notifications ought to
// exist from already-fetched inputs — no React, react-query, Supabase or
// Capacitor plugin calls. The bridge (notificationScheduler) diffs this plan
// against what the device has scheduled and reconciles the difference.

export type NotificationKind = "session_reminder" | "missed_training";

export interface NotificationPreferences {
  enabled: boolean;
  /** Local wall-clock time, "HH:MM". */
  reminderTime: string;
}

export interface PlannedNotification {
  id: number;
  kind: NotificationKind;
  at: Date;
  title: string;
  body: string;
}

/** What the device reports as pending, normalised by the bridge. */
export interface ScheduledNotification {
  id: number;
  at: Date | null;
  title: string;
  body: string;
}

export interface NotificationPlanInputs {
  now: Date;
  activeProgram: ActiveMesocycleProgram | null;
  workoutHistory: Workout[];
  preferences: NotificationPreferences;
}

// Two weeks of reminders keeps well under iOS's 64 pending-notification cap
// and still covers a stretch without opening the app.
const REMINDER_HORIZON_DAYS = 14;
// A second miss can be at most two weeks out (one training day a week).
const MISSED_SEARCH_DAYS = 15;
const MISSES_BEFORE_NUDGE = 2;
const MISSED_NUDGE_HOUR = 20;
export const DEFAULT_REMINDER_TIME = "08:00";

// Ids are 32-bit ints on the native side: a kind prefix plus the local date
// (yyyymmdd) is unique per kind per day and stable across re-plans.
const ID_PREFIX: Record<NotificationKind, number> = {
  session_reminder: 100_000_000,
  missed_training: 200_000_000,
};

const notificationId = (kind: NotificationKind, day: Date): number =>
  ID_PREFIX[kind] +
  day.getFullYear() * 10_000 +
  (day.getMonth() + 1) * 100 +
  day.getDate();

const isoWeekday = (date: Date): number => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const REMINDER_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** A local wall-clock "HH:MM", as an `<input type="time">` produces it. */
export const isReminderTime = (value: unknown): value is string =>
  typeof value === "string" && REMINDER_TIME_PATTERN.test(value);

const parseReminderTime = (value: string) => {
  const [, hours, minutes] =
    REMINDER_TIME_PATTERN.exec(value) ??
    REMINDER_TIME_PATTERN.exec(DEFAULT_REMINDER_TIME)!;
  return { hours: Number(hours), minutes: Number(minutes) };
};

const atTime = (day: Date, hours: number, minutes: number): Date => {
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const parseLocalDate = (isoDate: string): Date =>
  startOfDay(new Date(`${isoDate.slice(0, 10)}T00:00:00`));

const lastWorkoutDay = (history: Workout[]): Date | null =>
  history.reduce<Date | null>((latest, workout) => {
    const day = startOfDay(new Date(workout.date));
    if (Number.isNaN(day.getTime())) return latest;
    return !latest || day > latest ? day : latest;
  }, null);

const sessionReminderBody = (sessionName: string | null): string =>
  sessionName?.trim()
    ? `${sessionName.trim()} is up next.`
    : "Today is a training day.";

export const buildNotificationPlan = ({
  now,
  activeProgram,
  workoutHistory,
  preferences,
}: NotificationPlanInputs): PlannedNotification[] => {
  if (!preferences.enabled || !activeProgram) return [];

  const trainingWeekdays = new Set(activeProgram.mesocycle.training_weekdays);
  if (trainingWeekdays.size === 0) return [];

  const isTrainingDay = (day: Date) => trainingWeekdays.has(isoWeekday(day));
  const today = startOfDay(now);
  const lastTrained = lastWorkoutDay(workoutHistory);
  const trainedToday = lastTrained?.getTime() === today.getTime();
  const { hours, minutes } = parseReminderTime(preferences.reminderTime);

  const plan: PlannedNotification[] = [];

  for (let offset = 0; offset < REMINDER_HORIZON_DAYS; offset += 1) {
    const day = addDays(today, offset);
    if (!isTrainingDay(day)) continue;
    if (offset === 0 && trainedToday) continue;

    const at = atTime(day, hours, minutes);
    if (!isAfter(at, now)) continue;

    plan.push({
      id: notificationId("session_reminder", day),
      kind: "session_reminder",
      at,
      title: "Training day",
      body: sessionReminderBody(activeProgram.next_session_name),
    });
  }

  // Misses are counted from the last session, but never from before the
  // program existed: a scheduled day before the block started was not missed.
  const dayBeforeStart = addDays(
    parseLocalDate(activeProgram.mesocycle.start_date),
    -1
  );
  const anchor =
    lastTrained && lastTrained > dayBeforeStart ? lastTrained : dayBeforeStart;

  let misses = 0;
  for (let offset = 1; offset <= MISSED_SEARCH_DAYS; offset += 1) {
    const day = addDays(anchor, offset);
    if (!isTrainingDay(day)) continue;
    misses += 1;
    if (misses < MISSES_BEFORE_NUDGE) continue;

    const at = atTime(day, MISSED_NUDGE_HOUR, 0);
    if (isAfter(at, now)) {
      plan.push({
        id: notificationId("missed_training", day),
        kind: "missed_training",
        at,
        title: "Two sessions missed",
        body: "Two training days have gone by without a session. A short one today gets you back on track.",
      });
    }
    break;
  }

  return plan;
};

const matches = (
  planned: PlannedNotification,
  scheduled: ScheduledNotification
): boolean =>
  scheduled.at?.getTime() === planned.at.getTime() &&
  scheduled.title === planned.title &&
  scheduled.body === planned.body;

/**
 * Reconcile a plan against what the device already has. A pending
 * notification that still matches the plan exactly is left alone, so running
 * this repeatedly neither duplicates nor churns; anything stale or changed is
 * cancelled, and anything missing or changed is scheduled.
 */
export const diffNotificationPlan = ({
  planned,
  scheduled,
}: {
  planned: PlannedNotification[];
  scheduled: ScheduledNotification[];
}): { cancel: number[]; schedule: PlannedNotification[] } => {
  const plannedById = new Map(planned.map((item) => [item.id, item]));
  const scheduledById = new Map(scheduled.map((item) => [item.id, item]));

  const cancel = scheduled
    .filter((item) => {
      const wanted = plannedById.get(item.id);
      return !wanted || !matches(wanted, item);
    })
    .map((item) => item.id);

  const schedule = planned.filter((item) => {
    const existing = scheduledById.get(item.id);
    return !existing || !matches(item, existing);
  });

  return { cancel, schedule };
};
