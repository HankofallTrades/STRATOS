import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchUserProfile } from "@/domains/account/data/accountRepository";
import {
  fetchRecentCompletedWeightedSetsForPr,
  fetchRecentWorkoutsSummary,
} from "@/domains/analytics/data/analyticsRepository";
import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import { useTriad, useHabitCompletions } from "@/domains/habits";
import { getHabitCompletionDates } from "@/domains/habits/data/repository";
import { usePeriodization } from "@/domains/periodization";
import type { SessionFocus } from "@/lib/types/workout";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  selectCurrentWorkout,
  startWorkout as startWorkoutAction,
} from "@/state/workout/workoutSlice";
import {
  calculateStreak,
  estimateSessionMinutes,
  formatEstimatedSessionLabel,
  formatLocalIsoDate,
  formatSessionFocusLabel,
  greetingFromHour,
  inferSessionLabel,
  isGenericSessionName,
  summarizeRecentPr,
  summarizeRecentWorkout,
} from "@/domains/dashboard/data/homeDashboard";

export const useHomeDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  const userId = user?.id;
  const now = new Date();
  const todayIso = useMemo(() => formatLocalIsoDate(new Date()), []);

  const { activeProgram } = usePeriodization(userId);
  const { habits } = useTriad(userId);
  const {
    completions,
    toggleCompletion,
    pendingIds,
    isLoading: isLoadingCompletions,
  } = useHabitCompletions(userId, todayIso);

  const movementHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === "movement") ?? null,
    [habits]
  );
  const meditationHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === "meditation") ?? null,
    [habits]
  );
  const writingHabit = useMemo(
    () => habits.find(habit => habit.title.toLowerCase() === "writing") ?? null,
    [habits]
  );

  const { data: profile } = useQuery({
    queryKey: ["homeProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      return fetchUserProfile(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentWorkouts = [], isLoading: isLoadingRecentWorkouts } = useQuery({
    queryKey: ["homeRecentWorkouts", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchRecentWorkoutsSummary(userId, 5);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { data: recentPrRows = [], isLoading: isLoadingPrRows } = useQuery({
    queryKey: ["homeRecentPrRows", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchRecentCompletedWeightedSetsForPr(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const lastSession = recentWorkouts[0] ?? null;
  const workoutLoggedToday = Boolean(
    lastSession && formatLocalIsoDate(new Date(lastSession.workout_created_at)) === todayIso
  );
  const workoutStartedToday = !!currentWorkout && currentWorkout.date.slice(0, 10) === todayIso;
  const workoutMovementDone = workoutStartedToday || workoutLoggedToday;

  const { data: movementStreak = 0 } = useQuery({
    queryKey: [
      "movementStreak",
      userId,
      movementHabit?.id,
      todayIso,
      currentWorkout?.id,
      lastSession?.workout_created_at,
    ],
    queryFn: async () => {
      if (!userId || !movementHabit?.id) return 0;
      const completionDates = await getHabitCompletionDates(userId, movementHabit.id, 365);
      return calculateStreak(completionDates, todayIso, workoutMovementDone);
    },
    enabled: !!userId && !!movementHabit?.id,
    staleTime: 60 * 1000,
  });

  const nextSession = useMemo(() => {
    if (!activeProgram) return null;
    const startableSessions = activeProgram.sessions.filter(
      session => session.exercises.length > 0
    );

    return (
      startableSessions.find(
        session => session.id === activeProgram.next_session_id
      ) ??
      startableSessions[0] ??
      null
    );
  }, [activeProgram]);

  const todayWorkoutExerciseNames = useMemo(
    () =>
      (nextSession?.exercises ?? [])
        .map(item => item.exercise?.name)
        .filter((value): value is string => !!value),
    [nextSession]
  );

  const todayExerciseCount = nextSession?.exercises.length ?? 0;
  const todayEstimatedMinutes = estimateSessionMinutes(
    todayExerciseCount,
    activeProgram?.mesocycle.protocol
  );
  const hasGenericSessionName = isGenericSessionName(nextSession?.name);
  const todayFocusLabel = activeProgram
    ? formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)
    : null;

  const todayWorkoutTitle = useMemo(() => {
    if (nextSession?.name && !hasGenericSessionName) return nextSession.name;
    if (todayWorkoutExerciseNames.length > 0) return inferSessionLabel(todayWorkoutExerciseNames);
    if (!activeProgram) return "Today's Session";
    return `${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} Session`;
  }, [activeProgram, hasGenericSessionName, nextSession?.name, todayWorkoutExerciseNames]);

  const todayWorkoutDetail = useMemo(() => {
    if (!nextSession) return "Ready when you are";

    const parts: string[] = [];

    if (hasGenericSessionName && todayFocusLabel && todayFocusLabel !== "Mixed") {
      parts.push(`${todayFocusLabel} focus`);
    }

    parts.push(formatEstimatedSessionLabel(todayEstimatedMinutes));
    return parts.join(" · ");
  }, [hasGenericSessionName, nextSession, todayEstimatedMinutes, todayFocusLabel]);

  const displayName = useMemo(() => {
    const username = profile?.username?.trim();
    if (username) return username;

    const metadataName =
      (user?.user_metadata?.first_name as string | undefined) ??
      (user?.user_metadata?.full_name as string | undefined) ??
      null;

    if (metadataName) {
      const first = metadataName.trim().split(/\s+/)[0];
      if (first) return first;
    }

    const emailPrefix = user?.email?.split("@")[0];
    return emailPrefix || "Athlete";
  }, [profile?.username, user?.user_metadata, user?.email]);

  const movementCompletionRecorded = movementHabit ? Boolean(completions[movementHabit.id]) : false;
  const movementDone = movementCompletionRecorded || workoutMovementDone;
  const meditationDone = meditationHabit ? Boolean(completions[meditationHabit.id]) : false;
  const writingDone = writingHabit ? Boolean(completions[writingHabit.id]) : false;
  const sessionActionLabel = workoutStartedToday ? "Resume Session" : "Begin Session";

  const movementAutoSyncKeyRef = useRef("");

  useEffect(() => {
    if (!movementHabit?.id || !userId) return;
    if (!workoutLoggedToday) return;
    if (movementCompletionRecorded) return;

    const syncKey = `${userId}:${movementHabit.id}:${todayIso}`;
    if (movementAutoSyncKeyRef.current === syncKey) return;

    movementAutoSyncKeyRef.current = syncKey;
    toggleCompletion(movementHabit.id, true);
  }, [
    movementCompletionRecorded,
    movementHabit?.id,
    toggleCompletion,
    todayIso,
    userId,
    workoutLoggedToday,
  ]);

  const recentPr = useMemo(
    () => summarizeRecentPr(recentPrRows, profile?.preferred_weight_unit),
    [recentPrRows, profile?.preferred_weight_unit]
  );

  const lastSessionSummary = useMemo(
    () => summarizeRecentWorkout(lastSession),
    [lastSession]
  );

  const handleToggleHabit = (habitId: string | undefined, completed: boolean) => {
    if (!habitId || !userId) return;
    toggleCompletion(habitId, !completed);
  };

  const habitItems = useMemo(
    () => [
      {
        id: movementHabit?.id,
        label: "Movement",
        done: movementDone,
        disabled:
          isLoadingCompletions ||
          !movementHabit ||
          !!(movementHabit && pendingIds[movementHabit.id]),
      },
      {
        id: meditationHabit?.id,
        label: "Meditation",
        done: meditationDone,
        disabled:
          isLoadingCompletions ||
          !meditationHabit ||
          !!(meditationHabit && pendingIds[meditationHabit.id]),
      },
      {
        id: writingHabit?.id,
        label: "Writing",
        done: writingDone,
        disabled:
          isLoadingCompletions ||
          !writingHabit ||
          !!(writingHabit && pendingIds[writingHabit.id]),
      },
    ],
    [
      isLoadingCompletions,
      meditationDone,
      meditationHabit,
      movementDone,
      movementHabit,
      pendingIds,
      writingDone,
      writingHabit,
    ]
  );

  const goToWorkout = async () => {
    if (currentWorkout) {
      navigate("/workout");
      return;
    }

    if (nextSession && activeProgram) {
      dispatch(
        startWorkoutAction({
          ownerUserId: user?.id ?? null,
          sessionFocus: (nextSession.session_focus ??
            activeProgram.mesocycle.goal_focus) as SessionFocus,
          mesocycleId: activeProgram.mesocycle.id,
          mesocycleSessionId: nextSession.id,
          mesocycleWeek: activeProgram.current_week,
          mesocycleProtocol: activeProgram.mesocycle.protocol,
          initialExercises: await buildExercisesFromSessionTemplate(nextSession, userId ?? ""),
        })
      );
      navigate("/workout");
      return;
    }

    dispatch(
      startWorkoutAction({
        ownerUserId: user?.id ?? null,
        sessionFocus: activeProgram?.mesocycle.goal_focus,
      })
    );
    navigate("/workout");
  };

  return {
    isLoadingLastSession: isLoadingRecentWorkouts,
    isLoadingRecentPr: isLoadingPrRows,
    displayName,
    greeting: greetingFromHour(now.getHours()),
    movementStreakLabel:
      movementStreak > 0 ? `${movementStreak}-day streak` : "Start your streak today",
    todayWorkoutTitle,
    todayWorkoutDetail,
    sessionActionLabel,
    lastSessionSummary,
    recentPr,
    habitItems,
    handleToggleHabit,
    goToWorkout,
  };
};
