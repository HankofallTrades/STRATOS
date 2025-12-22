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
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import AnimatedLinearProgress from '@/components/core/AnimatedLinearProgress';
import { useBenchmarks, BenchmarkLevel, BenchmarkTypeOption } from '../../controller/useBenchmarks';

interface CalisthenicBenchmarksProps {
    userId: string | undefined;
    exercises: Exercise[];
    currentType: BenchmarkTypeOption;
    onTypeChange: (newType: BenchmarkTypeOption) => void;
    shouldAnimate?: boolean;
}

const ALL_LEVELS: BenchmarkLevel[] = ['Solid', 'Strong', 'Elite'];
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];

const CalisthenicBenchmarksView: React.FC<CalisthenicBenchmarksProps> = ({
    userId,
    exercises,
    currentType,
    onTypeChange,
    shouldAnimate = true
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
            return <p className="text-gray-500 italic text-center py-4">Loading benchmarks...</p>;
        }
        if (errorCalisthenics) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data.</p>;
        }
        if (foundCalisthenicCount === 0 && exercises.length > 0) {
            return <p className="text-gray-500 italic text-center py-4">Could not calculate benchmarks. Ensure exercises like Pull-up and Push-up exist.</p>;
        }

        if (!startAnimation) return null;
        return (
            <div key={animationKey} className="space-y-5">
                {animatedBenchmarks.map((bench, index) => (
                    <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bench.name}</span>
                            <span className="text-xs text-gray-600">
                                {bench.currentValue !== null
                                    ? `${bench.currentValue} reps / ${bench.goalValue} reps Goal`
                                    : `No Data / ${bench.goalValue} reps Goal`}
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

export default CalisthenicBenchmarksView;
