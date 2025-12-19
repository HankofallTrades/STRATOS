import { Button } from "@/components/core/button";
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";

import { FlowerLotus } from "@phosphor-icons/react";
import { Sun, Feather } from "lucide-react";
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this path is correct
import { useElapsedTime } from "@/hooks/useElapsedTime"; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useMemo, useState, useEffect, useCallback } from 'react'; // ADDED useState, useEffect
import { useQuery } from '@tanstack/react-query';
import { getUserProfile, UserProfileData } from '@/lib/integrations/supabase/user';
import { getDailyProteinIntake, DailyProteinIntake, getWeeklyZone2CardioMinutes, WeeklyZone2CardioData } from '@/domains/fitness/model/fitnessRepository';
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
import Volume from '@/domains/fitness/view/analytics/Volume'; // Import Volume component
import SunMoonProgress from '@/components/core/charts/SunMoonProgress'; // Import SunMoonProgress
import { getDailySunExposure } from '@/domains/fitness/model/fitnessRepository'; // Import sun exposure fetcher
import { useTriad, useHabitCompletions, HabitButton } from '@/domains/habits';
import { useTheme } from '@/lib/themes';

// Interface for daily sun exposure data
interface DailySunExposureData {
  total_hours: number;
}

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const userId = user?.id;
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { habits, isLoading: isLoadingHabits } = useTriad(userId)
  const { completions, isLoading: isLoadingCompletions, toggleCompletion, isToggling, pendingIds } = useHabitCompletions(userId, todayDate)

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

  const renderDisciplineTriad = () => {
    return (
      <section className="mb-6 bg-card border border-border rounded-2xl p-8 shadow-xl">
        <h2 className="text-center text-xl font-bold tracking-[0.2em] text-primary font-serif mb-2">DISCIPLINE</h2>
        <div className="text-center mb-6">
          <div className="inline-block w-16 h-0.5 bg-primary opacity-80"></div>
        </div>
        <div className="relative mx-auto mt-4" style={{ width: 220, height: 190 }}>
          {/* Meditation */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }}>
            <HabitButton
              label="Meditation"
              pressed={!!(habits.find(h => h.title.toLowerCase() === 'meditation') && completions[habits.find(h => h.title.toLowerCase() === 'meditation')!.id])}
              disabled={isLoadingHabits || !!(habits.find(h => h.title.toLowerCase() === 'meditation') && pendingIds[habits.find(h => h.title.toLowerCase() === 'meditation')!.id])}
              onPressedChange={() => {
                const h = habits.find(h => h.title.toLowerCase() === 'meditation');
                if (!h) return; const next = !completions[h.id]; toggleCompletion(h.id, next);
              }}
              icon={<FlowerLotus size={32} />}
              activeClassName="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-indigo-500"
            />
          </div>

          {/* Movement */}
          <div className="absolute" style={{ left: 10, bottom: 0 }}>
            <HabitButton
              label="Movement"
              pressed={!!(habits.find(h => h.title.toLowerCase() === 'movement') && completions[habits.find(h => h.title.toLowerCase() === 'movement')!.id])}
              disabled={isLoadingHabits || !!(habits.find(h => h.title.toLowerCase() === 'movement') && pendingIds[habits.find(h => h.title.toLowerCase() === 'movement')!.id])}
              onPressedChange={() => {
                const h = habits.find(h => h.title.toLowerCase() === 'movement');
                if (!h) return; const next = !completions[h.id]; toggleCompletion(h.id, next);
              }}
              icon={<Sun size={32} />}
              activeClassName="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400"
            />
          </div>

          {/* Writing */}
          <div className="absolute" style={{ right: 10, bottom: 0 }}>
            <HabitButton
              label="Writing"
              pressed={!!(habits.find(h => h.title.toLowerCase() === 'writing') && completions[habits.find(h => h.title.toLowerCase() === 'writing')!.id])}
              disabled={isLoadingHabits || !!(habits.find(h => h.title.toLowerCase() === 'writing') && pendingIds[habits.find(h => h.title.toLowerCase() === 'writing')!.id])}
              onPressedChange={() => {
                const h = habits.find(h => h.title.toLowerCase() === 'writing');
                if (!h) return; const next = !completions[h.id]; toggleCompletion(h.id, next);
              }}
              icon={<Feather size={32} />}
              activeClassName="bg-gradient-to-br from-blue-600 to-cyan-700 text-white border-blue-500"
            />
          </div>
        </div>
      </section>
    );
  }

  const handleStartWorkout = () => {
    dispatch(startWorkoutAction({}));
    navigate('/workout');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4">
        <header className="flex flex-col items-center justify-between mb-12 text-center pt-8">
          <h1 className="text-6xl md:text-7xl font-bold mb-3 text-primary drop-shadow-lg font-serif tracking-wider">
            {currentTheme.brand.name}
          </h1>
          <p className="text-muted-foreground mb-6 text-lg font-medium italic tracking-wide">
            {currentTheme.brand.tagline}
          </p>
          <div className="w-32 h-0.5 bg-primary opacity-60"></div>
        </header>

        <main className="mt-8">
          {renderDisciplineTriad()}
          {/* Widgets moved to Analytics page */}
        </main>
      </div>
    </div>
  );
};

export default Home; 