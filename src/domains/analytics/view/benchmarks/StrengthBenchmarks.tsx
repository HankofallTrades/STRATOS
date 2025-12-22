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
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import AnimatedLinearProgress from '@/components/core/AnimatedLinearProgress';
import { useBenchmarks, BenchmarkLevel, BenchmarkTypeOption } from '../../controller/useBenchmarks';

interface StrengthBenchmarksProps {
    userId: string | undefined;
    exercises: Exercise[];
    currentType: BenchmarkTypeOption;
    onTypeChange: (newType: BenchmarkTypeOption) => void;
    shouldAnimate?: boolean;
}

const ALL_LEVELS: BenchmarkLevel[] = ['Solid', 'Strong', 'Elite'];
const ALL_BENCHMARK_TYPES: BenchmarkTypeOption[] = ['Strength', 'Calisthenics'];

const StrengthBenchmarksView: React.FC<StrengthBenchmarksProps> = ({
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
            return <p className="text-gray-500 italic text-center py-4">Loading benchmarks...</p>;
        }
        if (errorProfile) {
            return <p className="text-red-500 italic text-center py-4">Error loading profile data.</p>;
        }
        if (!userProfile?.weight_kg) {
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
        if (errorStrength) {
            return <p className="text-red-500 italic text-center py-4">Error loading benchmark data.</p>;
        }
        if (foundStrengthCount === 0 && exercises.length > 0) {
            return <p className="text-gray-500 italic text-center py-4">Could not calculate benchmarks. Ensure exercises like Deadlift and Squat exist.</p>;
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
                                    ? `~${bench.currentValue.toFixed(1)} kg / ${bench.goalValue?.toFixed(1)} kg Goal`
                                    : `No Data / ${bench.goalValue?.toFixed(1)} kg Goal`}
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

    return (
        <div className="relative md:p-6">
            <CardHeader className="p-0 mb-4 md:pb-0">
                <div className="flex items-center justify-between mb-4">
                    <Barbell className="mr-2 h-5 w-5 text-fitnessIndigo flex-shrink-0" />
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
                                    <p>See how your estimated one-rep max compares to <span className='lowercase font-medium'>{selectedLevel}</span> strength standards.</p>
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
                                    className="rounded-full h-7 px-2.5 text-xs font-medium bg-fitnessIndigo hover:bg-fitnessIndigo/90 w-[80px] justify-center"
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

export default StrengthBenchmarksView;
