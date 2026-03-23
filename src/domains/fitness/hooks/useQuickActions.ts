import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAppDispatch } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice";
import { fetchLatestSingleExerciseLog } from "@/domains/fitness/data/fitnessRepository";

export const useQuickActions = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
  const [isSunExposureModalOpen, setIsSunExposureModalOpen] = useState(false);

  const { data: latestSingleLogData } = useQuery({
    queryKey: ["latestSingleLog", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return fetchLatestSingleExerciseLog(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddWorkout = () => {
    dispatch(startWorkoutAction({ ownerUserId: user?.id ?? null }));
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

  return {
    userId: user?.id ?? null,
    latestSingleLogData,
    isAddExerciseDialogOpen,
    isProteinModalOpen,
    isSunExposureModalOpen,
    setIsAddExerciseDialogOpen,
    setIsProteinModalOpen,
    setIsSunExposureModalOpen,
    handleAddWorkout,
    handleAddExercise,
    handleLogProtein,
    handleLogSunExposure,
  };
};
