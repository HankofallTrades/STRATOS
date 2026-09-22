import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { toast } from "@/hooks/use-toast";
import { usePeriodization } from "@/domains/periodization";
import type { MesocycleSessionTemplate } from "@/domains/periodization";
import {
  selectCurrentWorkout,
  startWarmup,
  stopWarmup,
} from "@/state/workout/workoutSlice";
import { useAuth } from "@/state/auth/AuthProvider";
import { useWorkoutPersistence } from "@/domains/fitness/hooks/useWorkout";
import type { SessionFocus } from "@/lib/types/workout";
import { fetchExercises } from "@/domains/fitness/data/fitnessRepository";
import {
  startWorkoutSession,
  type WorkoutStartIntent,
} from "@/domains/fitness/data/workoutStart";

export const useWorkoutScreen = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();

  const [selectedFocus, setSelectedFocus] = useState<SessionFocus | null>(null);
  const [customSessionFocus, setCustomSessionFocus] = useState<SessionFocus | null>(null);
  const [mesocycleName, setMesocycleName] = useState("Hypertrophy Block");
  const [mesocycleDurationWeeks, setMesocycleDurationWeeks] = useState(6);
  const [mesocycleGoalFocus, setMesocycleGoalFocus] =
    useState<SessionFocus>("hypertrophy");
  const [mesocycleNotes, setMesocycleNotes] = useState("");
  const [showBlockBuilder, setShowBlockBuilder] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isCreatingCustomSession, setIsCreatingCustomSession] = useState(false);

  const {
    activeProgram,
    isLoading: isLoadingMesocycle,
    createMesocycle,
    isCreatingMesocycle,
  } = usePeriodization(user?.id);
  const { saveWorkout, discardWorkout } = useWorkoutPersistence();

  const startSession = (intent: WorkoutStartIntent) =>
    startWorkoutSession(intent, {
      dispatch,
      ownerUserId: user?.id ?? null,
      currentWorkoutId: currentWorkout?.id ?? null,
    });

  useEffect(() => {
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const prefetchExerciseCatalog = () => {
      void queryClient.prefetchQuery({
        queryKey: ["exercises"],
        queryFn: fetchExercises,
        staleTime: 5 * 60 * 1000,
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleCallbackId = window.requestIdleCallback(prefetchExerciseCatalog, {
        timeout: 1500,
      });
    } else {
      timeoutId = window.setTimeout(prefetchExerciseCatalog, 300);
    }

    return () => {
      if (
        idleCallbackId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [queryClient]);

  const templatedSessions =
    activeProgram?.sessions.filter(session => session.exercises.length > 0) ?? [];
  const nextProgramSession =
    templatedSessions.find(
      session => session.id === activeProgram?.next_session_id
    ) ??
    templatedSessions[0] ??
    null;
  const periodProgressValue = activeProgram
    ? Math.round(
        (activeProgram.current_week / activeProgram.mesocycle.duration_weeks) * 100
      )
    : 0;

  const handleStartWorkout = () => {
    void startSession({ kind: "quick", sessionFocus: selectedFocus || undefined });
  };

  const handleCreateMesocycle = async () => {
    const duration = Number(mesocycleDurationWeeks);
    if (!Number.isFinite(duration) || duration < 4 || duration > 12) {
      toast({
        title: "Invalid duration",
        description: "Mesocycles must be between 4 and 12 weeks.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMesocycle({
        name: mesocycleName.trim() || "Mesocycle",
        goal_focus: mesocycleGoalFocus,
        protocol: "custom",
        start_date: new Date().toISOString().split("T")[0],
        duration_weeks: duration,
        notes: mesocycleNotes.trim() || undefined,
      });
      toast({
        title: "Mesocycle created",
        description: "Your periodization block is ready.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create mesocycle.";
      toast({
        title: "Creation failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStartProtocolSession = async (
    sessionTemplate: MesocycleSessionTemplate
  ) => {
    if (!activeProgram) return;

    const outcome = await startSession({
      kind: "program-session",
      activeProgram,
      sessionTemplate,
    });
    if (outcome.status === "failed") {
      toast({
        title: "Could not start session",
        description:
          outcome.error instanceof Error
            ? outcome.error.message
            : "Failed to load the session's exercises.",
        variant: "destructive",
      });
    }
  };

  const handleStartNextProtocolSession = () => {
    if (!nextProgramSession) return;
    handleStartProtocolSession(nextProgramSession);
  };

  const handleStartCustomMesocycleSession = async () => {
    if (!activeProgram) return;

    setIsCreatingCustomSession(true);
    const outcome = await startSession({
      kind: "custom-session",
      activeProgram,
      sessionFocus: customSessionFocus ?? undefined,
    });
    setIsCreatingCustomSession(false);

    if (outcome.status === "failed") {
      toast({
        title: "Could not start custom session",
        description:
          outcome.error instanceof Error
            ? outcome.error.message
            : "Failed to create custom session.",
        variant: "destructive",
      });
      return;
    }
    if (outcome.status === "started" && outcome.createdSessionId) {
      // The program now has one more session; refetch it.
      void queryClient.invalidateQueries({
        queryKey: ["activeMesocycleProgram", user?.id],
      });
    }
  };

  const handleEndWorkout = async () => {
    // Whether the session has anything worth saving is not asked here, because
    // the answer is only true once the Activity Journal has been replayed: the
    // last set of a session is often the one logged from the lock screen, and
    // the rendered workout does not have it yet. Asking here offered to discard
    // exactly that session (I-39). `saveWorkout` decides on the far side of the
    // replay and says so.
    const outcome = await saveWorkout();

    if (outcome && "reason" in outcome && outcome.reason === "no_completed_sets") {
      setIsDiscardConfirmOpen(true);
    }
  };

  const handleConfirmDiscard = () => {
    discardWorkout();
    setIsDiscardConfirmOpen(false);
  };

  const handleStartWarmup = () => dispatch(startWarmup());
  const handleStopWarmup = () => dispatch(stopWarmup());

  return {
    currentWorkout,
    selectedFocus,
    customSessionFocus,
    mesocycleName,
    mesocycleDurationWeeks,
    mesocycleGoalFocus,
    mesocycleNotes,
    showBlockBuilder,
    isDiscardConfirmOpen,
    activeProgram,
    isLoadingMesocycle,
    isCreatingMesocycle,
    isCreatingCustomSession,
    nextProgramSession,
    periodProgressValue,
    setSelectedFocus,
    setCustomSessionFocus,
    setMesocycleName,
    setMesocycleDurationWeeks,
    setMesocycleGoalFocus,
    setMesocycleNotes,
    setShowBlockBuilder,
    setIsDiscardConfirmOpen,
    handleStartWorkout,
    handleCreateMesocycle,
    handleStartNextProtocolSession,
    handleStartCustomMesocycleSession,
    handleEndWorkout,
    handleConfirmDiscard,
    handleStartWarmup,
    handleStopWarmup,
  };
};
