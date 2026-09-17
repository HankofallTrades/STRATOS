import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import {
  diffNotificationPlan,
  type PlannedNotification,
  type ScheduledNotification,
} from "@/domains/guidance/data/notificationPlan";

// Thin bridge over the Local Notifications plugin: marshals the plan across
// and nothing else. What should be scheduled is decided in notificationPlan.

export const notificationsAvailable = (): boolean =>
  Capacitor.isNativePlatform();

export const isNotificationPermissionDenied = async (): Promise<boolean> =>
  (await LocalNotifications.checkPermissions()).display === "denied";

/**
 * Whether scheduling may go ahead, asking first only if the user has never
 * been asked. Callers ask only once there is something worth notifying about,
 * so the system prompt never appears on first launch.
 */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  const { display } = await LocalNotifications.checkPermissions();
  if (display === "granted") return true;
  if (display === "denied") return false;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
};

const readScheduled = async (): Promise<ScheduledNotification[]> => {
  const { notifications } = await LocalNotifications.getPending();
  return notifications.map((notification) => ({
    id: notification.id,
    at: notification.schedule?.at ? new Date(notification.schedule.at) : null,
    title: notification.title,
    body: notification.body,
  }));
};

export const reconcileNotifications = async (
  planned: PlannedNotification[]
): Promise<void> => {
  const { cancel, schedule } = diffNotificationPlan({
    planned,
    scheduled: await readScheduled(),
  });

  if (cancel.length > 0) {
    await LocalNotifications.cancel({
      notifications: cancel.map((id) => ({ id })),
    });
  }
  if (schedule.length > 0) {
    await LocalNotifications.schedule({
      notifications: schedule.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        schedule: { at: notification.at },
        extra: { kind: notification.kind },
      })),
    });
  }
};

export const onNotificationTapped = async (
  handler: () => void
): Promise<() => void> => {
  const handle = await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    handler
  );
  return () => void handle.remove();
};
