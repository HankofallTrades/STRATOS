import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";
import { fetchLatestSingleExerciseLog } from "@/domains/fitness/data/fitnessRepository";
import { startWorkoutSession } from "@/domains/fitness/data/workoutStart";

export const useQuickActions = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
  const [isSunExposureModalOpen, setIsSunExposureModalOpen] = useState(false);
  const [isBreathworkModalOpen, setIsBreathworkModalOpen] = useState(false);

  const { data: latestSingleLogData } = useQuery({
    queryKey: ["latestSingleLog", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return fetchLatestSingleExerciseLog(user.id);
    },
    enabled: !!user?.id && isAddExerciseDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddWorkout = async () => {
    // A workout already in progress is left alone; either way, go to it.
    await startWorkoutSession(
      { kind: "quick" },
      {
        dispatch,
        ownerUserId: user?.id ?? null,
        currentWorkoutId: currentWorkout?.id ?? null,
      }
    );
    navigate("/workout");
  };

  const handleAddExercise = () => {
    setIsAddExerciseDialogOpen(true);
  };

  const handleLogProtein = () => {
    setIsProteinModalOpen(true);
  };

  const handleLogSunExposure = () => {
    setIsSunExposureModalOpen(true);
  };

  const handleBreathwork = () => {
    setIsBreathworkModalOpen(true);
  };

  return {
    userId: user?.id ?? null,
    latestSingleLogData,
    isAddExerciseDialogOpen,
    isProteinModalOpen,
    isSunExposureModalOpen,
    isBreathworkModalOpen,
    setIsAddExerciseDialogOpen,
    setIsProteinModalOpen,
    setIsSunExposureModalOpen,
    setIsBreathworkModalOpen,
    handleAddWorkout,
    handleAddExercise,
    handleLogProtein,
    handleLogSunExposure,
    handleBreathwork,
  };
};
