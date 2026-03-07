import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchUserProfile } from "@/domains/account/data/accountRepository";
import {
  fetchCompletedWeightedSetsForPr,
  fetchRecentWorkoutsSummary,
} from "@/domains/analytics/data/analyticsRepository";
import { useTriad, useHabitCompletions } from "@/domains/habits";
import { getHabitCompletionDates } from "@/domains/habits/data/repository";
import { usePeriodization } from "@/domains/periodization";
import { useAuth } from "@/state/auth/AuthProvider";
import { useAppSelector } from "@/hooks/redux";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";
import {
  calculateStreak,
  estimateSessionMinutes,
  formatLocalIsoDate,
  formatSessionFocusLabel,
  greetingFromHour,
  inferMuscleTagsFromExercises,
  summarizeRecentPr,
  summarizeRecentWorkout,
} from "@/domains/dashboard/data/homeDashboard";

export const useHomeDashboard = () => {
  const navigate = useNavigate();
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

  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ["homeRecentWorkouts", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchRecentWorkoutsSummary(userId, 5);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { data: recentPrRows = [] } = useQuery({
    queryKey: ["homeRecentPrRows", userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchCompletedWeightedSetsForPr(userId);
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
    return (
      activeProgram.sessions.find(session => session.id === activeProgram.next_session_id) ??
      activeProgram.sessions[0] ??
      null
    );
  }, [activeProgram]);

  const todayWorkoutTitle = useMemo(() => {
    if (!activeProgram) return "Today's Session";
    if (nextSession?.name) return nextSession.name;
    return `${formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)} Session`;
  }, [activeProgram, nextSession]);

  const todayWorkoutExerciseNames = useMemo(
    () =>
      (nextSession?.exercises ?? [])
        .map(item => item.exercise?.name)
        .filter((value): value is string => !!value),
    [nextSession]
  );

  const todayWorkoutMuscleTags = useMemo(() => {
    const inferred = inferMuscleTagsFromExercises(todayWorkoutExerciseNames);
    if (inferred.length > 0) return inferred;

    if (!activeProgram) return ["General"];
    return [formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)];
  }, [todayWorkoutExerciseNames, activeProgram]);

  const todayExerciseCount = nextSession?.exercises.length ?? 0;
  const todayEstimatedMinutes = estimateSessionMinutes(
    todayExerciseCount,
    activeProgram?.mesocycle.protocol
  );
  const todayFocusLabel = activeProgram
    ? formatSessionFocusLabel(activeProgram.mesocycle.goal_focus)
    : null;

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

  return {
    displayName,
    greeting: greetingFromHour(now.getHours()),
    movementStreakLabel:
      movementStreak > 0 ? `${movementStreak}-day streak` : "Start your streak today",
    todayWorkoutTitle,
    todayWorkoutMuscleTags,
    todayFocusLabel,
    todayEstimatedMinutes,
    todayExerciseCount,
    sessionActionLabel,
    lastSessionSummary,
    recentPr,
    habitItems,
    handleToggleHabit,
    goToWorkout: () => navigate("/workout"),
  };
};
