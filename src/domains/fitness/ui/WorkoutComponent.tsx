import React, { memo, useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

import { useActionListener } from "@/hooks/useActionListener";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { RootState } from "@/state/store";
import { useAuth } from "@/state/auth/AuthProvider";
import { selectCurrentWorkout, selectSessionFocus, setCompleted, pairWorkoutExercises, breakSuperset } from "@/state/workout/workoutSlice";
import { startsRestAfterSet, workoutExerciseGroups } from "@/domains/fitness/data/supersets";
import { DEFAULT_AUTO_ADD_SET_COUNT } from "@/domains/fitness/data/setAutoAdd";
import { Button } from "@/components/core/button";
import RestTimer from "./RestTimer";
import {
  buildWorkoutExerciseHistoryKey,
  fetchLastWorkoutExerciseInstances,
  fetchPriorBestE1RMByExerciseId,
  fetchVariationsForExercises,
  getUserWeight,
} from "@/domains/fitness/data/fitnessRepository";
import {
  areSetPlanRecommendationsEqual,
  buildSetPlan,
  getExerciseSetPlanRecommendations,
  type ExerciseSetRecommendations,
} from "@/domains/fitness/data/setPlan";
import { useWorkoutLiveActivity } from "@/domains/fitness/hooks/useWorkoutLiveActivity";

import BreathworkExerciseCard from "@/domains/breathwork/ui/BreathworkExerciseCard";
import { protocolForExerciseName } from "@/domains/breathwork/data/protocols";

import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";

const EMPTY_VARIATIONS_BY_EXERCISE_ID: Awaited<ReturnType<typeof fetchVariationsForExercises>> = {};
const EMPTY_HISTORY_BY_LOOKUP_KEY: Awaited<ReturnType<typeof fetchLastWorkoutExerciseInstances>> = {};
const EMPTY_RECOMMENDATIONS: ExerciseSetRecommendations = {};
const EMPTY_PEAK_E1RM_BY_EXERCISE_ID: Record<string, number> = {};

interface WorkoutExerciseRowProps {
  exercise: NonNullable<ReturnType<typeof selectCurrentWorkout>>["exercises"][number];
  historyByLookupKey: Awaited<ReturnType<typeof fetchLastWorkoutExerciseInstances>>;
  isLookupDataLoading: boolean;
  priorBestE1RM: number | null;
  recommendedSetPerformances: ExerciseSetRecommendations;
  restStartTime: number | null;
  userWeightKg: number | null;
  variationsByExerciseId: Awaited<ReturnType<typeof fetchVariationsForExercises>>;
}

const WorkoutExerciseRow = memo(({
  exercise,
  historyByLookupKey,
  isLookupDataLoading,
  priorBestE1RM,
  recommendedSetPerformances,
  restStartTime,
  userWeightKg,
  variationsByExerciseId,
}: WorkoutExerciseRowProps) => {
  const historyKey = useMemo(
    () => buildWorkoutExerciseHistoryKey({
      exerciseId: exercise.exercise.id,
      equipmentType: exercise.equipmentType ?? null,
      variation: exercise.variation ?? null,
    }),
    [exercise.equipmentType, exercise.exercise.id, exercise.variation]
  );

  const variations = useMemo(
    () => [
      'Standard',
      ...(variationsByExerciseId[exercise.exercise.id] ?? [])
        .map(variation => variation.variation_name)
        .filter(variation => variation !== 'Standard'),
    ],
    [exercise.exercise.id, variationsByExerciseId]
  );

  const isBreathwork =
    exercise.exercise.exercise_category === 'breathwork' &&
    protocolForExerciseName(exercise.exercise.name) !== null;

  return (
    <motion.div
      className="[overflow-x:clip] [contain:paint]"
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 30 }}
    >
      {isBreathwork ? (
        <BreathworkExerciseCard workoutExercise={exercise} />
      ) : (
        <WorkoutExerciseContainer
          historicalSets={historyByLookupKey[historyKey] ?? null}
          isLookupsLoading={isLookupDataLoading}
          priorBestE1RM={priorBestE1RM}
          recommendedSetPerformances={recommendedSetPerformances}
          workoutExercise={exercise}
          restStartTime={restStartTime}
          userWeight={userWeightKg}
          variations={variations}
        />
      )}
    </motion.div>
  );
});

WorkoutExerciseRow.displayName = "WorkoutExerciseRow";

const WorkoutComponent = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [restTimerState, setRestTimerState] = useState<{ exerciseId: string; startTime: number } | null>(null);

  const workoutExercises = useMemo(
    () => currentWorkout?.exercises ?? [],
    [currentWorkout?.exercises]
  );
  const variationExerciseIds = useMemo(
    () => [...new Set(workoutExercises.map(exercise => exercise.exercise.id))].sort(),
    [workoutExercises]
  );
  const historyLookups = useMemo(
    () => [...new Map(
      workoutExercises.map(exercise => {
        const lookup = {
          exerciseId: exercise.exercise.id,
          equipmentType: exercise.equipmentType ?? null,
          variation: exercise.variation ?? null,
        };
        return [buildWorkoutExerciseHistoryKey(lookup), lookup];
      })
    ).values()],
    [workoutExercises]
  );
  const historyLookupSignature = useMemo(
    () => historyLookups.map(buildWorkoutExerciseHistoryKey).sort(),
    [historyLookups]
  );

  const { data: variationsByExerciseId = EMPTY_VARIATIONS_BY_EXERCISE_ID, isLoading: isLoadingVariations } = useQuery({
    queryKey: ['workoutExerciseVariations', variationExerciseIds],
    queryFn: () => fetchVariationsForExercises(variationExerciseIds),
    enabled: variationExerciseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: historyByLookupKey = EMPTY_HISTORY_BY_LOOKUP_KEY, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['workoutExerciseHistory', userId, historyLookupSignature],
    queryFn: () => fetchLastWorkoutExerciseInstances(userId!, historyLookups),
    enabled: !!userId && historyLookups.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // The bar each exercise has to clear for a set to count as a PR. Same rows
  // and formula the home model's "Recent PR" reads, so the haptic and the card
  // agree.
  const { data: peakE1RMByExerciseId = EMPTY_PEAK_E1RM_BY_EXERCISE_ID } = useQuery({
    queryKey: ['workoutExercisePeakE1RM', userId, variationExerciseIds],
    queryFn: () => fetchPriorBestE1RMByExerciseId(userId!, variationExerciseIds),
    enabled: !!userId && variationExerciseIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userWeight, isLoading: isLoadingUserWeight } = useQuery({
    queryKey: ['userWeight', userId],
    queryFn: () => getUserWeight(userId!),
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
  });

  const isLookupDataLoading =
    isLoadingVariations || isLoadingHistory || isLoadingUserWeight;

  const sessionFocus = useAppSelector(selectSessionFocus);

  const historyByWorkoutExerciseId = useMemo(
    () =>
      Object.fromEntries(
        workoutExercises.map(workoutExercise => [
          workoutExercise.id,
          historyByLookupKey[
            buildWorkoutExerciseHistoryKey({
              exerciseId: workoutExercise.exercise.id,
              equipmentType: workoutExercise.equipmentType ?? null,
              variation: workoutExercise.variation ?? null,
            })
          ] ?? null,
        ])
      ),
    [historyByLookupKey, workoutExercises]
  );

  // The whole session's suggestions, derived in one pass. The lock screen needs
  // every set up front, and deriving them here keeps both surfaces on one set
  // of numbers instead of each recomputing its own.
  const setPlan = useMemo(
    () =>
      buildSetPlan({
        exercises: workoutExercises,
        sessionFocus,
        historyByWorkoutExerciseId,
      }),
    [historyByWorkoutExerciseId, sessionFocus, workoutExercises]
  );

  useWorkoutLiveActivity(setPlan);

  // Rows are memoised, and the plan is rebuilt on every workout change, most of
  // which cannot move a suggestion. Hand a row the record it already has unless
  // its numbers actually changed, so logging one set does not re-render the
  // whole session.
  const previousRecommendationsRef = useRef<Record<string, ExerciseSetRecommendations>>({});
  const recommendationsByWorkoutExerciseId = useMemo(() => {
    const nextRecommendations: Record<string, ExerciseSetRecommendations> = {};

    for (const workoutExercise of workoutExercises) {
      const recommendations = getExerciseSetPlanRecommendations(setPlan, workoutExercise.id);
      const previous = previousRecommendationsRef.current[workoutExercise.id];

      nextRecommendations[workoutExercise.id] =
        previous && areSetPlanRecommendationsEqual(previous, recommendations)
          ? previous
          : recommendations;
    }

    previousRecommendationsRef.current = nextRecommendations;
    return nextRecommendations;
  }, [setPlan, workoutExercises]);

  // Rest starts when a set is logged, so the timer listens for the completion
  // rather than watching completed counts for one to go up.
  useActionListener(setCompleted, ({ workoutExerciseId, completedSet }) => {
    const exercises = selectCurrentWorkout(store.getState())?.exercises ?? [];
    const group = workoutExerciseGroups(exercises).find(members => members.some(member => member.id === workoutExerciseId));
    if (startsRestAfterSet(exercises, workoutExerciseId, completedSet.id)) {
      setRestTimerState({ exerciseId: group?.[0].id ?? workoutExerciseId, startTime: Date.now() });
    } else {
      setRestTimerState(null);
    }
  });

  if (!currentWorkout) {
    return null;
  }

  return (
    <div className="[overflow-x:clip]">
      <div className="[overflow-x:clip]">
        {currentWorkout.exercises.length > 0 ? (
          <div className="space-y-8 [overflow-x:clip] pb-8">
            <AnimatePresence initial={false}>
              {workoutExerciseGroups(workoutExercises).map((group, groupIndex, groups) => {
                const paired = group.length === 2;
                const next = groups[groupIndex + 1];
                const candidates = next?.length === 1 ? [group[0], next[0]] : [];
                const canPair = !paired && candidates.length === 2 && candidates.every(exercise =>
                  !exercise.supersetId && exercise.exercise.exercise_type !== 'cardio' && exercise.exercise.exercise_category !== 'breathwork'
                );
                return (
                  <div key={group[0].id} className={paired ? "stone-panel rounded-[24px] border border-primary/20 p-4 space-y-4" : "space-y-2"}>
                    {paired && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="app-kicker tabular-nums">Superset · {group[0].sets.length} rounds</span>
                          {restTimerState?.exerciseId === group[0].id && <RestTimer startTime={restTimerState.startTime} />}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          dispatch(breakSuperset(group[0].supersetId!));
                          setRestTimerState(null);
                        }}>Break apart</Button>
                      </div>
                    )}
                    {group.map((exercise, memberIndex) => (
                      <div key={exercise.id}>
                        {paired && <p className="mb-2 text-xs font-semibold text-muted-foreground">{memberIndex === 0 ? 'A' : 'B'}</p>}
                        <WorkoutExerciseRow
                          exercise={exercise}
                          historyByLookupKey={historyByLookupKey}
                          isLookupDataLoading={isLookupDataLoading}
                          priorBestE1RM={peakE1RMByExerciseId[exercise.exercise.id] ?? null}
                          recommendedSetPerformances={
                            recommendationsByWorkoutExerciseId[exercise.id] ?? EMPTY_RECOMMENDATIONS
                          }
                          restStartTime={!paired && restTimerState?.exerciseId === exercise.id ? restTimerState.startTime : null}
                          userWeightKg={userWeight?.weight_kg ?? null}
                          variationsByExerciseId={variationsByExerciseId}
                        />
                      </div>
                    ))}
                    {canPair && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={isLoadingHistory} onClick={() => {
                        const roundCount = Math.max(...candidates.map(exercise =>
                          Math.max(exercise.sets.length, historyByWorkoutExerciseId[exercise.id]?.length || DEFAULT_AUTO_ADD_SET_COUNT)
                        ));
                        dispatch(pairWorkoutExercises({ firstId: candidates[0].id, secondId: candidates[1].id, roundCount }));
                        setRestTimerState(null);
                      }}>Pair with {candidates[1].exercise.name}</Button>
                    )}
                  </div>
                );
              })}
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
