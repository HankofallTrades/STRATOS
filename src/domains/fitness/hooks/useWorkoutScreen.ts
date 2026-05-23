import { useState } from "react";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { toast } from "@/hooks/use-toast";
import { usePeriodization } from "@/domains/periodization";
import type { MesocycleSessionTemplate } from "@/domains/periodization";
import {
  selectCurrentWorkout,
  startWorkout as startWorkoutAction,
  startWarmup,
  stopWarmup,
} from "@/state/workout/workoutSlice";
import { useAuth } from "@/state/auth/AuthProvider";
import { useWorkoutPersistence } from "@/domains/fitness/hooks/useWorkout";
import type { SessionFocus } from "@/lib/types/workout";
import { buildExercisesFromSessionTemplate } from "@/domains/fitness/data/workoutScreen";
import {
  createBaseWorkoutStartPayload,
  createProgramWorkoutStartPayload,
} from "@/domains/fitness/data/workoutStartPayload";

export const useWorkoutScreen = () => {
  const dispatch = useAppDispatch();
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

  const {
    activeProgram,
    isLoading: isLoadingMesocycle,
    createMesocycle,
    isCreatingMesocycle,
    createCustomSession,
    isCreatingCustomSession,
  } = usePeriodization(user?.id);
  const { saveWorkout, discardWorkout } = useWorkoutPersistence();

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
    dispatch(
      startWorkoutAction(
        createBaseWorkoutStartPayload({
          ownerUserId: user?.id ?? null,
          sessionFocus: selectedFocus || undefined,
        })
      )
    );
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

    dispatch(
      startWorkoutAction(
        createProgramWorkoutStartPayload({
          ownerUserId: user?.id ?? null,
          activeProgram,
          sessionTemplate,
          initialExercises: await buildExercisesFromSessionTemplate(sessionTemplate, user?.id ?? ""),
        })
      )
    );
  };

  const handleStartNextProtocolSession = () => {
    if (!nextProgramSession) return;
    handleStartProtocolSession(nextProgramSession);
  };

  const handleStartCustomMesocycleSession = async () => {
    if (!activeProgram) return;
    const resolvedSessionFocus =
      customSessionFocus ?? activeProgram.mesocycle.goal_focus;

    try {
      const createdSession = await createCustomSession({
        mesocycleId: activeProgram.mesocycle.id,
        sessionFocus: resolvedSessionFocus,
      });

      dispatch(
        startWorkoutAction({
          ownerUserId: user?.id ?? null,
          sessionFocus: resolvedSessionFocus,
          mesocycleId: activeProgram.mesocycle.id,
          mesocycleSessionId: createdSession.id,
          mesocycleWeek: activeProgram.current_week,
          mesocycleProtocol: activeProgram.mesocycle.protocol,
        })
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create custom session.";
      toast({
        title: "Could not start custom session",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEndWorkout = async () => {
    const hasCompletedSets = currentWorkout?.exercises.some(exercise =>
      exercise.sets.some(set => set.completed)
    );

    if (!hasCompletedSets) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    await saveWorkout();
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
