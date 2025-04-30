import { Button } from "@/components/core/button";
// import { WorkoutProvider, useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context import
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { Dumbbell, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/WorkoutComponent";

const Index = () => {
  // const { currentWorkout, startWorkout, workoutTime } = useWorkout(); // Remove old context usage
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutTime = useAppSelector(selectWorkoutTime);

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction());
  };

  return (
    // Reverted to standard container layout, starts at top
    <div className="container mx-auto p-4">
      {/* Removed wrapper div */}
        <header className="flex flex-col items-center justify-between mb-8 text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 text-fitnessBlue dark:text-fitnessBlue uppercase font-montserrat">
            Stratos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Take your health & fitness to new heights</p>
        </header>

        <main>
          {!currentWorkout ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
              <Dumbbell size={64} className="text-fitnessBlue mb-6" />
              <h2 className="text-2xl font-semibold mb-4 dark:text-white">Ready to start your session?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
                Track your exercises, sets, and reps to monitor your progress over time.
              </p>
              <Button 
                onClick={handleStartWorkout} // Use dispatch 
                size="lg" 
                className="bg-fitnessBlue hover:bg-blue-600 text-white font-semibold px-8"
              >
                Start Workout
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 flex items-center justify-center">
                <Clock className="text-fitnessBlue mr-2" />
                <span className="text-xl font-mono dark:text-white">{formatTime(workoutTime)}</span>
              </div>
              
              <WorkoutComponent />
            </div>
          )}
        </main>
      {/* Removed wrapper div */}
    </div>
  );
};

export default Index;
