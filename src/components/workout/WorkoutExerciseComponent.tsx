
import { useState } from "react";
import { useWorkout } from "@/context/WorkoutContext";
import { WorkoutExercise } from "@/types/workout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import SetComponent from "./SetComponent";

interface WorkoutExerciseComponentProps {
  workoutExercise: WorkoutExercise;
}

const WorkoutExerciseComponent = ({ workoutExercise }: WorkoutExerciseComponentProps) => {
  const { addSetToExercise, getLastPerformance } = useWorkout();
  
  const lastPerformance = getLastPerformance(workoutExercise.exerciseId);
  
  const handleAddSet = () => {
    addSetToExercise(workoutExercise.id);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <span>{workoutExercise.exercise.name}</span>
          {lastPerformance && (
            <span className="text-sm font-normal text-gray-500">
              Last time: {lastPerformance.weight} kg × {lastPerformance.reps} reps
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workoutExercise.sets.map((set, index) => (
            <SetComponent
              key={set.id}
              workoutExerciseId={workoutExercise.id}
              set={set}
              setNumber={index + 1}
            />
          ))}
          
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={handleAddSet}
          >
            <Plus size={16} className="mr-2" />
            Add Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutExerciseComponent;
