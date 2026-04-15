import { Component, Suspense, lazy, type ReactNode } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import NavBar from "@/components/layout/NavBar";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/core/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/core/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/core/sidebar";
import { useOfflineWorkoutSync } from "@/domains/fitness/hooks/useOfflineWorkoutSync";
import { useQuickActions } from "@/domains/fitness/hooks/useQuickActions";

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
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-page">
          <div className="stone-surface rounded-[26px] p-6 text-sm text-muted-foreground">
            We couldn&apos;t load this screen yet. Please try again.
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
const Coach = lazyWithRetry(() => import("@/pages/Coach"));
const Settings = lazyWithRetry(() => import("@/pages/Settings"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

const RouteFallback = () => (
  <div className="app-page">
    <div className="stone-surface min-h-[16rem] animate-pulse rounded-[26px]" />
  </div>
);

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

  const shouldShowGlobalFab = ![
    "/",
    "/workout",
    "/analytics",
    "/coach",
    "/settings",
  ].includes(location.pathname);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="hidden md:block">
        <NavBar />
      </div>
      <SidebarInset className="app-shell">
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>

        {shouldShowGlobalFab && (
          <div className="fixed bottom-20 right-6 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg text-primary-foreground"
                >
                  <Plus size={24} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem onSelect={handleAddWorkout} className="focus:bg-accent focus:text-accent-foreground">
                  Start New Workout
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAddExercise} className="focus:bg-accent focus:text-accent-foreground">
                  Log Single Exercise
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogProtein} className="focus:bg-accent focus:text-accent-foreground">
                  Log Protein
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogSunExposure} className="focus:bg-accent focus:text-accent-foreground">
                  Log Sun Exposure
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isProteinModalOpen ? (
          <Suspense fallback={null}>
            <ProteinLogging
              isOpen={isProteinModalOpen}
              onClose={() => setIsProteinModalOpen(false)}
              userId={userId}
            />
          </Suspense>
        ) : null}

        {isSunExposureModalOpen ? (
          <Suspense fallback={null}>
            <SunExposureLogging
              isOpen={isSunExposureModalOpen}
              onClose={() => setIsSunExposureModalOpen(false)}
              userId={userId}
            />
          </Suspense>
        ) : null}

        {isAddExerciseDialogOpen ? (
          <Suspense fallback={null}>
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
  );
};

export default MainAppLayout;
