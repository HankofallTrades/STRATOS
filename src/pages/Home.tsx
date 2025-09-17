import { Button } from "@/components/core/button";
import { useAppSelector, useAppDispatch } from "@/hooks/redux"; // Import Redux hooks
import { selectCurrentWorkout, selectWorkoutStartTime, startWorkout as startWorkoutAction } from "@/state/workout/workoutSlice"; // Import selectors and actions
import { Clock, Sun, Feather } from "lucide-react";
import { FlowerLotus } from "@phosphor-icons/react";
import { formatTime } from "@/lib/utils/timeUtils";
import WorkoutComponent from "@/components/features/Workout/WorkoutComponent";
import { useAuth } from '@/state/auth/AuthProvider'; // Assuming this path is correct
import { useElapsedTime } from "@/hooks/useElapsedTime"; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useMemo, useState, useEffect, useCallback } from 'react'; // ADDED useState, useEffect
import { useQuery } from '@tanstack/react-query';
import { getUserProfile, UserProfileData } from '@/lib/integrations/supabase/user';
import { getDailyProteinIntake, DailyProteinIntake, getWeeklyZone2CardioMinutes, WeeklyZone2CardioData } from '@/lib/integrations/supabase/nutrition';
import CircularProgressDisplay from '@/components/core/charts/CircularProgressDisplay';
import Volume from '@/components/features/Analytics/Volume'; // Import Volume component
import SunMoonProgress from '@/components/core/charts/SunMoonProgress'; // Import SunMoonProgress
import { getDailySunExposure } from '@/lib/integrations/supabase/wellbeing'; // Import sun exposure fetcher
import { Toggle } from '@/components/core/Toggle/toggle';
import { ensureTriadHabits, getHabitCompletionsForDate, setHabitCompletion } from '@/lib/integrations/supabase/habits';

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
  type DisciplineKey = 'meditation' | 'movement' | 'writing'
  type DisciplineState = Record<DisciplineKey, boolean>

  const getStorageKey = useCallback(() => {
    const keyUser = userId ?? 'anon'
    return `discipline:${keyUser}:${todayDate}`
  }, [userId, todayDate])

  const [discipline, setDiscipline] = useState<DisciplineState>({
    meditation: false,
    movement: false,
    writing: false,
  })
  const [habitIdMap, setHabitIdMap] = useState<Record<DisciplineKey, string>>({
    meditation: '',
    movement: '',
    writing: '',
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey())
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DisciplineState>
        setDiscipline((prev) => ({ ...prev, ...parsed }))
      } else {
        // new day or new user: reset to defaults
        setDiscipline({ meditation: false, movement: false, writing: false })
      }
    } catch {
      // ignore malformed localStorage
    }
  }, [getStorageKey])

  // Sync with Supabase when logged in
  useEffect(() => {
    const sync = async () => {
      if (!userId) return
      try {
        const triad = await ensureTriadHabits(userId)
        const byTitle: Record<string, string> = {}
        for (const h of triad) byTitle[h.title.toLowerCase()] = h.id
        setHabitIdMap({
          meditation: byTitle['meditation'] ?? '',
          movement: byTitle['movement'] ?? '',
          writing: byTitle['writing'] ?? '',
        })

        const serverMap = await getHabitCompletionsForDate(userId, todayDate)

        // merge server completions into local state (server is source of truth if true)
        setDiscipline((prev) => {
          const next = { ...prev }
          const entries: [DisciplineKey, string][] = [
            ['meditation', byTitle['meditation'] ?? ''],
            ['movement', byTitle['movement'] ?? ''],
            ['writing', byTitle['writing'] ?? ''],
          ]
          for (const [k, id] of entries) {
            if (id && serverMap[id]) next[k] = true
          }
          return next
        })
      } catch (e) {
        console.warn('Failed to sync habits with Supabase', e)
      }
    }
    sync()
  }, [userId, todayDate])

  const setDisciplineAndPersist = useCallback((next: DisciplineState) => {
    setDiscipline(next)
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(next))
    } catch {
      // ignore storage failures
    }
  }, [getStorageKey])

  const toggleDiscipline = useCallback(async (key: DisciplineKey) => {
    const next = { ...discipline, [key]: !discipline[key] }
    setDisciplineAndPersist(next)
    // best-effort server sync
    try {
      if (userId) {
        const habitId = habitIdMap[key]
        if (habitId) {
          await setHabitCompletion(userId, habitId, todayDate, next[key])
        }
      }
    } catch (e) {
      console.warn('Failed to set habit completion', e)
    }
  }, [discipline, setDisciplineAndPersist, userId, habitIdMap, todayDate])

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
    const size = 64
    const onColor = 'text-white'
    const offColor = 'text-muted-foreground'

    return (
      <section className="mb-6">
        <h2 className="text-center text-base font-semibold tracking-wide text-muted-foreground">Discipline</h2>
        <div className="relative mx-auto mt-4" style={{ width: 220, height: 190 }}>
          {/* Top vertex - Meditation */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }}>
            <Toggle
              pressed={discipline.meditation}
              onPressedChange={() => toggleDiscipline('meditation')}
              aria-label="Meditation habit"
              className={`h-16 w-16 rounded-full border ${discipline.meditation ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-background '}`}
            >
              <FlowerLotus size={size / 2} className={discipline.meditation ? onColor : offColor} />
            </Toggle>
            <p className="mt-2 text-center text-xs text-muted-foreground">Meditation</p>
          </div>

          {/* Bottom-left vertex - Movement */}
          <div className="absolute" style={{ left: 10, bottom: 0 }}>
            <Toggle
              pressed={discipline.movement}
              onPressedChange={() => toggleDiscipline('movement')}
              aria-label="Movement habit"
              className={`h-16 w-16 rounded-full border ${discipline.movement ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-background '}`}
            >
              <Sun size={size / 2} className={discipline.movement ? 'text-white' : offColor} />
            </Toggle>
            <p className="mt-2 text-center text-xs text-muted-foreground">Movement</p>
          </div>

          {/* Bottom-right vertex - Writing */}
          <div className="absolute" style={{ right: 10, bottom: 0 }}>
            <Toggle
              pressed={discipline.writing}
              onPressedChange={() => toggleDiscipline('writing')}
              aria-label="Writing habit"
              className={`h-16 w-16 rounded-full border ${discipline.writing ? 'bg-primary text-primary-foreground border-blue-600 shadow-md' : 'bg-background '}`}
            >
              <Feather size={size / 2} className={discipline.writing ? 'text-white' : offColor} />
            </Toggle>
            <p className="mt-2 text-center text-xs text-muted-foreground">Writing</p>
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
    <div className="container mx-auto p-4">
        {/* <header className="flex flex-col items-center justify-between mb-8 text-center mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2 text-fitnessBlue dark:text-fitnessBlue uppercase font-montserrat">
            Stratos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Elevate your game</p>
        </header> */}

        <main className="mt-12">
          {renderDisciplineTriad()}
          {/* Widgets moved to Analytics page */}
        </main>
    </div>
  );
};

export default Home; 