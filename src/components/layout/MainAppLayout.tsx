import { Component, Suspense, lazy, type ReactNode } from "react";
import AppScreenSkeleton from "@/components/loading/AppScreenSkeleton";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import NavBar from "@/components/layout/NavBar";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/core/button";
import SummonSurface from "@/domains/guidance/ui/SummonSurface";
import PresencePeek from "@/domains/guidance/ui/PresencePeek";
import { PresenceAgentProvider } from "@/domains/guidance/hooks/PresenceAgentProvider";
import { SidebarInset, SidebarProvider } from "@/components/core/sidebar";
import { useOfflineWorkoutSync } from "@/domains/fitness/hooks/useOfflineWorkoutSync";
import { useQuickActions } from "@/domains/fitness/hooks/useQuickActions";
import {
  shouldAutoReloadRouteError,
  shouldRenderRouteLoadingState,
} from "@/components/layout/routeErrorRecovery";

const lazyWithRetry = <TModule extends { default: React.ComponentType<unknown> }>(
  importFn: () => Promise<TModule>
) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return importFn();
    }
  });

class RouteErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { hasError: boolean; retryNonce: number; autoRetryAttempted: boolean }
> {
  state = {
    hasError: false,
    lastError: null as Error | null,
    autoReloadScheduled: false,
    retryNonce: 0,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        autoReloadScheduled: false,
        hasError: false,
        lastError: null,
      });
    }
  }

  componentDidCatch(error: Error) {
    const shouldReload = shouldAutoReloadRouteError(error);
    this.setState({ autoReloadScheduled: shouldReload, lastError: error });

    if (shouldReload && this.state.retryNonce < 1) {
      window.setTimeout(() => {
        window.location.reload();
      }, 150);
    }
  }

  render() {
    if (
      shouldRenderRouteLoadingState({
        attempts: this.state.retryNonce,
        autoReloadScheduled: this.state.autoReloadScheduled,
        hasError: this.state.hasError,
      })
    ) {
      return <AppScreenSkeleton />;
    }

    if (this.state.hasError) {
      return (
        <div className="app-page">
          <div className="stone-surface rounded-[26px] p-6 text-sm text-muted-foreground space-y-3">
            <p>We couldn&apos;t load this screen.</p>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
            >
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AddSingleExerciseDialog = lazyWithRetry(
  () => import("@/domains/fitness/ui/AddSingleExerciseDialog")
);
const ProteinLogging = lazyWithRetry(
  () => import("@/domains/fitness/ui/ProteinLogging")
);
const SunExposureLogging = lazyWithRetry(
  () => import("@/domains/fitness/ui/SunExposureLogging")
);
const Home = lazyWithRetry(() => import("@/pages/Home"));
const Workout = lazyWithRetry(() => import("@/pages/Workout"));
const Analytics = lazyWithRetry(() => import("@/pages/Analytics"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const Settings = lazyWithRetry(() => import("@/pages/Settings"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));


const MainAppLayout = () => {
  useOfflineWorkoutSync();
  const location = useLocation();
  const {
    userId,
    latestSingleLogData,
    isAddExerciseDialogOpen,
    isProteinModalOpen,
    isSunExposureModalOpen,
    setIsAddExerciseDialogOpen,
    setIsProteinModalOpen,
    setIsSunExposureModalOpen,
    handleAddWorkout,
    handleAddExercise,
    handleLogProtein,
    handleLogSunExposure,
  } = useQuickActions();

  return (
    <PresenceAgentProvider>
      <SidebarProvider defaultOpen={false}>
      <div className="hidden md:block">
        <NavBar />
      </div>
      <SidebarInset className="app-shell">
        <RouteErrorBoundary resetKey={location.key}>
          <Suspense fallback={<AppScreenSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/coach" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/settings" element={<Settings />} />
              <Route path="/settings" element={<Navigate to="/profile/settings" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>

        <SummonSurface
            quickActions={{
              onStartWorkout: handleAddWorkout,
              onLogSingleExercise: handleAddExercise,
              onLogProtein: handleLogProtein,
              onLogSunExposure: handleLogSunExposure,
            }}
          />

        <PresencePeek />

        {isProteinModalOpen ? (
          <Suspense fallback={<div className="sr-only">Loading protein dialog</div>}>
            <ProteinLogging
              isOpen={isProteinModalOpen}
              onClose={() => setIsProteinModalOpen(false)}
              userId={userId}
            />
          </Suspense>
        ) : null}

        {isSunExposureModalOpen ? (
          <Suspense fallback={<div className="sr-only">Loading sun exposure dialog</div>}>
            <SunExposureLogging
              isOpen={isSunExposureModalOpen}
              onClose={() => setIsSunExposureModalOpen(false)}
              userId={userId}
            />
          </Suspense>
        ) : null}

        {isAddExerciseDialogOpen ? (
          <Suspense fallback={<div className="sr-only">Loading exercise dialog</div>}>
            <AddSingleExerciseDialog
              open={isAddExerciseDialogOpen}
              onOpenChange={setIsAddExerciseDialogOpen}
              defaultLogData={latestSingleLogData}
            />
          </Suspense>
        ) : null}
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
    </PresenceAgentProvider>
  );
};

export default MainAppLayout;
