import React from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { selectCurrentWorkout, endWorkout as endWorkoutAction } from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { Button } from "@/components/core/button";
import { Plus, Save } from "lucide-react";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseContainer from "./WorkoutExerciseContainer";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { ScrollArea } from "@/components/core/scroll-area";
import { Workout } from "@/lib/types/workout";

const WorkoutComponent = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutTime = useAppSelector((state) => state.workout.workoutTime);

  if (!currentWorkout) {
    return null;
  }

  const handleEndWorkout = () => {
    const completedWorkout = {
      ...currentWorkout,
      duration: workoutTime,
      completed: true,
    };

    dispatch(endWorkoutAction());
    dispatch(addWorkoutToHistory(completedWorkout));

    toast({
      title: "Workout Completed",
      description: "Your workout has been saved successfully!",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Current Workout</h2>
        <Button 
          onClick={handleEndWorkout}
          variant="default"
          className="bg-fitnessGreen hover:bg-fitnessGreen/90 flex items-center gap-2"
        >
          <Save size={16} />
          <span>End Workout</span>
        </Button>
      </div>

      {currentWorkout.exercises.length > 0 ? (
        <div className="space-y-6">
          {currentWorkout.exercises.map((exercise) => (
            <WorkoutExerciseContainer 
              key={exercise.id} 
              workoutExercise={exercise} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No exercises added yet</p>
        </div>
      )}

      <div className="pt-4">
        <ExerciseSelector />
      </div>
    </div>
  );
};

export default WorkoutComponent;
