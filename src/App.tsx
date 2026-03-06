import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ThemeProvider } from "@/lib/themes";
import NavBar from "@/components/layout/NavBar";
import BottomNav from "@/components/layout/BottomNav";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Home from "./pages/Home";
// FAB Imports
import { Button } from "@/components/core/button";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/core/dropdown-menu"
// Imports for Save Workout Logic
import React, { Suspense, lazy, useState } from 'react';
import { useAppDispatch } from "@/hooks/redux";
import {
  startWorkout as startWorkoutAction
} from "@/state/workout/workoutSlice";
import { supabase } from '@/lib/integrations/supabase/client';
import { Tables } from '@/lib/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import { SidebarProvider, SidebarInset } from "@/components/core/sidebar";

const Workout = lazy(() => import("./pages/Workout"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
const Coach = lazy(() => import("./pages/Coach"));
const AddSingleExerciseDialog = lazy(() => import('@/domains/fitness/view/AddSingleExerciseDialog'));
const ProteinLogging = lazy(() => import("@/domains/fitness/view/ProteinLogging"));
const SunExposureLogging = lazy(() => import("@/domains/fitness/view/SunExposureLogging"));

// Interface for the latest single log data
interface LatestSingleLogData extends Tables<'exercise_sets'> {
  exercise_id: string; // Ensure exercise_id is present (from workout_exercises)
}

const RouteFallback = () => (
  <div className="app-page flex min-h-[40svh] items-center justify-center">
    <div className="app-kicker">Loading</div>
  </div>
);

const renderDeferredRoute = (element: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>
    {element}
  </Suspense>
);

// Main Application Layout (for authenticated users)
const MainAppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
  const [isSunExposureModalOpen, setIsSunExposureModalOpen] = useState(false);
  const currentUserId = user?.id ?? null;

  // *** Query to fetch the latest single exercise log ***
  const { data: latestSingleLogData } = useQuery<LatestSingleLogData | null>({
    queryKey: ['latestSingleLog', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Define the expected nested structure type explicitly
      type NestedSetData = Tables<'exercise_sets'> & {
        workout_exercises: { exercise_id: string } | null;
      };

      const { data, error } = await supabase
        .from('exercise_sets')
        .select(`
                  *, 
                  workout_exercises!inner(
                      exercise_id, 
                      workouts!inner(is_single_log, user_id)
                  )
              `)
        .eq('workout_exercises.workouts.user_id', user.id)
        .eq('workout_exercises.workouts.is_single_log', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<NestedSetData[]>() // Use .returns<Type[]>()
        .maybeSingle(); // Use maybeSingle() which works with .returns<Type[]>()

      if (error) {
        console.error("Error fetching latest single log:", error);
        return null;
      }

      // Now safely extract exercise_id if data and nested structure exist
      if (data && data.workout_exercises) {
        const result: LatestSingleLogData = {
          ...data,
          exercise_id: data.workout_exercises.exercise_id
        };
        // Remove the nested structure before returning if needed, or adjust LatestSingleLogData interface
        // delete (result as any).workout_exercises;
        return result;
      }
      return null; // Return null if data or nested structure is missing
    },
    enabled: !!user?.id && isAddExerciseDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddWorkout = () => {
    dispatch(startWorkoutAction({}));
    navigate('/workout');
  };

  const handleAddExercise = () => {
    setIsAddExerciseDialogOpen(true);
  };

  const handleLogProtein = () => {
    setIsProteinModalOpen(true);
  };

  const handleLogSunExposure = () => {
    setIsSunExposureModalOpen(true);
  };

  const shouldShowGlobalFab = location.pathname !== '/coach' && location.pathname !== '/' && location.pathname !== '/workout';

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="hidden md:block">
        <NavBar />
      </div>
      <SidebarInset className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={renderDeferredRoute(<Workout />)} />
          <Route path="/analytics" element={renderDeferredRoute(<Analytics />)} />
          <Route path="/coach" element={renderDeferredRoute(<Coach />)} />
          <Route path="/settings" element={renderDeferredRoute(<Settings />)} />
          <Route path="*" element={renderDeferredRoute(<NotFound />)} />
        </Routes>

        {shouldShowGlobalFab && (
          <div className="app-global-fab fixed z-20">
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
              userId={currentUserId}
            />
          </Suspense>
        ) : null}

        {isSunExposureModalOpen ? (
          <Suspense fallback={null}>
            <SunExposureLogging
              isOpen={isSunExposureModalOpen}
              onClose={() => setIsSunExposureModalOpen(false)}
              userId={currentUserId}
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

// App component sets up providers and routes
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Router>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={renderDeferredRoute(<LoginPage />)} />
                  <Route path="/waitlist" element={renderDeferredRoute(<WaitlistPage />)} />

                  {/* Protected Routes */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <MainAppLayout />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </TooltipProvider>
          </ThemeProvider>
        </NextThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
