import React, { Suspense, lazy, useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { Exercise } from "@/lib/types/workout";
import { useAuth } from '@/state/auth/AuthProvider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/core/tabs";
import {
  getUserWeight,
  getDailyProteinIntake,
  DailyProteinIntake,
  UserWeight,
  getWeeklyZone2CardioMinutes,
  WeeklyZone2CardioData,
  getDailySunExposure
} from "@/domains/fitness/model/fitnessRepository";

const StrengthBenchmarks = lazy(() => import('@/domains/analytics/view/benchmarks/StrengthBenchmarks'));
const CalisthenicBenchmarks = lazy(() => import('@/domains/analytics/view/benchmarks/CalisthenicBenchmarks'));
const OneRepMax = lazy(() => import('@/domains/analytics/view/OneRepMax'));
const RecentWorkouts = lazy(() => import('@/domains/analytics/view/RecentWorkouts'));
const Volume = lazy(() => import('@/domains/analytics/view/Volume'));
const PerformanceOverview = lazy(() => import('@/domains/analytics/view/PerformanceOverview'));
const CircularProgressDisplay = lazy(() => import('@/components/core/charts/CircularProgressDisplay'));
const SunMoonProgress = lazy(() => import('@/components/core/charts/SunMoonProgress'));

// LocalStorage Key for persistence
const ANALYTICS_VIEW_STORAGE_KEY = 'selectedAnalyticsView_v2';

// Define Benchmark Type
type BenchmarkType = 'Strength' | 'Calisthenics';

// Define Analysis Type
type AnalysisType = 'E1RM' | 'Volume' | 'Benchmarks';

const ANALYTICS_ACCENT = '#1e5c52';
const ANALYTICS_ACCENT_HIGHLIGHT = '#7cad9d';

const AnalyticsPanelFallback = ({ label }: { label: string }) => (
  <div className="stone-surface rounded-[26px] p-5 text-left text-sm text-muted-foreground md:p-6">
    Loading {label.toLowerCase()}...
  </div>
);

const RecoveryMarkerFallback = () => (
  <div className="flex h-[12.5rem] w-full items-center justify-center text-sm text-muted-foreground">
    Loading marker...
  </div>
);

const Analytics = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: exercises = [] as Exercise[], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => (await fetchExercisesFromDB()) as Exercise[],
    staleTime: Infinity,
  });

  const [selectedBenchmarkType, setSelectedBenchmarkType] = useState<BenchmarkType>('Strength');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>(() => {
    try {
      const storedView = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
      if (storedView === 'E1RM' || storedView === 'Volume' || storedView === 'Benchmarks') {
        return storedView as AnalysisType;
      }
    } catch (error) {
      console.error("Error reading analysis view from localStorage:", error);
    }
    return 'E1RM';
  });

  useEffect(() => {
    try {
      localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, selectedAnalysisType);
    } catch (error) {
      console.error("Error saving analysis view to localStorage:", error);
    }
  }, [selectedAnalysisType]);

  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { data: userWeightData } = useQuery<UserWeight | null, Error>({
    queryKey: ['userWeight', userId],
    queryFn: async () => userId ? getUserWeight(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyProteinData } = useQuery<DailyProteinIntake | null, Error>({
    queryKey: ['dailyProteinIntake', userId, todayDate],
    queryFn: async () => userId ? getDailyProteinIntake(userId, todayDate) : null,
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 1 * 60 * 1000,
  });

  const { data: dailySunExposure } = useQuery<{ total_hours: number } | null, Error>({
    queryKey: ['dailySunExposure', userId, todayDate],
    queryFn: async () => userId ? getDailySunExposure(userId, todayDate) : null,
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });

  const { data: weeklyZone2Cardio } = useQuery<WeeklyZone2CardioData | null, Error>({
    queryKey: ['weeklyZone2Cardio', userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        return await getWeeklyZone2CardioMinutes(userId);
      } catch {
        return { total_minutes: 0 } as WeeklyZone2CardioData;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const proteinGoal = useMemo(() => {
    if (userWeightData?.weight_kg) {
      return Math.round(userWeightData.weight_kg * 2);
    }
    return 0;
  }, [userWeightData]);

  const currentProtein = dailyProteinData?.total_protein || 0;
  const currentSunHours = dailySunExposure?.total_hours || 0;
  const currentZone2Minutes = weeklyZone2Cardio?.total_minutes || 0;

  const sunExposureGoalHours = 2;
  const zone2CardioGoalMinutes = 150;
  const proteinMeta = proteinGoal > 0
    ? `${proteinGoal}g goal`
    : 'Set bodyweight goal';
  const sunMeta = `${sunExposureGoalHours}h today`;
  const zone2Meta = `${zone2CardioGoalMinutes} min week`;

  return (
    <div className="app-page">
      <main className="space-y-6">
        <Suspense fallback={<AnalyticsPanelFallback label="performance overview" />}>
          <PerformanceOverview userId={userId} exercises={exercises} />
        </Suspense>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
          <div className="stone-surface overflow-hidden rounded-[26px]">
            <Tabs value={selectedAnalysisType} onValueChange={(value) => setSelectedAnalysisType(value as AnalysisType)} className="w-full">
              <div className="px-2 pt-2">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-none bg-transparent p-0">
                  <TabsTrigger
                    value="E1RM"
                    className="min-h-[3.25rem] rounded-[14px] px-3 py-2.5 text-sm font-medium text-foreground/64 data-[state=active]:bg-white/[0.05] data-[state=active]:text-foreground"
                  >
                    Estimated 1RM
                  </TabsTrigger>
                  <TabsTrigger
                    value="Volume"
                    className="min-h-[3.25rem] rounded-[14px] px-3 py-2.5 text-sm font-medium text-foreground/64 data-[state=active]:bg-white/[0.05] data-[state=active]:text-foreground"
                  >
                    Volume
                  </TabsTrigger>
                  <TabsTrigger
                    value="Benchmarks"
                    className="min-h-[3.25rem] rounded-[14px] px-3 py-2.5 text-sm font-medium text-foreground/64 data-[state=active]:bg-white/[0.05] data-[state=active]:text-foreground"
                  >
                    Benchmarks
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-5 md:p-6">
                <TabsContent value="E1RM" className="mt-0">
                  <Suspense fallback={<AnalyticsPanelFallback label="estimated 1RM" />}>
                    <OneRepMax
                      userId={userId}
                      exercises={exercises}
                      isLoadingExercises={isLoadingExercises}
                      errorExercises={errorExercises}
                      embedded={true}
                    />
                  </Suspense>
                </TabsContent>
                <TabsContent value="Volume" className="mt-0">
                  <Suspense fallback={<AnalyticsPanelFallback label="volume" />}>
                    <Volume
                      userId={userId}
                      embedded={true}
                    />
                  </Suspense>
                </TabsContent>
                <TabsContent value="Benchmarks" className="mt-0">
                  <Suspense fallback={<AnalyticsPanelFallback label="benchmarks" />}>
                    {selectedBenchmarkType === 'Strength' ? (
                      <StrengthBenchmarks
                        userId={userId}
                        exercises={exercises}
                        currentType={selectedBenchmarkType}
                        onTypeChange={setSelectedBenchmarkType}
                        embedded={true}
                      />
                    ) : (
                      <CalisthenicBenchmarks
                        userId={userId}
                        exercises={exercises}
                        currentType={selectedBenchmarkType}
                        onTypeChange={setSelectedBenchmarkType}
                        embedded={true}
                      />
                    )}
                  </Suspense>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <section className="stone-surface rounded-[26px] p-5 md:p-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Recovery</h2>

            <div className="mt-4 divide-y divide-white/6">
              <div className="grid gap-4 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-foreground">Protein</h3>
                  <span className="text-sm text-muted-foreground">{proteinMeta}</span>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Suspense fallback={<RecoveryMarkerFallback />}>
                    <CircularProgressDisplay
                      currentValue={currentProtein}
                      goalValue={proteinGoal}
                      unit="g"
                      size={112}
                      barSize={11}
                      defaultColor={ANALYTICS_ACCENT}
                      highlightColor={ANALYTICS_ACCENT_HIGHLIGHT}
                      showTooltip={!!userId && proteinGoal > 0}
                      showCenterText={true}
                    />
                  </Suspense>
                </div>
              </div>

              <div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-foreground">Sunlight</h3>
                  <span className="text-sm text-muted-foreground">{sunMeta}</span>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Suspense fallback={<RecoveryMarkerFallback />}>
                    <SunMoonProgress
                      currentHours={currentSunHours}
                      goalHours={sunExposureGoalHours}
                      size={112}
                      barSize={10}
                    />
                  </Suspense>
                </div>
              </div>

              <div className="grid gap-4 pb-0 pt-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-foreground">Zone 2</h3>
                  <span className="text-sm text-muted-foreground">{zone2Meta}</span>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Suspense fallback={<RecoveryMarkerFallback />}>
                    <CircularProgressDisplay
                      currentValue={currentZone2Minutes}
                      goalValue={zone2CardioGoalMinutes}
                      unit="min"
                      size={112}
                      barSize={11}
                      defaultColor={ANALYTICS_ACCENT}
                      highlightColor={ANALYTICS_ACCENT_HIGHLIGHT}
                      showTooltip={true}
                      showCenterText={true}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          </section>
        </section>

        <div>
          <Suspense fallback={<AnalyticsPanelFallback label="recent workouts" />}>
            <RecentWorkouts userId={userId} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
