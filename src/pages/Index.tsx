
import { Button } from "@/components/ui/button";
import { useWorkout } from "@/context/WorkoutContext";
import { Dumbbell, BarChart, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatTime } from "@/utils/timeUtils";
import WorkoutComponent from "@/components/workout/WorkoutComponent";

const Index = () => {
  const { currentWorkout, startWorkout, workoutTime } = useWorkout();

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="flex flex-col items-center justify-between mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-fitnessBlue">Lift Smart</h1>
        <p className="text-gray-600 mb-6">Your personal strength training companion</p>
        
        <nav className="flex gap-4 mb-8">
          <Link to="/">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-fitnessBlue text-fitnessBlue hover:bg-fitnessBlue/10"
            >
              <Dumbbell size={18} />
              <span>Workout</span>
            </Button>
          </Link>
          <Link to="/analytics">
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-fitnessIndigo text-fitnessIndigo hover:bg-fitnessIndigo/10"
            >
              <BarChart size={18} />
              <span>Analytics</span>
            </Button>
          </Link>
        </nav>
      </header>

      <main>
        {!currentWorkout ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg shadow-sm">
            <Dumbbell size={64} className="text-fitnessBlue mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Ready to start your workout?</h2>
            <p className="text-gray-600 mb-8 text-center">
              Track your exercises, sets, and reps to monitor your progress over time.
            </p>
            <Button 
              onClick={startWorkout} 
              size="lg" 
              className="bg-fitnessGreen hover:bg-fitnessGreen/90 text-white font-semibold px-8"
            >
              Start Workout
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg mb-6 flex items-center justify-center">
              <Clock className="text-fitnessBlue mr-2" />
              <span className="text-xl font-mono">{formatTime(workoutTime)}</span>
            </div>
            
            <WorkoutComponent />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
