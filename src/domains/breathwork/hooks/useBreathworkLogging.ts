import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  addExerciseToWorkout,
  selectIsWorkoutActive,
} from "@/state/workout/workoutSlice";
import {
  fetchExercises,
  saveSingleExerciseLog,
} from "@/domains/fitness/data/fitnessRepository";
import type { Exercise } from "@/lib/types/workout";

import {
  buildBreathworkWorkoutExercise,
  findBreathworkExercise,
} from "../data/logging";
import type { BreathworkProtocol } from "../data/protocols";

export type BreathworkLogDestination = "workout" | "standalone";

export interface BreathworkLogResult {
  destination: BreathworkLogDestination;
}

export const useBreathworkLogging = (): {
  logSession: (
    protocol: BreathworkProtocol,
    elapsedSeconds: number
  ) => Promise<BreathworkLogResult>;
  isLogging: boolean;
} => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);
  const [isLogging, setIsLogging] = useState(false);

  const { data: exercises = [] } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => (await fetchExercises()) as Exercise[],
    staleTime: Infinity,
  });

  const logSession = useCallback(
    async (
      protocol: BreathworkProtocol,
      elapsedSeconds: number
    ): Promise<BreathworkLogResult> => {
      const exercise = findBreathworkExercise(exercises, protocol.exerciseName);
      if (!exercise) {
        toast({
          title: "Couldn't log breathwork",
          description: `"${protocol.exerciseName}" is missing from the exercise catalog — apply the latest database migration.`,
          variant: "destructive",
        });
        throw new Error(`Breathwork exercise not found: ${protocol.exerciseName}`);
      }

      if (isWorkoutActive) {
        dispatch(
          addExerciseToWorkout(buildBreathworkWorkoutExercise(exercise, elapsedSeconds))
        );
        toast({ title: "Added to workout" });
        return { destination: "workout" };
      }

      if (!user?.id) {
        toast({
          title: "Couldn't log breathwork",
          description: "You need to be signed in.",
          variant: "destructive",
        });
        throw new Error("No authenticated user for breathwork log");
      }

      setIsLogging(true);
      try {
        await saveSingleExerciseLog(user.id, {
          exerciseId: exercise.id,
          reps: null,
          timeSeconds: Math.round(elapsedSeconds),
          weight: 0,
          equipmentType: null,
          variation: null,
        });
        queryClient.invalidateQueries({ queryKey: ["workouts"] });
        queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
        toast({ title: "Breathwork logged" });
        return { destination: "standalone" };
      } catch (error) {
        toast({
          title: "Couldn't log breathwork",
          description: error instanceof Error ? error.message : "Something went wrong.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLogging(false);
      }
    },
    [dispatch, exercises, isWorkoutActive, queryClient, toast, user?.id]
  );

  return { logSession, isLogging };
};
