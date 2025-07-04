import { Button } from "@/components/core/button";
// import { WorkoutProvider, useWorkout } from "@/state/workout/WorkoutContext"; // Remove old context import
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { Clock } from "lucide-react";
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
// import { Barbell } from "@phosphor-icons/react"; // Removed as it was for the old Start Workout section
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this path is correct
// Removed Link import as it's unused
import { useElapsedTime } from "@/hooks/useElapsedTime"; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useMemo, useState, useEffect } from 'react'; // ADDED useState, useEffect
import { useQuery } from '@tanstack/react-query';
import { getUserProfile, UserProfileData } from '@/lib/integrations/supabase/user';
import { getDailyProteinIntake, DailyProteinIntake, getWeeklyZone2CardioMinutes, WeeklyZone2CardioData } from '@/lib/integrations/supabase/nutrition';
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
// import PerformanceOverview from '@/components/features/Analytics/PerformanceOverview'; // Import PerformanceOverview - REMOVED
import Volume from '@/components/features/Analytics/Volume'; // Import Volume component
import SunMoonProgress from '@/components/core/charts/SunMoonProgress'; // Import SunMoonProgress
import { getDailySunExposure } from '@/lib/integrations/supabase/wellbeing'; // Import sun exposure fetcher

// Interface for daily sun exposure data
interface DailySunExposureData {
  total_hours: number;
}

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();
  const userId = user?.id;
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [startProteinAnimation, setStartProteinAnimation] = useState(false);
  const [startSunAnimation, setStartSunAnimation] = useState(false);
  const [startCardioAnimation, setStartCardioAnimation] = useState(false);

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

  const { 
    data: dailySunExposure, 
    isLoading: isLoadingSunExposure, 
    isError: isErrorSunExposure, 
    error: sunExposureError 
  } = useQuery<
    DailySunExposureData,
    Error
  >(
    {
      queryKey: ['dailySunExposure', userId, todayDate],
      queryFn: async () => {
        if (!userId) { 
            return { total_hours: 0 }; 
        }
        // Assuming getDailySunExposure is already created and returns { total_hours: number }
        const exposure = await getDailySunExposure(userId, todayDate);
        return exposure;
      },
      enabled: !!userId, 
      staleTime: 1 * 60 * 1000, 
    }
  );

  // New query for weekly zone 2 cardio minutes
  const { 
    data: weeklyZone2Cardio, 
    isLoading: isLoadingZone2Cardio, 
    isError: isErrorZone2Cardio, 
    error: zone2CardioError 
  } = useQuery<
    WeeklyZone2CardioData,
    Error
  >(
    {
      queryKey: ['weeklyZone2Cardio', userId],
      queryFn: async () => {
        if (!userId) { 
            return { total_minutes: 0 }; 
        }
        try {
          const result = await getWeeklyZone2CardioMinutes(userId);
          return result;
        } catch (error) {
          // If the function doesn't exist yet, return mock data
          console.warn('Zone 2 cardio function not implemented yet, using mock data');
          return { total_minutes: 85 }; // Mock data
        }
      },
      enabled: !!userId, 
      staleTime: 5 * 60 * 1000, 
    }
  );

  useEffect(() => {
    let proteinTimer: NodeJS.Timeout;
    if (!isLoadingProtein && dailyProtein) {
      proteinTimer = setTimeout(() => {
        setStartProteinAnimation(true);
      }, 50); 
    } else if (isLoadingProtein) {
      setStartProteinAnimation(false);
    }
    return () => {
      clearTimeout(proteinTimer);
    };
  }, [isLoadingProtein, dailyProtein]);

  useEffect(() => {
    let sunTimer: NodeJS.Timeout;
    if (!isLoadingSunExposure && dailySunExposure) {
      sunTimer = setTimeout(() => {
        setStartSunAnimation(true);
      }, 50); 
    } else if (isLoadingSunExposure) {
      setStartSunAnimation(false);
    }
    return () => {
      clearTimeout(sunTimer);
    };
  }, [isLoadingSunExposure, dailySunExposure]);

  useEffect(() => {
    let cardioTimer: NodeJS.Timeout;
    if (!isLoadingZone2Cardio && weeklyZone2Cardio) {
      cardioTimer = setTimeout(() => {
        setStartCardioAnimation(true);
      }, 50); 
    } else if (isLoadingZone2Cardio) {
      setStartCardioAnimation(false);
    }
    return () => {
      clearTimeout(cardioTimer);
    };
  }, [isLoadingZone2Cardio, weeklyZone2Cardio]);

  const currentProteinIntake = dailyProtein?.total_protein ?? 0;
  const currentSunExposureHours = dailySunExposure?.total_hours ?? 0;
  const currentZone2CardioMinutes = weeklyZone2Cardio?.total_minutes ?? 0;
  const sunExposureGoalHours = 2; // Hardcoded goal for now
  const zone2CardioGoalMinutes = 150; // Default goal of 150 minutes per week

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

    const displayCurrent = startProteinAnimation ? currentProteinIntake : 0;
    const displayGoal = startProteinAnimation ? actualDisplayGoal : 0; 

    const goalStatusMessage =
      (startProteinAnimation || !isLoadingProtein) && isLoadingProfile && userId && !userProfile ? "Loading goal..." :
      (startProteinAnimation || !isLoadingProtein) && !isLoadingProfile && userId && (!userProfile || typeof userProfile.weight_kg !== 'number') ? "Set weight in profile for goal" :
      null;

    return (
      <div className="flex flex-col items-center">
        <CircularProgressDisplay
          currentValue={displayCurrent} 
          goalValue={displayGoal}
          label="Today's Protein"
          unit="g"
          size={140}
          barSize={12}
          showTooltip={startProteinAnimation && goalReady}
          showCenterText={startProteinAnimation}
        />
        {goalStatusMessage && (
          <p className="text-xs text-center text-muted-foreground mt-2">{goalStatusMessage}</p>
        )}
      </div>
    );
  };

  const renderSunExposureProgress = () => {
    if (isErrorSunExposure) {
      return <p className="text-sm text-destructive text-center">Error: {sunExposureError?.message || 'Could not load sun exposure'}</p>;
    }
    
    const displayCurrentSun = startSunAnimation ? currentSunExposureHours : 0;
    const displayGoalSun = startSunAnimation ? sunExposureGoalHours : 0;

    return (
      <SunMoonProgress 
        currentHours={displayCurrentSun}
        goalHours={displayGoalSun}
        size={140}
        barSize={10}
        label="Daily Sun Exposure"
      />
    );
  };

  const renderZone2CardioProgress = () => {
    if (isErrorZone2Cardio) {
      return <p className="text-sm text-destructive text-center">Error: {zone2CardioError?.message || 'Could not load cardio data'}</p>;
    }

    const displayCurrentCardio = startCardioAnimation ? currentZone2CardioMinutes : 0;
    const displayGoalCardio = startCardioAnimation ? zone2CardioGoalMinutes : 0;

    return (
      <div className="flex flex-col items-center">
        <CircularProgressDisplay
          currentValue={displayCurrentCardio} 
          goalValue={displayGoalCardio}
          label="Weekly Endurance"
          unit="min"
          size={140}
          barSize={12}
          defaultColor="#16A34A"
          highlightColor="#059669"
          showTooltip={startCardioAnimation}
          showCenterText={startCardioAnimation}
        />
      </div>
    );
  };

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction({}));
    navigate('/workout');
  };

  return (
    <div className="container mx-auto p-4">
        {/* <header className="flex flex-col items-center justify-between mb-8 text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 text-fitnessBlue dark:text-fitnessBlue uppercase font-montserrat">
            Stratos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Elevate your game</p>
        </header> */}

        <main className="mt-12">
          {/* Updated flex container for better mobile layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center mb-8">
            {renderProteinProgress()} 
            {renderSunExposureProgress()}
            {renderZone2CardioProgress()}
          </div>

          {/* Volume component underneath */}
          <div className="w-full"> 
            <Volume userId={userId} />
          </div>
        </main>
    </div>
  );
};

export default Home; 