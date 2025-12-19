import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/lib/integrations/supabase/client";
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises'; // Need exercises to map names to IDs
import { fetchLatestMaxE1RMForExercises, LatestMaxE1RM } from '@/lib/integrations/supabase/history';
import { useAuth } from '@/state/auth/AuthProvider';
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { Progress } from "@/components/core/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/core/alert";
import { Target, CheckCircle, ChevronDown, Info } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/core/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover"; // Import Popover components
import { getUserProfile, UserProfileData } from '@/lib/integrations/supabase/user';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import AnimatedLinearProgress from '@/components/core/AnimatedLinearProgress';

// Define benchmark exercises 
const BENCHMARK_NAMES = ["Deadlift", "Squat", "Bench Press", "Row", "Overhead Press"] as const;
type BenchmarkName = typeof BENCHMARK_NAMES[number];

// Define levels and their multipliers
type BenchmarkLevel = 'Solid' | 'Strong' | 'Elite';
const ALL_LEVELS: BenchmarkLevel[] = ['Solid', 'Strong', 'Elite']; // Define levels array
type BenchmarkTypeOption = 'Strength' | 'Calisthenics'; // For the type switcher
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];

const BENCHMARK_MULTIPLIERS: Record<BenchmarkLevel, Record<BenchmarkName, number>> = {
    Solid: {
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
    currentE1RM: number | null; // This will store the potentially adjusted E1RM
    goalE1RM: number | null;
    progress: number; // Percentage 0-100
}

// Define Props interface
interface StrengthBenchmarksProps {
  currentType: BenchmarkTypeOption;
  onTypeChange: (newType: BenchmarkTypeOption) => void;
  shouldAnimate?: boolean;
}

const StrengthBenchmarks: React.FC<StrengthBenchmarksProps> = ({ currentType, onTypeChange, shouldAnimate = true }) => {
    const { user } = useAuth();
    const LOCAL_STORAGE_KEY = 'userBenchmarkLevel';

    // Initialize state from localStorage or default to 'Strong'
    const [selectedLevel, setSelectedLevel] = useState<BenchmarkLevel>(() => {
        try {
            const storedLevel = localStorage.getItem(LOCAL_STORAGE_KEY);
            // Validate stored value against possible levels
            if (storedLevel && ALL_LEVELS.includes(storedLevel as BenchmarkLevel)) {
                return storedLevel as BenchmarkLevel;
            }
        } catch (error) {
            console.error("Error reading benchmark level from localStorage:", error);
        }
        return 'Strong'; // Default value
    });

    // State for Popover open state
    const [levelPopoverOpen, setLevelPopoverOpen] = useState(false)

    // Animation trigger state
    const [startAnimation, setStartAnimation] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);
    useEffect(() => {
        if (shouldAnimate) {
            setStartAnimation(false);
            const timer = setTimeout(() => {
                setStartAnimation(true);
                setAnimationKey(prev => prev + 1);
            }, 80);
            return () => clearTimeout(timer);
        } else {
            setStartAnimation(false);
        }
    }, [shouldAnimate]);

    // Effect to save selected level to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, selectedLevel);
        } catch (error) {
            console.error("Error saving benchmark level to localStorage:", error);
        }
    }, [selectedLevel]);

    // Fetch list of all exercises (needed to map benchmark names to IDs)
    // Consider if this fetch should happen here or be passed as a prop if Analytics already fetches it
    const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
        queryKey: ['exercises'], // Use the same query key as Analytics to potentially share cache
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity, // Cache indefinitely
    });

    // Fetch user profile data (including bodyweight)
    const { data: userProfile, isLoading: isLoadingProfile, error: errorProfile } = useQuery<UserProfileData | null, Error>({
        queryKey: ['userProfile', user?.id], // Same query key as Home.tsx and Analytics.tsx for potential caching benefits
        queryFn: async () => {
            if (!user?.id) return null;
            return getUserProfile(user.id); // Use the shared function
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
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
        const weightInKg = userProfile?.weight_kg; // Use weight_kg from UserProfileData
        // Add explicit check for exercises data too
        if (isLoadingExercises || isLoadingBenchmarks || isLoadingProfile || exercises.length === 0 || !weightInKg) { // Check for !weightInKg
            return [];
        }

        const currentMultipliers = BENCHMARK_MULTIPLIERS[selectedLevel];

        return BENCHMARK_NAMES.map(name => {
            const foundExercise = exercises.find(ex =>
                ex.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            const exerciseId = foundExercise?.id || null;
            // const equipmentType = foundExercise?.default_equipment_type; // No longer use default equipment
            // console.log(`Processing benchmark: ${name}, Found Exercise:`, foundExercise); // Log found exercise

            let currentE1RM: number | null = null;
            let displayE1RM: number | null = null; // Separate variable for display

            if (exerciseId) {
                const e1rmData = latestMaxE1RMs.find(data => data.exercise_id === exerciseId);
                const rawE1RM = e1rmData?.max_e1rm ?? null;
                const actualEquipmentType = e1rmData?.equipment_type; // Use equipment type from E1RM data
                // console.log(`  Raw E1RM for ${name} (ID: ${exerciseId}): ${rawE1RM}, Equipment from Set: ${actualEquipmentType}`); // Log raw data

                if (rawE1RM !== null) {
                    // REMOVED: Doubling logic for Dumbbell/Kettlebell
                    // if (actualEquipmentType && (actualEquipmentType.toLowerCase() === 'dumbbell' || actualEquipmentType.toLowerCase() === 'kettlebell')) {
                    //     currentE1RM = rawE1RM * 2;
                    //     displayE1RM = currentE1RM; // Display the doubled value
                    //     // console.log(`  ${name} is Dumbbell/Kettlebell. Doubled E1RM: ${currentE1RM}`); // Log doubling
                    // } else {
                    //     currentE1RM = rawE1RM;
                    //     displayE1RM = currentE1RM; // Display the original value
                    //     // console.log(`  ${name} is not Dumbbell/Kettlebell. Using raw E1RM: ${currentE1RM}`); // Log non-doubling
                    // }
                    currentE1RM = rawE1RM; // Use rawE1RM directly
                    displayE1RM = currentE1RM; // Display the rawE1RM
                } else {
                    // console.log(`  No raw E1RM data found for ${name}`);
                }
            } else {
                // console.log(`  Exercise ID not found for benchmark: ${name}`);
            }

            // Use multiplier for the selected level
            const multiplier = currentMultipliers[name];
            const goalE1RM = weightInKg ? weightInKg * multiplier : null; // Use weightInKg
            let progress = 0;
            if (currentE1RM && goalE1RM && goalE1RM > 0) {
                // Use the potentially doubled currentE1RM for progress calculation
                progress = Math.min(100, Math.max(0, (currentE1RM / goalE1RM) * 100));
            }

            return {
                name, // Use the benchmark name directly
                exerciseId,
                currentE1RM: displayE1RM, // Store the value to be displayed
                goalE1RM,
                progress,
            };
            // Ensure exercises is a dependency here
        });
    }, [exercises, isLoadingExercises, latestMaxE1RMs, isLoadingBenchmarks, userProfile, isLoadingProfile, selectedLevel]);

    // --- Animate progress for each benchmark at the top level (to obey Rules of Hooks) ---
    const animatedProgress0 = useAnimatedValue(startAnimation ? calculatedBenchmarks[0]?.progress ?? 0 : 0);
    const animatedProgress1 = useAnimatedValue(startAnimation ? calculatedBenchmarks[1]?.progress ?? 0 : 0);
    const animatedProgress2 = useAnimatedValue(startAnimation ? calculatedBenchmarks[2]?.progress ?? 0 : 0);
    const animatedProgress3 = useAnimatedValue(startAnimation ? calculatedBenchmarks[3]?.progress ?? 0 : 0);
    const animatedProgress4 = useAnimatedValue(startAnimation ? calculatedBenchmarks[4]?.progress ?? 0 : 0);

    const animatedBenchmarks = [
      calculatedBenchmarks[0] ? { ...calculatedBenchmarks[0], progress: animatedProgress0 } : undefined,
      calculatedBenchmarks[1] ? { ...calculatedBenchmarks[1], progress: animatedProgress1 } : undefined,
      calculatedBenchmarks[2] ? { ...calculatedBenchmarks[2], progress: animatedProgress2 } : undefined,
      calculatedBenchmarks[3] ? { ...calculatedBenchmarks[3], progress: animatedProgress3 } : undefined,
      calculatedBenchmarks[4] ? { ...calculatedBenchmarks[4], progress: animatedProgress4 } : undefined,
    ].filter(Boolean);

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
        if (!userProfile?.weight_kg) { // Check for weight_kg
             return (
                 <Alert variant="default" className="bg-blue-50 border-blue-200">
                     <Target className="h-4 w-4 !text-blue-700" />
                     <AlertTitle className="text-blue-800">Set Your Weight</AlertTitle>
                     <AlertDescription className="text-blue-700">
                         Go to <Link to="/settings" className="font-medium underline">Settings</Link> to enter your weight and see your strength benchmarks.
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

        if (!startAnimation) return null;
        return (
            <div key={animationKey} className="space-y-5">
                {animatedBenchmarks.map((bench, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bench.name}</span>
                            <span className="text-xs text-gray-600">
                                {bench.currentE1RM !== null
                                    ? `~${bench.currentE1RM.toFixed(1)} kg / ${bench.goalE1RM?.toFixed(1)} kg Goal`
                                    : `No Data / ${bench.goalE1RM?.toFixed(1)} kg Goal`}
                            </span>
                        </div>
                        <AnimatedLinearProgress
                            value={bench.progress}
                            className="h-2"
                            barClassName="bg-green-500"
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
        <div className="relative md:p-6"> {/* New root div with original Card's md padding, retain relative positioning if needed */}
            <CardHeader className="p-0 mb-4 md:pb-0"> {/* Adjusted padding: remove md:p-4 */}
                <div className="flex items-center justify-between mb-4"> {/* Use justify-between */}
                     {/* Icon and Title Group */}
                     <Barbell className="mr-2 h-5 w-5 text-fitnessIndigo flex-shrink-0" /> {/* Icon outside trigger */} 
                     <CardTitle className="flex items-center flex-grow mr-2"> {/* Title takes available space */}
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
                         <TooltipProvider delayDuration={100}>
                             <Tooltip>
                                 <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" className="ml-1 h-5 w-5 p-0 text-gray-500 hover:bg-transparent">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                 </TooltipTrigger>
                                 <TooltipContent side="bottom" className="max-w-xs">
                                     <p>See how your estimated one-rep max compares to <span className='lowercase font-medium'>{selectedLevel}</span> strength standards based on bodyweight.</p>
                                 </TooltipContent>
                             </Tooltip>
                         </TooltipProvider>
                     </CardTitle>

                    {/* Benchmark Level Popover */}
                    <div className="flex-shrink-0">
                        <Popover open={levelPopoverOpen} onOpenChange={setLevelPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="default" // Always default variant for the trigger
                                    size="sm"
                                    className="rounded-full h-7 px-2.5 text-xs font-medium bg-fitnessIndigo hover:bg-fitnessIndigo/90 w-[80px] justify-center" // Fixed width for consistency
                                >
                                    {selectedLevel}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-1">
                                <div className="flex flex-col gap-1">
                                    {ALL_LEVELS.map((level) => (
                                        <Button
                                            key={level}
                                            variant={selectedLevel === level ? "secondary" : "ghost"} // Highlight selected in popover
                                            size="sm"
                                            className="w-full justify-start h-8 px-2 text-xs"
                                            onClick={() => {
                                                setSelectedLevel(level);
                                                setLevelPopoverOpen(false);
                                            }}
                                            disabled={selectedLevel === level}
                                        >
                                            {level}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 pt-0"> {/* Adjusted padding: remove md:p-6 md:pt-0, ensure pt-0 */}
                {renderBenchmarkContent()}
            </CardContent>
        </div>
    );
};

export default StrengthBenchmarks; 