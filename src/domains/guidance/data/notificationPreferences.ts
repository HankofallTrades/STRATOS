import {
  DEFAULT_REMINDER_TIME,
  isReminderTime,
  type NotificationPreferences,
} from "@/domains/guidance/data/notificationPlan";

// Device-local on purpose: local notifications are scheduled per device, so
// whether and when this phone reminds is a setting of this phone.

const STORAGE_KEY = "stratos.notifications.v1";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  reminderTime: DEFAULT_REMINDER_TIME,
};

const listeners = new Set<() => void>();
let cached: NotificationPreferences | null = null;

const parse = (raw: string | null): NotificationPreferences => {
  if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      enabled:
        typeof value.enabled === "boolean"
          ? value.enabled
          : DEFAULT_NOTIFICATION_PREFERENCES.enabled,
      reminderTime: isReminderTime(value.reminderTime)
        ? value.reminderTime
        : DEFAULT_NOTIFICATION_PREFERENCES.reminderTime,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
};

export const readNotificationPreferences = (): NotificationPreferences => {
  if (cached) return cached;
  try {
    cached = parse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    cached = DEFAULT_NOTIFICATION_PREFERENCES;
  }
  return cached;
};

export const writeNotificationPreferences = (
  next: NotificationPreferences
): void => {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable: the in-memory value still drives this run.
  }
  listeners.forEach((listener) => listener());
};

export const subscribeNotificationPreferences = (
  listener: () => void
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
