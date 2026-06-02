import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/core/alert";
import { Target, CheckCircle, ChevronDown, Info } from "lucide-react";
import { Barbell } from "@phosphor-icons/react";
import { Exercise } from "@/lib/types/workout";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/core/dropdown-menu";
import { Button } from "@/components/core/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/core/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/core/popover";
import { Skeleton } from "@/components/core/skeleton";
import { cn } from "@/lib/utils/cn";
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import AnimatedLinearProgress from '@/components/core/AnimatedLinearProgress';
import { useBenchmarks, BenchmarkLevel, BenchmarkTypeOption } from '../../hooks/useBenchmarks';
import {
    workoutMenuOptionClassName,
    workoutPopoverClassName,
} from "@/domains/fitness/ui/workoutSelectionStyles";

interface StrengthBenchmarksProps {
    userId: string | undefined;
    exercises: Exercise[];
    currentType: BenchmarkTypeOption;
    onTypeChange: (newType: BenchmarkTypeOption) => void;
    shouldAnimate?: boolean;
    embedded?: boolean;
}

const ALL_LEVELS: BenchmarkLevel[] = ['Solid', 'Strong', 'Elite'];
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];
const benchmarkTriggerClassName =
    "h-auto rounded-none border-0 bg-transparent p-0 text-lg font-bold text-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0";
const benchmarkLevelTriggerClassName =
    "h-auto rounded-none border-0 bg-transparent p-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0";

const StrengthBenchmarksView: React.FC<StrengthBenchmarksProps> = ({
    userId,
    exercises,
    currentType,
    onTypeChange,
    shouldAnimate = true,
    embedded = false,
}) => {
    const {
        selectedLevel,
        setSelectedLevel,
        levelPopoverOpen,
        setLevelPopoverOpen,
        userProfile,
        isLoadingProfile,
        errorProfile,
        calculatedStrength,
        isLoadingStrength,
        errorStrength,
        STRENGTH_EXERCISE_COUNT,
        foundStrengthCount
    } = useBenchmarks(userId, exercises);

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
    }, [shouldAnimate, calculatedStrength]);

    const animatedProgress0 = useAnimatedValue(startAnimation ? calculatedStrength[0]?.progress ?? 0 : 0);
    const animatedProgress1 = useAnimatedValue(startAnimation ? calculatedStrength[1]?.progress ?? 0 : 0);
    const animatedProgress2 = useAnimatedValue(startAnimation ? calculatedStrength[2]?.progress ?? 0 : 0);
    const animatedProgress3 = useAnimatedValue(startAnimation ? calculatedStrength[3]?.progress ?? 0 : 0);
    const animatedProgress4 = useAnimatedValue(startAnimation ? calculatedStrength[4]?.progress ?? 0 : 0);

    const animatedBenchmarks = [
        calculatedStrength[0] ? { ...calculatedStrength[0], progress: animatedProgress0 } : undefined,
        calculatedStrength[1] ? { ...calculatedStrength[1], progress: animatedProgress1 } : undefined,
        calculatedStrength[2] ? { ...calculatedStrength[2], progress: animatedProgress2 } : undefined,
        calculatedStrength[3] ? { ...calculatedStrength[3], progress: animatedProgress3 } : undefined,
        calculatedStrength[4] ? { ...calculatedStrength[4], progress: animatedProgress4 } : undefined,
    ].filter(Boolean);

    const renderBenchmarkContent = () => {
        if (isLoadingProfile || isLoadingStrength) {
            return (
                <div className="space-y-5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i}>
                            <div className="mb-1 flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            );
        }
        if (errorProfile) {
            return <p className="text-red-500 italic text-center py-4">Error loading profile data.</p>;
        }
        if (!userProfile?.weight_kg) {
            return (
                <Alert variant="default" className="border-white/8 bg-white/[0.03]">
                    <Target className="h-4 w-4 verdigris-text" />
                    <AlertTitle className="text-foreground">Set Your Weight</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                        Go to <Link to="/profile/settings" className="font-medium underline">Settings</Link> to enter your weight and see your strength benchmarks.
                    </AlertDescription>
                </Alert>
            );
        }
        if (errorStrength) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data.</p>;
        }
        if (foundStrengthCount === 0 && exercises.length > 0) {
            return <p className="text-muted-foreground italic text-center py-4">Could not calculate benchmarks. Ensure exercises like Deadlift and Squat exist.</p>;
        }

        if (!startAnimation) return null;
        return (
            <div key={animationKey} className="space-y-5">
                {animatedBenchmarks.map((bench, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bench.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {bench.currentValue !== null
                                    ? `~${bench.currentValue.toFixed(1)} kg / ${bench.goalValue?.toFixed(1)} kg Goal`
                                    : `No Data / ${bench.goalValue?.toFixed(1)} kg Goal`}
                            </span>
                        </div>
                        <AnimatedLinearProgress
                            value={bench.progress}
                            className="h-2"
                            barClassName="bg-[var(--stone-accent)]"
                        />
                        {bench.progress >= 100 && (
                            <p className="verdigris-text mt-1 flex items-center text-xs font-medium">
                                <CheckCircle className="h-3 w-3 mr-1" /> Benchmark Met!
                            </p>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={embedded ? "relative" : "stone-surface relative rounded-[26px] p-5 md:p-6"}>
            <CardHeader className="p-0 mb-4 md:pb-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Barbell className="h-5 w-5 flex-shrink-0 verdigris-text" />
                        <CardTitle className="flex min-w-0 items-center gap-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className={benchmarkTriggerClassName}>
                                        <span className="truncate">{currentType}</span>
                                        <ChevronDown className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className={cn(workoutPopoverClassName, "w-44 p-1")}>
                                    {ALL_BENCHMARK_TYPES.map((option) => (
                                        <DropdownMenuItem
                                            key={option}
                                            onSelect={() => onTypeChange(option)}
                                            disabled={currentType === option}
                                            className={workoutMenuOptionClassName}
                                        >
                                            {option}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardTitle>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-[10px] p-0 text-muted-foreground hover:bg-white/[0.03] hover:text-foreground">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="stone-panel max-w-xs border-white/10">
                                    <p>See how your best estimated one-rep max compares to <span className='lowercase font-medium'>{selectedLevel}</span> strength standards.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <div className="flex-shrink-0">
                        <Popover open={levelPopoverOpen} onOpenChange={setLevelPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={benchmarkLevelTriggerClassName}
                                >
                                    <span>{selectedLevel}</span>
                                    <ChevronDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className={cn(workoutPopoverClassName, "w-32 p-1")}>
                                <div className="flex flex-col gap-1">
                                    {ALL_LEVELS.map((level) => (
                                        <Button
                                            key={level}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                workoutMenuOptionClassName,
                                                "h-9 text-xs",
                                                selectedLevel === level && "app-tonal-control text-foreground"
                                            )}
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

export default StrengthBenchmarksView;
