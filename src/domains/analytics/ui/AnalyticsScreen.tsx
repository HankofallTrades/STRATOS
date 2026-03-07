import { Suspense, lazy } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/core/tabs";
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
        <Suspense fallback={<AnalyticsPanelFallback label="performance overview" />}>
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
                    <Volume userId={userId} embedded={true} />
                  </Suspense>
                </TabsContent>
                <TabsContent value="Benchmarks" className="mt-0">
                  <Suspense fallback={<AnalyticsPanelFallback label="benchmarks" />}>
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
          <Suspense fallback={<AnalyticsPanelFallback label="recent workouts" />}>
            <RecentWorkouts userId={userId} />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsScreen;
