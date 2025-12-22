import React from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
  selectCurrentWorkout,
} from "@/state/workout/workoutSlice";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/core/card";

const WorkoutComponent = () => {
  const currentWorkout = useAppSelector(selectCurrentWorkout);

  if (!currentWorkout) {
    return null;
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-grow space-y-6 overflow-y-auto px-1">
        {currentWorkout.exercises.length > 0 ? (
          <AnimatePresence initial={false}>
            {currentWorkout.exercises.map((exercise, index) => (
              <motion.div
                key={exercise.id}
                layout="position"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 30 }}
              >
                <WorkoutExerciseContainer
                  workoutExercise={exercise}
                  isLast={index === currentWorkout.exercises.length - 1}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex justify-center items-center h-full w-full max-w-sm mx-auto">
            <div className="border border-border rounded-xl p-10 bg-card/30 backdrop-blur-sm shadow-sm w-full flex flex-col items-center">
              <ExerciseSelector openOnMount={true} />
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default WorkoutComponent;
