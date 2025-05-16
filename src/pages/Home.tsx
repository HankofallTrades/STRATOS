import { Button } from "@/components/core/button";
// import { WorkoutProvider, useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context import
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { Clock } from "lucide-react";
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import { Barbell } from "@phosphor-icons/react";
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this path is correct
import { Link } from "react-router-dom"; // Removed Link import as it's unused
import { useElapsedTime } from "@/hooks/useElapsedTime"; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useMemo, useState, useEffect } from 'react'; // ADDED useState, useEffect
import { useQuery } from '@tanstack/react-query';
import { getUserProfile, UserProfileData } from '@/lib/integrations/supabase/user';
import { getDailyProteinIntake, DailyProteinIntake } from '@/lib/integrations/supabase/nutrition';
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/core/card';

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();
  const userId = user?.id;
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [startAnimation, setStartAnimation] = useState(false);

  const { data: userProfile, isLoading: isLoadingProfile } = useQuery<
    UserProfileData | null,
    Error
  >(
    {
      queryKey: ['userProfile', userId],
      queryFn: async () => {
        if (!userId) return null;
        const profile = await getUserProfile(userId);
        return profile;
      },
      enabled: !!userId,
      staleTime: 5 * 60 * 1000,
    }
  );

  const { 
    data: dailyProtein, 
    isLoading: isLoadingProtein, 
    isError: isErrorProtein, 
    error: proteinError 
  } = useQuery<
    DailyProteinIntake,
    Error
  >(
    {
      queryKey: ['dailyProteinIntake', userId, todayDate],
      queryFn: async () => {
        if (!userId) { 
            return { total_protein: 0 }; 
        }
        const intake = await getDailyProteinIntake(userId, todayDate);
        return intake;
      },
      enabled: !!userId, 
      staleTime: 1 * 60 * 1000, 
    }
  );

  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (!isLoadingProtein && dailyProtein) {
      animationTimer = setTimeout(() => {
        setStartAnimation(true);
      }, 50); 
    } else if (isLoadingProtein) {
      setStartAnimation(false);
    }
    return () => {
      clearTimeout(animationTimer);
    };
  }, [isLoadingProtein, dailyProtein]);

  const currentProteinIntake = dailyProtein?.total_protein ?? 0;

  const proteinGoalKgFactor = useMemo(() => {
    if (!userProfile || !userProfile.focus) return 1.5;
    const focus = userProfile.focus.toLowerCase();
    if (focus === 'strength' || focus === 'hypertrophy' || focus === 'strength/hypertrophy') {
      return 2.0;
    }
    return 1.5;
  }, [userProfile]);

  const calculatedProteinGoal = useMemo(() => {
    if (!userProfile || typeof userProfile.weight_kg !== 'number') return 0;
    return Math.round(userProfile.weight_kg * proteinGoalKgFactor);
  }, [userProfile, proteinGoalKgFactor]);

  const renderProteinProgress = () => {
    if (isErrorProtein) {
      return <p className="text-sm text-destructive text-center">Error: {proteinError?.message || 'Could not load protein intake'}</p>;
    }

    const goalReady = !isLoadingProfile && userProfile && typeof userProfile.weight_kg === 'number';
    const actualDisplayGoal = goalReady ? calculatedProteinGoal : 0;

    const displayCurrent = startAnimation ? currentProteinIntake : 0;
    const displayGoal = startAnimation ? actualDisplayGoal : 0; 
    const progressKey = startAnimation ? `protein-loaded-${currentProteinIntake}-${actualDisplayGoal}` : 'protein-initial-state';

    const goalStatusMessage =
      (startAnimation || !isLoadingProtein) && isLoadingProfile && userId && !userProfile ? "Loading goal..." :
      (startAnimation || !isLoadingProtein) && !isLoadingProfile && userId && (!userProfile || typeof userProfile.weight_kg !== 'number') ? "Set weight in profile for goal" :
      null;

    return (
      <>
        <CircularProgressDisplay
          key={progressKey}
          currentValue={displayCurrent} 
          goalValue={displayGoal}
          label="Today's Protein"
          unit="g"
          size={180}
          barSize={14}
          showTooltip={startAnimation && goalReady}
          showCenterText={startAnimation}
        />
        {goalStatusMessage && (
          <p className="text-xs text-center text-muted-foreground mt-2">{goalStatusMessage}</p>
        )}
      </>
    );
  };

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction());
    navigate('/workout');
  };

  return (
    <div className="container mx-auto p-4">
        <header className="flex flex-col items-center justify-between mb-8 text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 text-fitnessBlue dark:text-fitnessBlue uppercase font-montserrat">
            Stratos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Elevate your game</p>
        </header>

        <main>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Protein Intake</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center min-h-[250px]">
              {renderProteinProgress()}
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default Home; 