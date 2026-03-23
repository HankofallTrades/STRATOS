import { Suspense, lazy } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/core/tabs";
import { Skeleton } from "@/components/core/skeleton";
import { useAnalyticsScreen } from "@/domains/analytics/hooks/useAnalyticsScreen";
import { isAnalysisType } from "@/domains/analytics/data/analyticsScreen";

const StrengthBenchmarks = lazy(
  () => import("@/domains/analytics/ui/benchmarks/StrengthBenchmarks")
);
const CalisthenicBenchmarks = lazy(
  () => import("@/domains/analytics/ui/benchmarks/CalisthenicBenchmarks")
);
const OneRepMax = lazy(() => import("@/domains/analytics/ui/OneRepMax"));
const RecentWorkouts = lazy(
  () => import("@/domains/analytics/ui/RecentWorkouts")
);
const Volume = lazy(() => import("@/domains/analytics/ui/Volume"));
const PerformanceOverview = lazy(
  () => import("@/domains/analytics/ui/PerformanceOverview")
);
const CircularProgressDisplay = lazy(
  () => import("@/components/core/charts/CircularProgressDisplay")
);
const SunMoonProgress = lazy(
  () => import("@/components/core/charts/SunMoonProgress")
);

/** Mirrors PerformanceOverview: 4-col stat grid (icon + label / big value) */
const PerformanceOverviewFallback = () => (
  <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-9 w-3/4" />
        </div>
      ))}
    </div>
  </section>
);

/** Mirrors OneRepMax: exercise selector + time-range chips + chart area */
const OneRepMaxFallback = () => (
  <>
    <Skeleton className="mb-4 h-8 w-48" />
    <div className="mb-4 flex flex-wrap gap-1.5">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-10 rounded-[12px]" />
      ))}
    </div>
    <Skeleton className="h-[400px] w-full rounded-[16px]" />
  </>
);

/** Mirrors Volume: 2-col grid of archetype label + sets count + progress bar */
const VolumeFallback = () => (
  <div className="grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    ))}
  </div>
);

/** Mirrors Benchmarks: dropdown header + 5 exercise progress bars */
const BenchmarksFallback = () => (
  <div className="relative">
    <div className="mb-4 flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-6 w-28" />
    </div>
    <div className="space-y-5">
      {[...Array(5)].map((_, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

/** Mirrors RecentWorkouts: title + 3 workout rows (name / sets / exercises) */
const RecentWorkoutsFallback = () => (
  <section className="stone-surface rounded-[26px] p-5 md:p-6">
    <Skeleton className="h-7 w-44" />
    <div className="mt-5 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border-t border-white/6 pt-4 first:border-t-0 first:pt-0">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-3 h-4 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
      ))}
    </div>
  </section>
);

const RecoveryMarkerFallback = () => (
  <Skeleton className="h-[112px] w-[112px] rounded-full" />
);

const AnalyticsScreen = () => {
  const {
    accentColor,
    accentHighlightColor,
    currentProtein,
    currentSunHours,
    currentZone2Minutes,
    errorExercises,
    exercises,
    isLoadingExercises,
    proteinGoal,
    proteinMeta,
    selectedAnalysisType,
    selectedBenchmarkType,
    setSelectedAnalysisType,
    setSelectedBenchmarkType,
    sunExposureGoalHours,
    sunMeta,
    userId,
    zone2CardioGoalMinutes,
    zone2Meta,
  } = useAnalyticsScreen();

  return (
    <div className="app-page">
      <main className="space-y-6">
        <Suspense fallback={<PerformanceOverviewFallback />}>
          <PerformanceOverview userId={userId} exercises={exercises} />
        </Suspense>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,0.85fr)]">
          <div className="stone-surface overflow-hidden rounded-[26px]">
            <Tabs
              value={selectedAnalysisType}
              onValueChange={value => {
                if (isAnalysisType(value)) {
                  setSelectedAnalysisType(value);
                }
              }}
              className="w-full"
            >
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
                  <Suspense fallback={<OneRepMaxFallback />}>
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
                  <Suspense fallback={<VolumeFallback />}>
                    <Volume userId={userId} embedded={true} />
                  </Suspense>
                </TabsContent>
                <TabsContent value="Benchmarks" className="mt-0">
                  <Suspense fallback={<BenchmarksFallback />}>
                    {selectedBenchmarkType === "Strength" ? (
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
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Recovery
            </h2>

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
                      defaultColor={accentColor}
                      highlightColor={accentHighlightColor}
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
                      defaultColor={accentColor}
                      highlightColor={accentHighlightColor}
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
          <Suspense fallback={<RecentWorkoutsFallback />}>
            <RecentWorkouts userId={userId} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsScreen;
