import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import {
  createBaseWorkoutStartPayload,
  createProgramWorkoutStartPayload,
} from "@/domains/fitness/data/workoutStartPayload";
import { useTriad, useHabitCompletions } from "@/domains/habits";
import {
  fetchActiveMesocycleSummary,
  getActiveMesocycleProgram,
} from "@/domains/periodization/data/repository";
import type {
  ActiveMesocycleProgram,
  MesocycleSessionTemplate,
} from "@/domains/periodization";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import {
  selectCurrentWorkout,
  startWorkout as startWorkoutAction,
} from "@/state/workout/workoutSlice";
import { fetchHomeDashboardSnapshot } from "@/domains/dashboard/data/homeDashboard";
import {
  buildHomeModel,
  formatLocalIsoDate,
} from "@/domains/dashboard/data/homeModel";

// Orchestration only: gather the five sources (auth, redux workout,
// periodization, habits, snapshot query), feed them to the pure
// buildHomeModel, and keep the effects and handlers. All display derivation
// lives in data/homeModel.ts.
export const useHomeDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  const userId = user?.id;
  const hour = new Date().getHours();
  const todayIso = useMemo(() => formatLocalIsoDate(new Date()), []);

  const { habits } = useTriad(userId);
  const {
    completions,
    toggleCompletion,
    pendingIds,
    isLoading: isLoadingCompletions,
  } = useHabitCompletions(userId, todayIso);

  const movementHabitId = useMemo(
    () =>
      habits.find(habit => habit.title.toLowerCase() === "movement")?.id ?? null,
    [habits]
  );

  const { data: dashboardSnapshot, isLoading: isLoadingDashboardSnapshot } = useQuery({
    queryKey: ["homeDashboardSnapshot", userId],
    queryFn: async () => {
      if (!userId) return null;
      return fetchHomeDashboardSnapshot(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
  const {
    data: activeProgramSummary,
    isLoading: isLoadingProgramSummary,
  } = useQuery({
    queryKey: ["activeMesocycleSummary", userId],
    queryFn: async () => {
      if (!userId) return null;
      return fetchActiveMesocycleSummary(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const userMetadataName =
    (user?.user_metadata?.first_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    null;
  const userEmail = user?.email ?? null;

  const model = useMemo(
    () =>
      buildHomeModel({
        todayIso,
        hour,
        profile: dashboardSnapshot?.profile ?? null,
        userMetadataName,
        userEmail,
        recentWorkouts: dashboardSnapshot?.recentWorkouts ?? [],
        recentPrRows: dashboardSnapshot?.recentPrRows ?? [],
        movementCompletionDates: dashboardSnapshot?.movementCompletionDates ?? [],
        isLoadingSnapshot: isLoadingDashboardSnapshot,
        isLoadingProgramSummary,
        habits,
        completions,
        pendingIds,
        isLoadingCompletions,
        activeProgram: null,
        activeProgramSummary: activeProgramSummary ?? null,
        currentWorkout,
      }),
    [
      activeProgramSummary,
      completions,
      currentWorkout,
      dashboardSnapshot,
      habits,
      hour,
      isLoadingCompletions,
      isLoadingDashboardSnapshot,
      isLoadingProgramSummary,
      pendingIds,
      todayIso,
      userEmail,
      userMetadataName,
    ]
  );

  const { movementHabit } = model;

  const movementAutoSyncKeyRef = useRef("");

  useEffect(() => {
    if (!movementHabit?.id || !userId) return;
    if (!model.workoutLoggedToday) return;
    if (model.movementCompletionRecorded) return;

    const syncKey = `${userId}:${movementHabit.id}:${todayIso}`;
    if (movementAutoSyncKeyRef.current === syncKey) return;

    movementAutoSyncKeyRef.current = syncKey;
    toggleCompletion(movementHabit.id, true);
  }, [
    model.movementCompletionRecorded,
    model.workoutLoggedToday,
    movementHabit?.id,
    toggleCompletion,
    todayIso,
    userId,
  ]);

  const handleToggleHabit = (habitId: string | undefined, completed: boolean) => {
    if (!habitId || !userId) return;
    toggleCompletion(habitId, !completed);
  };

  const goToWorkout = async () => {
    if (currentWorkout) {
      navigate("/workout");
      return;
    }

    const startableProgram = await loadStartableProgram({
      activeProgramSummary: activeProgramSummary ?? null,
      queryClient,
      userId,
    });

    if (startableProgram) {
      const { activeProgram, nextSession } = startableProgram;
      dispatch(
        startWorkoutAction(
          createProgramWorkoutStartPayload({
            ownerUserId: user?.id ?? null,
            activeProgram,
            sessionTemplate: nextSession,
            initialExercises: await buildExercisesFromSessionTemplate(nextSession, userId ?? ""),
          })
        )
      );
      navigate("/workout");
      return;
    }

    // No active program: land on the idle Workout screen (Quick Start / block
    // builder) so the user can choose how to begin, rather than auto-starting an
    // empty workout that drops them straight into the raw exercise picker.
    if (!activeProgramSummary) {
      navigate("/workout");
      return;
    }

    dispatch(
      startWorkoutAction(
        createBaseWorkoutStartPayload({
          ownerUserId: user?.id ?? null,
          sessionFocus: activeProgramSummary.mesocycle.goal_focus,
        })
      )
    );
    navigate("/workout");
  };

  return {
    isLoadingLastSession: model.isLoadingLastSession,
    isLoadingTodayWorkout: model.isLoadingTodayWorkout,
    isLoadingRecentPr: model.isLoadingRecentPr,
    displayName: model.displayName,
    greeting: model.greeting,
    movementStreakLabel: model.movementStreakLabel,
    todayWorkoutTitle: model.todayWorkoutTitle,
    todayWorkoutDetail: model.todayWorkoutDetail,
    sessionActionLabel: model.sessionActionLabel,
    lastSessionSummary: model.lastSessionSummary,
    recentPr: model.recentPr,
    habitItems: model.habitItems,
    handleToggleHabit,
    goToWorkout,
  };
};

const findStartableProgramSession = (
  activeProgram: ActiveMesocycleProgram
): MesocycleSessionTemplate | null => {
  const templatedSessions = activeProgram.sessions.filter(
    session => session.exercises.length > 0
  );

  return (
    templatedSessions.find(
      session => session.id === activeProgram.next_session_id
    ) ??
    templatedSessions[0] ??
    null
  );
};

const loadStartableProgram = async ({
  activeProgramSummary,
  queryClient,
  userId,
}: {
  activeProgramSummary: Awaited<ReturnType<typeof fetchActiveMesocycleSummary>>;
  queryClient: QueryClient;
  userId: string | undefined;
}): Promise<{
  activeProgram: ActiveMesocycleProgram;
  nextSession: MesocycleSessionTemplate;
} | null> => {
  if (!activeProgramSummary || !userId) {
    return null;
  }

  const activeProgram = await queryClient.fetchQuery({
    queryKey: ["activeMesocycleProgram", userId],
    queryFn: () => getActiveMesocycleProgram(userId),
    staleTime: 60 * 1000,
  });
  const nextSession = activeProgram
    ? findStartableProgramSession(activeProgram)
    : null;

  if (!activeProgram || !nextSession) {
    return null;
  }

  return { activeProgram, nextSession };
};
