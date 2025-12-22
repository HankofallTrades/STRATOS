import React, { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/core/card";
import { useVolumeChart, DisplayArchetypeData } from '../controller/useVolumeChart';
import { cn } from "@/lib/utils/cn";
import { Info } from "lucide-react";
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/core/tooltip";

interface VolumeProps {
    userId: string | undefined;
}

const VolumeView: React.FC<VolumeProps> = ({ userId }) => {
    const { progressDisplayData, isLoading, error } = useVolumeChart(userId);
    const [hoveredArchetype, setHoveredArchetype] = useState<string | null>(null);

    if (isLoading) return <p className="text-gray-500 italic text-center py-10">Loading volume data...</p>;
    if (error) return <p className="text-red-500 italic text-center py-10">Error loading volume data.</p>;

    return (
        <TooltipProvider>
            <div className="md:p-6">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-2xl font-bold">Weekly Volume</CardTitle>
                    <CardDescription>Target sets per archetype for comprehensive progress.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {progressDisplayData.map((arch: DisplayArchetypeData) => (
                            <UITooltip key={arch.name}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "space-y-2 p-3 rounded-xl transition-all duration-200 cursor-help border border-transparent",
                                            hoveredArchetype === arch.name
                                                ? "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 shadow-sm"
                                                : ""
                                        )}
                                        onMouseEnter={() => setHoveredArchetype(arch.name)}
                                        onMouseLeave={() => setHoveredArchetype(null)}
                                    >
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-0.5 flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{arch.name}</span>
                                                <Info className="h-3.5 w-3.5 text-gray-400" />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                    {arch.totalSets} / {arch.goal} sets
                                                </span>
                                                {arch.totalSets >= arch.goal && (
                                                    <span className="text-[10px] text-green-600 font-medium">Goal Met!</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden flex shadow-inner">
                                            {arch.name === 'Push' || arch.name === 'Pull' ? (
                                                <>
                                                    <div
                                                        className="h-full transition-all duration-700 ease-in-out"
                                                        style={{
                                                            width: `${Math.min(100, (arch.verticalSets / arch.goal) * 100)}%`,
                                                            backgroundColor: arch.displayVerticalColor,
                                                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
                                                        }}
                                                    />
                                                    <div
                                                        className="h-full transition-all duration-700 ease-in-out"
                                                        style={{
                                                            width: `${Math.min(100 - (arch.verticalSets / arch.goal) * 100, (arch.horizontalSets / arch.goal) * 100)}%`,
                                                            backgroundColor: arch.displayHorizontalColor,
                                                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <div
                                                    className="h-full transition-all duration-700 ease-in-out"
                                                    style={{
                                                        width: `${Math.min(100, (arch.totalSets / arch.goal) * 100)}%`,
                                                        backgroundColor: arch.displayColor,
                                                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1)'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] p-3 shadow-xl border-gray-200 dark:border-gray-800">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 border-b pb-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: arch.displayColor }} />
                                            <p className="font-bold text-sm tracking-tight">{arch.name} Progress</p>
                                        </div>
                                        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                            You've completed <span className="font-bold text-gray-900 dark:text-gray-100">{arch.totalSets}</span> of your <span className="font-bold text-gray-900 dark:text-gray-100">{arch.goal}</span> target sets this week.
                                        </p>
                                        {(arch.name === 'Push' || arch.name === 'Pull') && (
                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] uppercase text-gray-500 font-semibold">Vertical</p>
                                                    <p className="text-xs font-bold" style={{ color: arch.displayVerticalColor }}>{arch.verticalSets} sets</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] uppercase text-gray-500 font-semibold">Horizontal</p>
                                                    <p className="text-xs font-bold" style={{ color: arch.displayHorizontalColor }}>{arch.horizontalSets} sets</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${Math.min(100, (arch.totalSets / arch.goal) * 100)}%`,
                                                    backgroundColor: arch.displayColor
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-right font-medium text-gray-500 italic">
                                            {Math.round((arch.totalSets / arch.goal) * 100)}% of weekly goal
                                        </p>
                                    </div>
                                </TooltipContent>
                            </UITooltip>
                        ))}
                    </div>
                </CardContent>
            </div>
        </TooltipProvider>
    );
};

export default VolumeView;
