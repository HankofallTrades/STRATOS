import { Toaster } from "@/components/core/Toast/toaster";
import { Toaster as Sonner } from "@/components/core/sonner";
import { TooltipProvider } from "@/components/core/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './state/store';
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/layout/BottomNav";
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
  selectCurrentWorkout, 
  selectWorkoutStartTime,
  endWorkout as endWorkoutAction, 
  clearWorkout,
  startWorkout as startWorkoutAction
} from "@/state/workout/workoutSlice";
import { addWorkoutToHistory } from "@/state/history/historySlice";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/lib/integrations/supabase/client';
import { Workout as WorkoutType, isStrengthSet, isCardioSet } from "@/lib/types/workout";
import { TablesInsert, Tables } from '@/lib/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/core/Dialog";
import AddSingleExerciseDialog from '@/components/features/Workout/AddSingleExerciseDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth/AuthProvider';
import ProteinLogging from "./components/features/Nutrition/ProteinLogging";
import SunExposureLogging from "./components/features/Nutrition/SunExposureLogging";

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
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const workoutStartTime = useAppSelector(selectWorkoutStartTime);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [isProteinModalOpen, setIsProteinModalOpen] = useState(false);
  const [isSunExposureModalOpen, setIsSunExposureModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const handleDiscardWorkout = () => {
    dispatch(endWorkoutAction());
    dispatch(clearWorkout());
    navigate('/');
    setIsDiscardConfirmOpen(false);
  };

  const handleEndWorkout = async () => {
    const workoutToEnd = currentWorkout;
    
    if (!workoutToEnd) return;

    const hasCompletedSets = workoutToEnd.exercises.some(ex => ex.sets.some(set => set.completed));
    
    if (!hasCompletedSets) {
        setIsDiscardConfirmOpen(true);
        return;
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("Authentication error or user not found:", authError);
        toast({
            title: "Authentication Error",
            description: "Could not verify user. Please log in again.",
            variant: "destructive",
        });
        return;
    }

    const endTime = Date.now();
    const durationInSeconds = workoutStartTime 
      ? Math.max(0, Math.round((endTime - workoutStartTime) / 1000)) 
      : 0;

            // Determine workout type based on exercises
        const hasStrengthSets = workoutToEnd.exercises.some(ex => 
            ex.sets.some(set => set.completed && isStrengthSet(set))
        );
        const hasCardioSets = workoutToEnd.exercises.some(ex => 
            ex.sets.some(set => set.completed && isCardioSet(set))
        );
        
        let workoutType: 'strength' | 'cardio' | 'mixed' = 'strength';
        if (hasStrengthSets && hasCardioSets) {
            workoutType = 'mixed';
        } else if (hasCardioSets) {
            workoutType = 'cardio';
        }

        const workoutDataForDb = {
            user_id: user.id,
            duration_seconds: durationInSeconds,
            completed: true,
            type: workoutType,
            session_focus: workoutToEnd.session_focus || null,
            notes: workoutToEnd.notes || null,
        } as TablesInsert<'workouts'>;

    try {
        const { data: savedWorkout, error: workoutError } = await supabase
            .from('workouts')
            .insert(workoutDataForDb)
            .select()
            .single();

        if (workoutError || !savedWorkout) {
            throw workoutError || new Error("Failed to save workout record.");
        }

        const workoutId = savedWorkout.id;

        const workoutExercisesDataForDb: TablesInsert<'workout_exercises'>[] = workoutToEnd.exercises
          .filter(exercise => exercise.sets.some(set => set.completed))
          .map((exercise, index) => ({
            workout_id: workoutId,
            exercise_id: exercise.exerciseId,
            order: index + 1,
        }));

        if (workoutExercisesDataForDb.length === 0) {
             console.warn("Workout save aborted: No exercises with completed sets found after filtering.");
             toast({
                title: "Save Issue",
                description: "Could not find exercises with completed sets to save.",
                variant: "destructive",
             });
             dispatch(clearWorkout());
             navigate('/');
             return;
        }

        const { data: savedWorkoutExercises, error: workoutExercisesError } = await supabase
            .from('workout_exercises')
            .insert(workoutExercisesDataForDb)
            .select();

        if (workoutExercisesError || !savedWorkoutExercises || savedWorkoutExercises.length !== workoutExercisesDataForDb.length) {
            throw workoutExercisesError || new Error("Failed to save workout exercises records.");
        }

        const exerciseSetsDataForDb: TablesInsert<'exercise_sets'>[] = [];
        workoutToEnd.exercises.forEach((exercise) => {
            const savedWorkoutExercise = savedWorkoutExercises.find(
                swe => swe.exercise_id === exercise.exerciseId && swe.workout_id === workoutId
            );

            if (!savedWorkoutExercise) {
                console.warn(`Could not find saved workout exercise for exercise ID: ${exercise.exerciseId}`);
                return;
            }

            exercise.sets.forEach((set, index) => {
                 if (set.completed) {
                    if (isStrengthSet(set)) {
                        // Handle strength sets
                        exerciseSetsDataForDb.push({
                            workout_exercise_id: savedWorkoutExercise.id,
                            set_number: index + 1,
                            weight: set.weight,
                            reps: set.reps,
                            time_seconds: set.time_seconds,
                            completed: true,
                            equipment_type: set.equipmentType || null,
                            variation: set.variation || null,
                        });
                    } else if (isCardioSet(set)) {
                        // Handle cardio sets
                        exerciseSetsDataForDb.push({
                            workout_exercise_id: savedWorkoutExercise.id,
                            set_number: index + 1,
                            weight: 0, // Default weight for cardio
                            reps: null, // No reps for cardio
                            completed: true,
                            // Cardio-specific fields
                            duration_seconds: set.duration_seconds,
                            distance_km: set.distance_km,
                            pace_min_per_km: set.pace_min_per_km,
                            heart_rate_bpm: set.heart_rate_bpm,
                            target_heart_rate_zone: set.target_heart_rate_zone,
                            perceived_exertion: set.perceived_exertion,
                            calories_burned: set.calories_burned,
                        } as TablesInsert<'exercise_sets'>);
                    }
                 }
            });
        });

        if (exerciseSetsDataForDb.length > 0) {
            const { error: setsError } = await supabase
                .from('exercise_sets')
                .insert(exerciseSetsDataForDb);

            if (setsError) {
                throw setsError;
            }
        } else {
             console.warn("No completed sets found to insert, although workout/workout_exercises were created.");
        }

        const completedWorkoutForState: WorkoutType = {
            ...workoutToEnd,
            id: workoutId,
            completed: true,
            duration: durationInSeconds,
            exercises: workoutToEnd.exercises
                .map(woEx => {
                    const savedWoEx = savedWorkoutExercises.find(swe => swe.exercise_id === woEx.exerciseId && swe.workout_id === workoutId);
                    if (!savedWoEx) return null;

                    return {
                        ...woEx,
                        id: savedWoEx.id,
                        workoutId: workoutId,
                        sets: woEx.sets
                            .filter(set => set.completed)
                            .map(set => ({ ...set, workoutExerciseId: savedWoEx.id })),
                    };
                })
                .filter((woEx): woEx is Exclude<typeof woEx, null> => woEx !== null && woEx.sets.length > 0),
        };

        dispatch(addWorkoutToHistory(completedWorkoutForState));

        toast({
            title: "Workout Saved",
            description: "Your workout has been successfully saved to your profile.",
        });

        dispatch(clearWorkout());
        navigate('/');

    } catch (error: any) {
        console.error("Error saving workout:", error);
        toast({
            title: "Save Error",
            description: `Failed to save workout: ${error.message || 'Unknown error'}. Please try again.`,
            variant: "destructive",
        });
    }
  };

  return (
    <div>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {location.pathname !== '/coach' && (
        <div className="fixed bottom-20 right-6 z-20">
          {location.pathname === '/workout' ? (
            <Button
              onClick={handleEndWorkout}
              variant="default"
              size="icon"
              className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600 shadow-lg text-white"
            >
              <Save size={24} />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-full h-14 w-14 bg-blue-500 hover:bg-blue-600 shadow-lg"
                >
                  <Plus size={24} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuItem onSelect={handleAddWorkout}>
                  Start New Workout
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleAddExercise}>
                  Log Single Exercise
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogProtein}>
                  Log Protein
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogSunExposure}>
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

      <BottomNav />

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
              <Button variant="destructive" onClick={handleDiscardWorkout}>Discard</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddSingleExerciseDialog 
        open={isAddExerciseDialogOpen} 
        onOpenChange={setIsAddExerciseDialogOpen}
        defaultLogData={latestSingleLogData} 
      />
    </div>
  );
};

// App component sets up providers and routes
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
      </PersistGate>
    </Provider>
  );
};

export default App;
