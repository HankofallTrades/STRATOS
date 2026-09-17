import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { buildNotificationPlan } from "@/domains/guidance/data/notificationPlan";
import {
  readNotificationPreferences,
  subscribeNotificationPreferences,
} from "@/domains/guidance/data/notificationPreferences";
import {
  ensureNotificationPermission,
  notificationsAvailable,
  onNotificationTapped,
  reconcileNotifications,
} from "@/domains/guidance/data/notificationScheduler";
import { usePeriodization } from "@/domains/periodization";
import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";

const warnPlannerFailure = (error: unknown): void => {
  if (!import.meta.env.DEV) return;
  console.warn("[notifications] re-plan failed", error);
};

/**
 * Keeps the device's local notifications in step with the plan. Re-plans
 * whenever an input changes — a finished workout lands in history, the
 * program or its training days change, the user edits reminder settings —
 * and on foreground, since reminders already fired or passed need rolling
 * forward. Native only: the web target has no local notifications.
 */
export const useNotificationPlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeProgram, isLoading } = usePeriodization(user?.id);
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  const preferences = useSyncExternalStore(
    subscribeNotificationPreferences,
    readNotificationPreferences
  );
  const enabled = notificationsAvailable() && !!user;

  const inputsRef = useRef({ activeProgram, workoutHistory, preferences });
  inputsRef.current = { activeProgram, workoutHistory, preferences };
  const runningRef = useRef<Promise<void>>(Promise.resolve());

  const replan = useCallback(() => {
    // Serialised so two quick re-plans cannot read the same pending list and
    // both schedule on top of it.
    runningRef.current = runningRef.current.then(async () => {
      try {
        const planned = buildNotificationPlan({
          now: new Date(),
          ...inputsRef.current,
        });
        // Ask for permission only once there is something to notify about;
        // an empty plan just clears whatever is left, with no prompt. A
        // denial clears too, so nothing scheduled before it lingers.
        const allowed =
          planned.length === 0 || (await ensureNotificationPermission());
        await reconcileNotifications(allowed ? planned : []);
      } catch (error) {
        warnPlannerFailure(error);
      }
    });
  }, []);

  useEffect(() => {
    // Don't clear the device's schedule off a program that simply hasn't
    // loaded yet.
    if (!enabled || isLoading) return;
    replan();
  }, [enabled, isLoading, activeProgram, workoutHistory, preferences, replan]);

  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isLoading) replan();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, isLoading, replan]);

  useEffect(() => {
    if (!notificationsAvailable()) return;
    let removed = false;
    let remove: (() => void) | null = null;
    void onNotificationTapped(() => navigate("/")).then((cleanup) => {
      if (removed) cleanup();
      else remove = cleanup;
    });
    return () => {
      removed = true;
      remove?.();
    };
  }, [navigate]);
};
