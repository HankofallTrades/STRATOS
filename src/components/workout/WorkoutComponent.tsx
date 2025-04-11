import { useWorkout } from "@/context/WorkoutContext";
import { Button } from "@/components/ui/button";
import { Plus, Save } from "lucide-react";
import ExerciseSelector from "./ExerciseSelector";
import WorkoutExerciseComponent from "./WorkoutExerciseComponent";
import { toast } from "@/components/ui/use-toast";

const WorkoutComponent = () => {
  const { currentWorkout, endWorkout } = useWorkout();

  if (!currentWorkout) {
    return null;
  }

  const handleEndWorkout = () => {
    endWorkout();
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
            <WorkoutExerciseComponent 
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
