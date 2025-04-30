import { Button } from "@/components/core/button";
// import { WorkoutProvider, useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context import
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { Clock } from "lucide-react";
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import { Barbell } from "@phosphor-icons/react";
// import { useAuth } from "@/state/auth/AuthProvider"; // Removed useAuth import as it's unused
// import { Link } from "react-router-dom"; // Removed Link import as it's unused
import { useElapsedTime } from "@/hooks/useElapsedTime"; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useEffect } from 'react'; // Import useEffect

const Home = () => { // Changed component name to Home
  const navigate = useNavigate(); // Add useNavigate hook
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  // const workoutStartTime = useAppSelector(selectWorkoutStartTime); // No longer needed here
  // const displayTime = useElapsedTime(workoutStartTime); // No longer needed here

  // Redirect to workout page if a workout is already active
  useEffect(() => {
    if (currentWorkout) {
      navigate('/workout');
    }
  }, [currentWorkout, navigate]);

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction());
    navigate('/workout'); // Navigate after starting
  };

  // If a workout is active, this component will redirect. 
  // If not, show the start workout prompt.
  // We add a check to prevent rendering the prompt briefly before redirecting.
  if (currentWorkout) {
    return null; // Or a loading indicator
  }

  return (
    // Reverted to standard container layout, starts at top
    <div className="container mx-auto p-4">
      {/* Removed wrapper div */}
        <header className="flex flex-col items-center justify-between mb-8 text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 text-fitnessBlue dark:text-fitnessBlue uppercase font-montserrat">
            Stratos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Elevate your game</p>
        </header>

        <main>
          {/* Always show the Start Workout prompt if no workout is active */}
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
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
        </main>
      {/* Removed wrapper div */}
    </div>
  );
};

export default Home; // Changed export to Home 