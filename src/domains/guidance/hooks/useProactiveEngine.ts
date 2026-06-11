import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

import { fetchWeeklyArchetypeSets } from "@/domains/analytics/data/analyticsRepository";
import {
  buildVolumeProgressDisplayData,
  getCurrentWeekRange,
} from "@/domains/analytics/hooks/useVolumeChart";
import {
  cooldownKey,
  isSuppressed,
  suppress,
} from "@/domains/guidance/data/proactiveCooldowns";
import {
  deriveProactiveInsights,
  type ProactiveInsight,
  type ProactiveTrigger,
} from "@/domains/guidance/data/proactiveGates";
import { getActiveMesocycleProgram } from "@/domains/periodization/data/repository";
import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectWorkoutHistory } from "@/state/history/historySlice";
import {
  selectCurrentWorkout,
  selectIsWorkoutActive,
} from "@/state/workout/workoutSlice";

interface UseProactiveEngineParams {
  summon: () => void;
  send: (text?: string) => Promise<void>;
  isOpen: boolean;
  isLoading: boolean;
}

export const useProactiveEngine = ({
  summon,
  send,
  isOpen,
  isLoading,
}: UseProactiveEngineParams) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuth();
  const workoutHistory = useAppSelector(selectWorkoutHistory);
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const userId = user?.id ?? null;

  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const workoutHistoryRef = useRef(workoutHistory);
  workoutHistoryRef.current = workoutHistory;

  const runGates = useCallback(
    async (trigger: ProactiveTrigger, finishedWorkoutId?: string | null) => {
      if (!userId) return;
      try {
        const weekRange = getCurrentWeekRange();
        const [activeProgram, weeklySets] = await Promise.all([
          queryClient.ensureQueryData({
            queryKey: ["activeMesocycleProgram", userId],
            queryFn: () => getActiveMesocycleProgram(userId),
            staleTime: 60 * 1000,
          }),
          queryClient.ensureQueryData({
            queryKey: [
              "weeklyArchetypeSets_v2",
              userId,
              weekRange.start,
              weekRange.end,
            ],
            queryFn: () =>
              fetchWeeklyArchetypeSets(userId, weekRange.start, weekRange.end),
            staleTime: 5 * 60 * 1000,
          }),
        ]);

        const derived = deriveProactiveInsights({
          trigger,
          now: new Date(),
          activeProgram,
          workoutHistory: workoutHistoryRef.current,
          volumeProgress: buildVolumeProgressDisplayData(weeklySets),
          finishedWorkoutId: finishedWorkoutId ?? null,
        }).filter(
          (insight) =>
            !isSuppressed(userId, cooldownKey(insight.id, insight.dedupeKey))
        );

        setInsights((previous) =>
          trigger === "app_open"
            ? derived
            : [
                ...derived,
                ...previous.filter(
                  (existing) =>
                    !derived.some((incoming) => incoming.id === existing.id)
                ),
              ]
        );
      } catch {
        // Proactivity must never surface an error state.
      }
    },
    [queryClient, userId]
  );

  // App open: once per authenticated mount.
  const ranInitialRef = useRef(false);
  useEffect(() => {
    if (!userId || ranInitialRef.current) return;
    ranInitialRef.current = true;
    void runGates("app_open");
  }, [userId, runGates]);

  // Re-check when navigating to home (cooldowns keep this quiet).
  const previousPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === "/" && previousPathRef.current !== "/") {
      void runGates("app_open");
    }
    previousPathRef.current = location.pathname;
  }, [location.pathname, runGates]);

  // Workout finished: true -> false edge of the active-workout flag.
  const previousWorkoutRef = useRef<{ active: boolean; id: string | null }>({
    active: isWorkoutActive,
    id: currentWorkout?.id ?? null,
  });
  useEffect(() => {
    const previous = previousWorkoutRef.current;
    if (previous.active && !isWorkoutActive && previous.id) {
      void runGates("workout_finished", previous.id);
    }
    previousWorkoutRef.current = {
      active: isWorkoutActive,
      id: currentWorkout?.id ?? null,
    };
  }, [isWorkoutActive, currentWorkout?.id, runGates]);

  // Opening the surface counts as "the user looked": clear pulse-only insights.
  useEffect(() => {
    if (isOpen) {
      setInsights((previous) =>
        previous.filter((insight) => insight.tier === "peek")
      );
    }
  }, [isOpen]);

  const engageInsight = useCallback(
    (insight: ProactiveInsight) => {
      if (!userId || isLoading) return;
      suppress(
        userId,
        cooldownKey(insight.id, insight.dedupeKey),
        insight.cooldownHours
      );
      setInsights((previous) =>
        previous.filter((existing) => existing.id !== insight.id)
      );
      summon();
      void send(insight.seedPrompt);
    },
    [isLoading, send, summon, userId]
  );

  const dismissInsight = useCallback(
    (insight: ProactiveInsight) => {
      if (!userId) return;
      suppress(
        userId,
        cooldownKey(insight.id, insight.dedupeKey),
        insight.cooldownHours
      );
      setInsights((previous) =>
        previous.filter((existing) => existing.id !== insight.id)
      );
    },
    [userId]
  );

  return { insights, engageInsight, dismissInsight };
};
