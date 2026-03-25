import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector } from "@/hooks/redux";
import { selectCurrentWorkout } from "@/state/workout/workoutSlice";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";
import { motion, AnimatePresence } from 'framer-motion';

const WorkoutComponent = () => {
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  const [restTimerState, setRestTimerState] = useState<{ exerciseId: string; startTime: number } | null>(null);
  const isInitializedRef = useRef(false);
  const prevCompletedCountsRef = useRef<Record<string, number>>({});

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
    <div className="flex h-full flex-col [overflow-x:clip]">
      <div className="scrollbar-hidden flex-1 [overflow-x:clip] overflow-y-auto overscroll-x-none [overflow-anchor:none]">
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
                    workoutExercise={exercise}
                    restStartTime={restTimerState?.exerciseId === exercise.id ? restTimerState.startTime : null}
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
