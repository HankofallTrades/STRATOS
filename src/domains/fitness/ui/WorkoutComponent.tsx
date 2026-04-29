import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

import { useAppSelector } from "@/hooks/redux";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";
import {
  fetchVariationsForExercises,
  getUserWeight,
} from "@/domains/fitness/data/fitnessRepository";

import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";

const WorkoutComponent = () => {
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [restTimerState, setRestTimerState] = useState<{ exerciseId: string; startTime: number } | null>(null);
  const isInitializedRef = useRef(false);
  const prevCompletedCountsRef = useRef<Record<string, number>>({});

  const workoutExercises = useMemo(
    () => currentWorkout?.exercises ?? [],
    [currentWorkout?.exercises]
  );
  const variationExerciseIds = useMemo(
    () => [...new Set(workoutExercises.map(exercise => exercise.exercise.id))].sort(),
    [workoutExercises]
  );
  const { data: variationsByExerciseId = {}, isLoading: isLoadingVariations } = useQuery({
    queryKey: ['workoutExerciseVariations', variationExerciseIds],
    queryFn: () => fetchVariationsForExercises(variationExerciseIds),
    enabled: variationExerciseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userWeight, isLoading: isLoadingUserWeight } = useQuery({
    queryKey: ['userWeight', userId],
    queryFn: () => getUserWeight(userId!),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
  });

  const isLookupDataLoading = isLoadingVariations || isLoadingUserWeight;

  useEffect(() => {
    if (!currentWorkout) return;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      for (const exercise of currentWorkout.exercises) {
        prevCompletedCountsRef.current[exercise.id] = exercise.sets.filter(s => s.completed).length;
      }
      return;
    }

    for (const exercise of currentWorkout.exercises) {
      const completedCount = exercise.sets.filter(s => s.completed).length;
      const prevCount = prevCompletedCountsRef.current[exercise.id] ?? 0;

      if (completedCount > prevCount) {
        setRestTimerState({ exerciseId: exercise.id, startTime: Date.now() });
      }
      prevCompletedCountsRef.current[exercise.id] = completedCount;
    }
  }, [currentWorkout]);

  if (!currentWorkout) {
    return null;
  }

  return (
    <div className="[overflow-x:clip]">
      <div className="[overflow-x:clip]">
        {currentWorkout.exercises.length > 0 ? (
          <div className="space-y-8 [overflow-x:clip] pb-8">
            <AnimatePresence initial={false}>
              {currentWorkout.exercises.map((exercise) => (
                <motion.div
                  key={exercise.id}
                  className="[overflow-x:clip] [contain:paint]"
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 250, damping: 30 }}
                >
                  <WorkoutExerciseContainer
                    isVariationLoading={isLookupDataLoading}
                    workoutExercise={exercise}
                    restStartTime={restTimerState?.exerciseId === exercise.id ? restTimerState.startTime : null}
                    userWeight={userWeight?.weight_kg ?? null}
                    variations={[
                      'Standard',
                      ...(variationsByExerciseId[exercise.exercise.id] ?? [])
                        .map(variation => variation.variation_name)
                        .filter(variation => variation !== 'Standard'),
                    ]}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex justify-start pt-1">
              <ExerciseSelector />
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full w-full max-w-sm mx-auto">
            <div className="stone-panel w-full rounded-[28px] p-10 flex flex-col items-center">
              <ExerciseSelector openOnMount={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutComponent;
