import { Trophy } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/core/card";
import { Button } from "@/components/core/button";
import { Skeleton } from "@/components/core/skeleton";
import { useHomeDashboard } from "@/domains/dashboard/hooks/useHomeDashboard";

const HomeDashboard = () => {
  const {
    isLoadingLastSession,
    isLoadingRecentPr,
    displayName,
    greeting,
    movementStreakLabel,
    todayWorkoutTitle,
    todayWorkoutDetail,
    sessionActionLabel,
    lastSessionSummary,
    recentPr,
    habitItems,
    handleToggleHabit,
    goToWorkout,
  } = useHomeDashboard();

  return (
    <div className="app-page">
      <header className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="app-kicker">{greeting}, {displayName}</p>
          <h1 className="app-page-title">Time to train.</h1>
        </div>
        <div className="self-start text-sm font-medium md:self-auto">
          <span className="home-header-status warm-metal-text">{movementStreakLabel}</span>
        </div>
      </header>

      <main className="space-y-4">
        <Card className="home-session-card stone-panel stone-panel-hero overflow-hidden border-white/10">
          <CardContent className="relative flex flex-col gap-5 px-6 pb-6 pt-7 md:flex-row md:items-center md:justify-between md:gap-6 md:px-8 md:pb-7 md:pt-8">
            <div className="space-y-3">
              <div className="app-kicker">Today&apos;s Workout</div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {todayWorkoutTitle}
                </h2>
                <p className="text-sm text-muted-foreground md:text-base">
                  {todayWorkoutDetail}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col items-start gap-3 md:w-auto md:min-w-[15rem] md:items-end">
              <Button
                onClick={goToWorkout}
                size="lg"
                className="home-session-cta app-primary-action h-11 w-full rounded-[18px] px-6 text-base font-semibold md:w-auto md:min-w-[14rem]"
              >
                {sessionActionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="home-data-card">
            <CardHeader className="pb-1 pt-4 md:px-5 md:pt-5">
              <div className="app-kicker">Last Session</div>
            </CardHeader>
            <CardContent className="space-y-1 pb-5 pt-0 md:px-5 md:pb-5">
              {isLoadingLastSession ? (
                <>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </>
              ) : lastSessionSummary ? (
                <>
                  <p className="text-lg font-semibold text-foreground">{lastSessionSummary.title}</p>
                  <p className="text-sm text-muted-foreground">{lastSessionSummary.subtitle}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="home-data-card">
            <CardHeader className="pb-1 pt-4 md:px-5 md:pt-5">
              <div className="app-kicker">Recent PR</div>
            </CardHeader>
            <CardContent className="space-y-1 pb-5 pt-0 md:px-5 md:pb-5">
              {isLoadingRecentPr ? (
                <>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-56" />
                </>
              ) : recentPr ? (
                <>
                  <p className="text-lg font-semibold text-foreground">{recentPr.exerciseName}</p>
                  <div className="space-y-1.5">
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <p className="inline-flex items-center gap-1.5 font-medium text-foreground/88">
                        <Trophy className="h-3.5 w-3.5 verdigris-text" />
                        <span>
                          {recentPr.topSetWeightLabel && recentPr.topSetRepsLabel
                            ? `${recentPr.topSetWeightLabel} x ${recentPr.topSetRepsLabel}`
                            : "PR set"}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        (e1RM {recentPr.currentE1RMLabel})
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{recentPr.whenLabel}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No e1RM PR increase recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="home-habit-strip">
          <CardContent className="py-3.5 md:px-5">
            <div className="home-habit-grid">
              {habitItems.map(item => (
                <button
                  key={item.label}
                  type="button"
                  className="home-habit-option app-inline-action inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed"
                  data-done={item.done ? "true" : "false"}
                  disabled={item.disabled}
                  onClick={() => handleToggleHabit(item.id, item.done)}
                >
                  <span className={item.done ? "verdigris-text" : "text-muted-foreground"}>
                    {item.done ? "◉" : "○"}
                  </span>
                  <span className={item.done ? "text-foreground" : ""}>{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HomeDashboard;
