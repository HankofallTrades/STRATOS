import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/lib/integrations/supabase/client";
import { fetchExercisesFromDB } from '@/lib/integrations/supabase/exercises';
import { fetchLatestMaxRepsForExercises, LatestMaxReps } from '@/lib/integrations/supabase/history';
import { useAuth } from '@/state/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/core/card";
import { Progress } from "@/components/core/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/core/alert";
import { CheckCircle, ChevronDown, Info } from "lucide-react";
import { PersonSimpleRun } from "@phosphor-icons/react";
import { Label } from "@/components/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/core/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/core/dropdown-menu";
import { Button } from "@/components/core/button";
import { Exercise } from "@/lib/types/workout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/core/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import AnimatedLinearProgress from '@/components/core/AnimatedLinearProgress';

// Define benchmark exercises
const CALISTHENIC_BENCHMARK_NAMES = ["Pull-up", "Push-up"] as const;
type CalisthenicBenchmarkName = typeof CALISTHENIC_BENCHMARK_NAMES[number];

// Define levels and their goal reps
type BenchmarkLevel = 'Solid' | 'Strong' | 'Elite';
const ALL_LEVELS: BenchmarkLevel[] = ['Solid', 'Strong', 'Elite'];
type BenchmarkTypeOption = 'Strength' | 'Calisthenics'; // For the type switcher
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];

const CALISTHENIC_BENCHMARK_GOALS: Record<BenchmarkLevel, Record<CalisthenicBenchmarkName, number>> = {
    Solid: {
        "Pull-up": 8,
        "Push-up": 30,
    },
    Strong: {
        "Pull-up": 15,
        "Push-up": 50,
    },
    Elite: {
        "Pull-up": 25,
        "Push-up": 75,
    }
};

// Structure for calculated benchmark data
interface CalculatedCalisthenicBenchmark {
    name: CalisthenicBenchmarkName;
    exerciseId: string | null;
    currentMaxReps: number | null;
    goalReps: number | null;
    progress: number; // Percentage 0-100
}

// Define Props interface
interface CalisthenicBenchmarksProps {
  currentType: BenchmarkTypeOption;
  onTypeChange: (newType: BenchmarkTypeOption) => void;
  shouldAnimate?: boolean;
}

const CalisthenicBenchmarks: React.FC<CalisthenicBenchmarksProps> = ({ currentType, onTypeChange, shouldAnimate = true }) => {
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
    const [levelPopoverOpen, setLevelPopoverOpen] = useState(false);

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

    // Fetch list of all exercises
    const { data: exercises = [], isLoading: isLoadingExercises, error: errorExercises } = useQuery({
        queryKey: ['exercises'],
        queryFn: fetchExercisesFromDB,
        staleTime: Infinity,
    });

    // Identify benchmark exercise IDs
    const benchmarkExerciseIds = useMemo(() => {
        if (isLoadingExercises || exercises.length === 0) return [];
        return CALISTHENIC_BENCHMARK_NAMES.map(name => {
            const foundExercise = exercises.find(ex =>
                ex.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            return foundExercise?.id;
        }).filter((id): id is string => !!id);
    }, [exercises, isLoadingExercises]);

    // Fetch latest max reps for benchmark exercises
    const {
        data: latestMaxReps = [],
        isLoading: isLoadingBenchmarks,
        error: errorBenchmarks
    } = useQuery<LatestMaxReps[], Error>({
        queryKey: ['latestMaxReps', user?.id, benchmarkExerciseIds],
        queryFn: async () => {
            if (!user?.id || benchmarkExerciseIds.length === 0) return [];
            return fetchLatestMaxRepsForExercises(user.id, benchmarkExerciseIds);
        },
        enabled: !!user?.id && !isLoadingExercises && benchmarkExerciseIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });

    // Calculate benchmark progress
    const calculatedBenchmarks = useMemo((): CalculatedCalisthenicBenchmark[] => {
        if (isLoadingExercises || isLoadingBenchmarks || exercises.length === 0) {
            return [];
        }

        const currentGoals = CALISTHENIC_BENCHMARK_GOALS[selectedLevel];

        return CALISTHENIC_BENCHMARK_NAMES.map(name => {
            const foundExercise = exercises.find(ex =>
                ex.name.trim().toLowerCase() === name.trim().toLowerCase()
            );
            const exerciseId = foundExercise?.id || null;

            let currentMaxReps: number | null = null;
            if (exerciseId) {
                const repData = latestMaxReps.find(data => data.exercise_id === exerciseId);
                currentMaxReps = repData?.max_reps ?? null;
            }

            const goalReps = currentGoals[name];
            let progress = 0;
            if (currentMaxReps && goalReps && goalReps > 0) {
                progress = Math.min(100, Math.max(0, (currentMaxReps / goalReps) * 100));
            }

            return {
                name,
                exerciseId,
                currentMaxReps,
                goalReps,
                progress,
            };
        });
    }, [exercises, isLoadingExercises, latestMaxReps, isLoadingBenchmarks, selectedLevel]);

    // --- Animate progress for each benchmark at the top level (to obey Rules of Hooks) ---
    const animatedProgress0 = useAnimatedValue(startAnimation ? calculatedBenchmarks[0]?.progress ?? 0 : 0);
    const animatedProgress1 = useAnimatedValue(startAnimation ? calculatedBenchmarks[1]?.progress ?? 0 : 0);

    const animatedBenchmarks = [
      calculatedBenchmarks[0] ? { ...calculatedBenchmarks[0], progress: animatedProgress0 } : undefined,
      calculatedBenchmarks[1] ? { ...calculatedBenchmarks[1], progress: animatedProgress1 } : undefined,
    ].filter(Boolean);

    // Helper to render benchmark section content
    const renderBenchmarkContent = () => {
        if (isLoadingExercises || isLoadingBenchmarks) {
            return <p className="text-gray-500 italic text-center py-4">Loading benchmarks...</p>;
        }

        // Check other errors
        if (errorExercises) {
            return <p className="text-red-500 italic text-center py-4">Error loading exercises for benchmarks.</p>;
        }
        if (errorBenchmarks) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data. (fetchMaxReps)</p>;
        }

        // Check if exercises were found and benchmarks calculated
        if (calculatedBenchmarks.length === 0 && exercises.length > 0 && !isLoadingBenchmarks) {
            console.warn("Calculated calisthenic benchmarks array is empty. Check exercise names match or if rep data exists.");
            return <p className="text-gray-500 italic text-center py-4">Could not calculate benchmarks. Ensure Pull-up and Push-up exist and have recorded sets.</p>;
        }
        if (exercises.length === 0 && !isLoadingExercises) {
            return <p className="text-gray-500 italic text-center py-4">No exercises found. Add exercises first.</p>;
        }
        if (benchmarkExerciseIds.length < CALISTHENIC_BENCHMARK_NAMES.length && !isLoadingExercises) {
             const missing = CALISTHENIC_BENCHMARK_NAMES.filter(name =>
                 !exercises.some(ex => ex.name.trim().toLowerCase() === name.trim().toLowerCase())
             );
             return <p className="text-gray-500 italic text-center py-4">Missing required exercises: {missing.join(', ')}</p>;
         }

        if (!startAnimation) return null;
        return (
            <div key={animationKey} className="space-y-5">
                {animatedBenchmarks.map((bench, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bench.name}</span>
                            <span className="text-xs text-gray-600">
                                {bench.currentMaxReps !== null
                                    ? `${bench.currentMaxReps} reps / ${bench.goalReps} reps Goal`
                                    : `No Data / ${bench.goalReps} reps Goal`}
                            </span>
                        </div>
                        <AnimatedLinearProgress
                            value={bench.progress}
                            className="h-2"
                            barClassName="bg-blue-500"
                        />
                        {bench.progress >= 100 && (
                           <p className="text-xs text-blue-600 font-medium mt-1 flex items-center">
                               <CheckCircle className="h-3 w-3 mr-1" /> Benchmark Met!
                           </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="relative md:p-6">
            <CardHeader className="p-0 mb-4 md:pb-0">
                <div className="flex items-center justify-between mb-4">
                    <PersonSimpleRun className="mr-2 h-5 w-5 text-fitnessBlue flex-shrink-0" />
                    <CardTitle className="flex items-center flex-grow mr-2">
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
                                    <p>See how your max reps compare to <span className='lowercase font-medium'>{selectedLevel}</span> calisthenic standards.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <div className="flex-shrink-0">
                        <Popover open={levelPopoverOpen} onOpenChange={setLevelPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="rounded-full h-7 px-2.5 text-xs font-medium bg-fitnessBlue hover:bg-fitnessBlue/90 w-[80px] justify-center"
                                >
                                    {selectedLevel}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-1">
                                <div className="flex flex-col gap-1">
                                    {ALL_LEVELS.map((level) => (
                                        <Button
                                            key={level}
                                            variant={selectedLevel === level ? "secondary" : "ghost"}
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
            <CardContent className="p-0 pt-0">
                {renderBenchmarkContent()}
            </CardContent>
        </div>
    );
};

export default CalisthenicBenchmarks; 