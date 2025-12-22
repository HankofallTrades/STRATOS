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
            {currentWorkout.exercises.map((exercise) => (
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
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <Card className="bg-card shadow rounded-lg border">
            <CardContent className="p-6 flex justify-center items-center">
              <ExerciseSelector />
            </CardContent>
          </Card>
        )}
      </div>

      {currentWorkout.exercises.length > 0 && (
        <div className="mt-auto pt-4 flex justify-center items-center">
          <div className="flex flex-col items-center">
            <ExerciseSelector /> 
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutComponent;
