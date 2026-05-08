import React, { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from "@/components/core/card";
import { CheckCircle, ChevronDown, Info } from "lucide-react";
import { PersonSimpleRun } from "@phosphor-icons/react";
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

interface CalisthenicBenchmarksProps {
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

const CalisthenicBenchmarksView: React.FC<CalisthenicBenchmarksProps> = ({
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
        calculatedCalisthenics,
        isLoadingCalisthenics,
        errorCalisthenics,
        CALISTHENIC_EXERCISE_COUNT,
        foundCalisthenicCount
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
    }, [shouldAnimate, calculatedCalisthenics]);

    const animatedProgress0 = useAnimatedValue(startAnimation ? calculatedCalisthenics[0]?.progress ?? 0 : 0);
    const animatedProgress1 = useAnimatedValue(startAnimation ? calculatedCalisthenics[1]?.progress ?? 0 : 0);

    const animatedBenchmarks = [
        calculatedCalisthenics[0] ? { ...calculatedCalisthenics[0], progress: animatedProgress0 } : undefined,
        calculatedCalisthenics[1] ? { ...calculatedCalisthenics[1], progress: animatedProgress1 } : undefined,
    ].filter(Boolean);

    const renderBenchmarkContent = () => {
        if (isLoadingCalisthenics) {
            return (
                <div className="space-y-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i}>
                            <div className="mb-1 flex items-center justify-between">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            );
        }
        if (errorCalisthenics) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data.</p>;
        }
        if (foundCalisthenicCount === 0 && exercises.length > 0) {
            return <p className="text-muted-foreground italic text-center py-4">Could not calculate benchmarks. Ensure exercises like Pull-up and Push-up exist.</p>;
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
                                    ? `${bench.currentValue} reps / ${bench.goalValue} reps Goal`
                                    : `No Data / ${bench.goalValue} reps Goal`}
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
                        <PersonSimpleRun className="h-5 w-5 flex-shrink-0 verdigris-text" />
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
                                    <p>See how your max reps compare to <span className='lowercase font-medium'>{selectedLevel}</span> calisthenic standards.</p>
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

export default CalisthenicBenchmarksView;
