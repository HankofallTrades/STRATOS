import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatTime } from "@/lib/utils/timeUtils";
import { Clock } from "lucide-react";
import { Button } from "@/components/core/button";
import { Barbell } from "@phosphor-icons/react";

const Workout = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const displayTime = useElapsedTime(workoutStartTime);

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction());
  };

  if (!currentWorkout) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm w-full max-w-md">
          <Barbell size={64} className="text-fitnessBlue mb-6" />
          <h2 className="text-2xl font-semibold mb-4 dark:text-white text-center">Ready to start your session?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
            Track your exercises, sets, and reps to monitor your progress over time.
          </p>
          <Button 
            onClick={handleStartWorkout}
            size="lg" 
            className="bg-fitnessBlue hover:bg-blue-600 text-white font-semibold px-8"
          >
            Start Workout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-md mx-auto p-4 flex flex-col h-full">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 flex items-center justify-center flex-shrink-0">
        <Clock className="text-fitnessBlue mr-2" />
        <span className="text-xl font-mono dark:text-white">
          {formatTime(currentWorkout.completed ? currentWorkout.duration : displayTime)}
        </span>
      </div>

      <div className="flex-grow overflow-y-auto">
        <WorkoutComponent />
      </div>
    </div>
  );
};

export default Workout;
