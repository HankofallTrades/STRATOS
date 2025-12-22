import WorkoutComponent from "@/domains/fitness/view/WorkoutComponent";
import SessionFocusSelector from "@/domains/fitness/view/SessionFocusSelector";
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
    // Map focuses to semantic theme variables where possible, or use standard palette overrides if needed.
    // Ideally, these should feel distinct but harmonious with the theme.
    // Using opacity variations or specific semantic roles can help.
    const focusMap = {
      strength: {
        title: 'Strength',
        color: 'bg-primary', // Use primary for main strength
        icon: <Dumbbell className="h-4 w-4" />
      },
      hypertrophy: {
        title: 'Hypertrophy',
        color: 'bg-secondary', // Secondary for hypertrophy
        icon: <Flame className="h-4 w-4" />
      },
      zone2: {
        title: 'Endurance',
        color: 'bg-accent', // Accent for endurance
        icon: <Heart className="h-4 w-4" />
      },
      zone5: {
        title: 'Max HR',
        color: 'bg-destructive', // Destructive/High intensity for Max HR
        icon: <Zap className="h-4 w-4" />
      },
      speed: {
        title: 'Speed & Power',
        color: 'bg-primary/80',
        icon: <Zap className="h-4 w-4" />
      },
      recovery: {
        title: 'Recovery',
        color: 'bg-muted-foreground',
        icon: <Heart className="h-4 w-4" />
      },
      mixed: {
        title: 'Mixed',
        color: 'bg-card-foreground',
        icon: <Dumbbell className="h-4 w-4" />
      },
    };
    return focusMap[focus] || { title: focus, color: 'bg-muted', icon: <Dumbbell className="h-4 w-4" /> };
  };

  if (!currentWorkout) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center justify-center py-8 px-6 bg-card border border-border rounded-lg shadow-sm w-full max-w-2xl">
          <Barbell size={64} className="text-primary mb-6" />
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground text-center">Ready to start your session?</h2>
          <p className="text-muted-foreground mb-8 text-center">
            Track your exercises, sets, and reps to monitor your progress over time.
          </p>

          <div className="w-full mb-6 relative z-0">
            <SessionFocusSelector
              onSelectFocus={handleFocusSelect}
              selectedFocus={selectedFocus}
              compact={true}
            />
          </div>

          <Button
            onClick={handleStartWorkout}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 w-full max-w-sm"
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
      <div className="bg-card border border-border p-4 rounded-lg mb-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <Clock className="text-primary mr-2" />
          <span className="text-xl font-mono text-card-foreground">
            {formatTime(currentWorkout.completed ? currentWorkout.duration : displayTime)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {focusInfo && (
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-full", focusInfo.color.replace('bg-', 'text-'))}>
                {focusInfo.icon}
              </div>
              <Badge
                variant="outline"
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
