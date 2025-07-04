import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import SessionFocusSelector from "@/components/features/Workout/SessionFocusSelector";
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import { 
  selectCurrentWorkout, 
  selectWorkoutStartTime, 
  selectSessionFocus,
  startWorkout as startWorkoutAction 
} from "@/state/workout/workoutSlice";
import { useElapsedTime } from "@/hooks/useElapsedTime";
import { formatTime } from "@/lib/utils/timeUtils";
import { Clock, Heart, Zap, Dumbbell, Flame } from "lucide-react";
import { Button } from "@/components/core/button";
import { Badge } from "@/components/core/badge";
import { Barbell } from "@phosphor-icons/react";
import { SessionFocus } from "@/lib/types/workout";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const Workout = () => {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const sessionFocus = useAppSelector(selectSessionFocus);
  const displayTime = useElapsedTime(workoutStartTime);
  const [selectedFocus, setSelectedFocus] = useState<SessionFocus | null>(null);

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction({ 
      sessionFocus: selectedFocus || undefined
    }));
  };

  const handleFocusSelect = (focus: SessionFocus) => {
    setSelectedFocus(focus);
  };

  const getFocusDisplayInfo = (focus: SessionFocus) => {
    const focusMap = {
      strength: { 
        title: 'Strength', 
        color: 'bg-red-500',
        icon: <Dumbbell className="h-4 w-4" />
      },
      hypertrophy: { 
        title: 'Hypertrophy', 
        color: 'bg-orange-500',
        icon: <Flame className="h-4 w-4" />
      },
      zone2: { 
        title: 'Endurance', 
        color: 'bg-green-500',
        icon: <Heart className="h-4 w-4" />
      },
      zone5: { 
        title: 'Max HR', 
        color: 'bg-purple-500',
        icon: <Zap className="h-4 w-4" />
      },
      speed: { 
        title: 'Speed & Power', 
        color: 'bg-yellow-500',
        icon: <Zap className="h-4 w-4" />
      },
      recovery: { 
        title: 'Recovery', 
        color: 'bg-blue-500',
        icon: <Heart className="h-4 w-4" />
      },
      mixed: { 
        title: 'Mixed', 
        color: 'bg-gray-500',
        icon: <Dumbbell className="h-4 w-4" />
      },
    };
    return focusMap[focus] || { title: focus, color: 'bg-gray-500', icon: <Dumbbell className="h-4 w-4" /> };
  };

  if (!currentWorkout) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center justify-center py-8 px-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm w-full max-w-2xl">
          <Barbell size={64} className="text-fitnessBlue mb-6" />
          <h2 className="text-2xl font-semibold mb-4 dark:text-white text-center">Ready to start your session?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
            Track your exercises, sets, and reps to monitor your progress over time.
          </p>
          
          <div className="w-full mb-6">
            <SessionFocusSelector
              onSelectFocus={handleFocusSelect}
              selectedFocus={selectedFocus}
              compact={true}
            />
          </div>
          
          <Button 
            onClick={handleStartWorkout}
            size="lg" 
            className="bg-fitnessBlue hover:bg-blue-600 text-white font-semibold px-8 w-full max-w-sm"
          >
            Start Session
          </Button>
        </div>
      </div>
    );
  }

  const focusInfo = sessionFocus ? getFocusDisplayInfo(sessionFocus) : null;

  return (
    <div className="max-w-screen-md mx-auto p-4 flex flex-col h-full">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <Clock className="text-fitnessBlue mr-2" />
          <span className="text-xl font-mono dark:text-white">
            {formatTime(currentWorkout.completed ? currentWorkout.duration : displayTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {focusInfo && (
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-full text-white", focusInfo.color)}>
                {focusInfo.icon}
              </div>
              <Badge 
                variant="secondary" 
                className="text-xs"
              >
                {focusInfo.title}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        <WorkoutComponent />
      </div>
    </div>
  );
};

export default Workout;
