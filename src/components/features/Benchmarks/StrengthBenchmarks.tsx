import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/lib/integrations/supabase/client";
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Need exercises to map names to IDs
import { fetchLatestMaxE1RMForExercises, LatestMaxE1RM } from '@/lib/integrations/supabase/history';
import { useAuth } from '@/state/auth/AuthProvider';
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { Progress } from "@/components/core/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/core/alert";
import { Target, CheckCircle, ChevronDown } from "lucide-react";
import { Barbell } from "@phosphor-icons/react";
import { Exercise } from "@/lib/types/workout"; // Need Exercise type
import { Label } from "@/components/core/label"; // Import Label for dropdown
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select"; // Import Select components
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/core/dropdown-menu";
import { Button } from "@/components/core/button";

// Define benchmark exercises 
const BENCHMARK_NAMES = ["Deadlift", "Squat", "Bench Press", "Row", "Overhead Press"] as const;
type BenchmarkName = typeof BENCHMARK_NAMES[number];

// Define levels and their multipliers
type BenchmarkLevel = 'Average' | 'Strong' | 'Elite';
type BenchmarkTypeOption = 'Strength' | 'Calisthenics'; // For the type switcher
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];

const BENCHMARK_MULTIPLIERS: Record<BenchmarkLevel, Record<BenchmarkName, number>> = {
    Average: {
        "Deadlift": 1.75,
        "Squat": 1.25,
        "Bench Press": 1.0,
        "Row": 1.0,
        "Overhead Press": 0.75,
    },
    Strong: { // Current values
        "Deadlift": 2.5,
        "Squat": 2.0,
        "Bench Press": 1.5,
        "Row": 1.5,
        "Overhead Press": 1.0,
    },
    Elite: {
        "Deadlift": 3.0,
        "Squat": 2.5,
        "Bench Press": 2.0,
        "Row": 1.75,
        "Overhead Press": 1.25,
    }
};

// Structure for calculated benchmark data
interface CalculatedBenchmark {
    name: BenchmarkName;
    exerciseId: string | null;
    currentE1RM: number | null;
    goalE1RM: number | null;
    progress: number; // Percentage 0-100
}

// Define Props interface
interface StrengthBenchmarksProps {
  currentType: BenchmarkTypeOption;
  onTypeChange: (newType: BenchmarkTypeOption) => void;
}

const StrengthBenchmarks: React.FC<StrengthBenchmarksProps> = ({ currentType, onTypeChange }) => {
    const { user } = useAuth();
    const [selectedLevel, setSelectedLevel] = useState<BenchmarkLevel>('Strong'); // Default to 'Strong'

    // Fetch list of all exercises (needed to map benchmark names to IDs)
    // Consider if this fetch should happen here or be passed as a prop if Analytics already fetches it
    const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
        queryKey: ['exercises'], // Use the same query key as Analytics to potentially share cache
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity, // Cache indefinitely
    });

    // Fetch user profile data (including bodyweight)
    const { data: userProfile, isLoading: isLoadingProfile, error: errorProfile } = useQuery({
        queryKey: ['userProfile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('bodyweight, username')
                .eq('id', user.id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn("User profile not found for benchmarks.");
                    return null;
                } else {
                    console.error("Error fetching user profile for benchmarks:", error);
                    throw error;
                }
            }
            return data;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    // Identify benchmark exercise IDs once exercises are loaded
    const benchmarkExerciseIds = useMemo(() => {
        if (isLoadingExercises || exercises.length === 0) return [];
        return BENCHMARK_NAMES.map(name => {
            const foundExercise = exercises.find(ex =>
                ex.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            return foundExercise?.id;
        }).filter((id): id is string => !!id);
    }, [exercises, isLoadingExercises]);

    // Fetch latest max e1RMs for benchmark exercises
    const {
        data: latestMaxE1RMs = [],
        isLoading: isLoadingBenchmarks,
        error: errorBenchmarks
    } = useQuery<LatestMaxE1RM[], Error>({
        queryKey: ['latestMaxE1RMs', user?.id, benchmarkExerciseIds],
        queryFn: async () => {
            if (!user?.id || benchmarkExerciseIds.length === 0) return [];
            return fetchLatestMaxE1RMForExercises(user.id, benchmarkExerciseIds);
        },
        enabled: !!user?.id && !isLoadingExercises && benchmarkExerciseIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });

    // Calculate benchmark progress
    const calculatedBenchmarks = useMemo((): CalculatedBenchmark[] => {
        const bodyweight = userProfile?.bodyweight;
        // Add explicit check for exercises data too
        if (isLoadingExercises || isLoadingBenchmarks || isLoadingProfile || exercises.length === 0 || !bodyweight) {
            return [];
        }

        const currentMultipliers = BENCHMARK_MULTIPLIERS[selectedLevel];

        return BENCHMARK_NAMES.map(name => {
            const foundExercise = exercises.find(ex =>
                ex.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            const exerciseId = foundExercise?.id || null;

            let currentE1RM: number | null = null;
            if (exerciseId) {
                const e1rmData = latestMaxE1RMs.find(data => data.exercise_id === exerciseId);
                currentE1RM = e1rmData?.max_e1rm ?? null;
            }

            // Use multiplier for the selected level
            const multiplier = currentMultipliers[name];
            const goalE1RM = bodyweight ? bodyweight * multiplier : null;
            let progress = 0;
            if (currentE1RM && goalE1RM && goalE1RM > 0) {
                progress = Math.min(100, Math.max(0, (currentE1RM / goalE1RM) * 100));
            }

            return {
                name, // Use the benchmark name directly
                exerciseId,
                currentE1RM,
                goalE1RM,
                progress,
            };
            // Ensure exercises is a dependency here
        });
    }, [exercises, isLoadingExercises, latestMaxE1RMs, isLoadingBenchmarks, userProfile, isLoadingProfile, selectedLevel]);

    // Helper to render benchmark section content
    const renderBenchmarkContent = () => {
        // Combined loading checks
        if (isLoadingProfile || isLoadingExercises || isLoadingBenchmarks) {
            return <p className="text-gray-500 italic text-center py-4">Loading benchmarks...</p>;
        }
        // Prioritize profile fetch error
        if (errorProfile) {
            return <p className="text-red-500 italic text-center py-4">Error loading profile data.</p>;
        }
        // Then check bodyweight
        if (!userProfile?.bodyweight) {
             return (
                 <Alert variant="default" className="bg-blue-50 border-blue-200">
                     <Target className="h-4 w-4 !text-blue-700" />
                     <AlertTitle className="text-blue-800">Set Your Bodyweight</AlertTitle>
                     <AlertDescription className="text-blue-700">
                         Go to <Link to="/settings" className="font-medium underline">Settings</Link> to enter your bodyweight and see your strength benchmarks.
                     </AlertDescription>
                 </Alert>
             );
         }
         // Check other errors after ensuring bodyweight exists (or prompt is shown)
         if (errorExercises) {
            return <p className="text-red-500 italic text-center py-4">Error loading exercises for benchmarks.</p>;
         }
         if (errorBenchmarks) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data.</p>;
         }
         // Check if exercises were found and benchmarks calculated
         if (calculatedBenchmarks.length === 0 && exercises.length > 0) {
             // Only show this if exercises loaded but benchmarks still couldn't be calculated
             console.warn("Calculated benchmarks array is empty. Check exercise names match BENCHMARKS const or if e1RM data exists.");
             return <p className="text-gray-500 italic text-center py-4">Could not calculate benchmarks. Ensure standard exercises (Deadlift, Squat, etc.) exist in your list and have recorded sets.</p>;
         }
         if (exercises.length === 0 && !isLoadingExercises) {
             // Handle case where no exercises exist at all
             return <p className="text-gray-500 italic text-center py-4">No exercises found. Add exercises first.</p>;
         }


        return (
            <div className="space-y-5">
                {calculatedBenchmarks.map((bench, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bench.name}</span>
                            <span className="text-xs text-gray-600">
                                {bench.currentE1RM !== null
                                    ? `~${bench.currentE1RM.toFixed(1)} kg / ${bench.goalE1RM?.toFixed(1)} kg Goal`
                                    : `No Data / ${bench.goalE1RM?.toFixed(1)} kg Goal`}
                            </span>
                        </div>
                        <Progress
                            value={bench.progress}
                            className="h-2 [&>div]:bg-green-500"
                        />
                        {bench.progress >= 100 && (
                           <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                               <CheckCircle className="h-3 w-3 mr-1" /> Benchmark Met!
                           </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Render the Card containing the benchmarks UI
    return (
        <Card className="relative">
            <CardHeader>
                {/* Level Selector (stays in top right) */}
                <div className="absolute top-4 right-4">
                    <Select 
                        value={selectedLevel} 
                        onValueChange={(value) => setSelectedLevel(value as BenchmarkLevel)}
                    > 
                        <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Strong">Strong</SelectItem>
                            <SelectItem value="Elite">Elite</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>

                {/* Title with inline DropdownMenu */}
                <div className="flex items-center mr-28"> {/* Wrapper to keep icon/title/dropdown together, with margin */} 
                     <Barbell className="mr-2 h-5 w-5 text-fitnessIndigo flex-shrink-0" /> {/* Icon outside trigger */} 
                     <CardTitle className="flex items-center">
                         <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" className="p-0 h-auto font-bold text-lg hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 mr-1">
                                     {currentType}
                                     <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                                 </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="start">
                                 {ALL_BENCHMARK_TYPES.map((option) => (
                                     <DropdownMenuItem 
                                         key={option}
                                         onSelect={() => onTypeChange(option)} 
                                         disabled={currentType === option}
                                     >
                                         {option}
                                     </DropdownMenuItem>
                                 ))}
                             </DropdownMenuContent>
                         </DropdownMenu>
                     </CardTitle>
                </div>

                <CardDescription className="pr-28 mt-1"> {/* Add margin top if needed */} 
                    See how your e1RM compares to <span className='lowercase font-medium'>{selectedLevel}</span> strength standards based on your bodyweight ({userProfile?.bodyweight ? `${userProfile.bodyweight} kg` : isLoadingProfile ? 'loading...' : 'not set'}).
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderBenchmarkContent()}
            </CardContent>
        </Card>
    );
};

export default StrengthBenchmarks; 