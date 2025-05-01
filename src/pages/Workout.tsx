import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import { useAppSelector } from "@/hooks/redux";
import { selectCurrentWorkout, selectWorkoutStartTime } from "@/state/workout/workoutSlice";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatTime } from "@/lib/utils/timeUtils";
import { Clock } from "lucide-react";

const Workout = () => {
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const displayTime = useElapsedTime(workoutStartTime);

  if (!currentWorkout) {
    return null;
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
