import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ThemeProvider } from "@/lib/themes";
import NavBar from "@/components/layout/NavBar";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Home from "./pages/Home";
import Workout from "./pages/Workout";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import WaitlistPage from "./pages/WaitlistPage";
import Coach from "./pages/Coach";
// FAB Imports
import { Button } from "@/components/core/button";
import { Plus, Save } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/core/dropdown-menu"
// Imports for Save Workout Logic
import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from "@/hooks/redux";
import {
  startWorkout as startWorkoutAction
} from "@/state/workout/workoutSlice";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/integrations/supabase/client';
import { Tables } from '@/lib/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/core/Dialog";
import AddSingleExerciseDialog from '@/domains/fitness/view/AddSingleExerciseDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import ProteinLogging from "@/domains/fitness/view/ProteinLogging";
import SunExposureLogging from "@/domains/fitness/view/SunExposureLogging";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/core/sidebar";
import { useWorkoutPersistence } from '@/domains/fitness/controller/useWorkout';

const queryClient = new QueryClient();

// Interface for the latest single log data
interface LatestSingleLogData extends Tables<'exercise_sets'> {
  exercise_id: string; // Ensure exercise_id is present (from workout_exercises)
}

// Main Application Layout (for authenticated users)
const MainAppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
  const [isSunExposureModalOpen, setIsSunExposureModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { saveWorkout, discardWorkout, currentWorkout } = useWorkoutPersistence();

  // *** Query to fetch the latest single exercise log ***
  const { data: latestSingleLogData, isLoading: isLoadingLatestLog } = useQuery<LatestSingleLogData | null>({
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
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Error fetching user:", authError);
        setCurrentUserId(null);
      } else {
        setCurrentUserId(user?.id || null);
      }
    };
    fetchUser();
  }, []);

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

  const handleEndWorkout = async () => {
    const hasCompletedSets = currentWorkout?.exercises.some(ex => ex.sets.some(set => set.completed));

    if (!hasCompletedSets) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    await saveWorkout();
  };

  const handleConfirmDiscard = () => {
    discardWorkout();
    setIsDiscardConfirmOpen(false);
  };


  return (
    <SidebarProvider>
      <NavBar />
      <SidebarInset>
        <div className="fixed top-3 left-3 z-50 md:hidden">
          <SidebarTrigger />
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        {location.pathname !== '/coach' && (
          <div className="fixed bottom-20 right-6 z-20">
            {location.pathname === '/workout' ? (
              <Button
                onClick={handleEndWorkout}
                variant="default"
                size="icon"
                className="rounded-full h-14 w-14 bg-[#15462C] hover:bg-[#15462C]/90 shadow-lg text-primary-foreground"
              >
                <Save size={24} />
              </Button>
            ) : (
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
            )}
          </div>
        )}

        <ProteinLogging
          isOpen={isProteinModalOpen}
          onClose={() => setIsProteinModalOpen(false)}
          userId={currentUserId}
        />

        <SunExposureLogging
          isOpen={isSunExposureModalOpen}
          onClose={() => setIsSunExposureModalOpen(false)}
          userId={currentUserId}
        />

        <Dialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard Workout?</DialogTitle>
              <DialogDescription>
                You haven't completed any sets in this workout. Are you sure you want to discard it?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDiscardConfirmOpen(false)}>Cancel</Button>
              <DialogClose asChild>
                <Button variant="destructive" onClick={handleConfirmDiscard}>Discard</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AddSingleExerciseDialog
          open={isAddExerciseDialogOpen}
          onOpenChange={setIsAddExerciseDialogOpen}
          defaultLogData={latestSingleLogData}
        />
      </SidebarInset>
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
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/waitlist" element={<WaitlistPage />} />

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
