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

    if (isLoading) return <p className="text-muted-foreground italic text-center py-10">Loading volume data...</p>;
    if (error) return <p className="text-red-500 italic text-center py-10">Error loading volume data.</p>;

    return (
        <TooltipProvider>
            <div className="stone-surface rounded-[22px] p-5 md:p-6">
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
                                            "space-y-2 p-3 rounded-[18px] transition-all duration-200 cursor-help border border-transparent",
                                            hoveredArchetype === arch.name
                                                ? "bg-white/[0.03] border-white/[0.05]"
                                                : ""
                                        )}
                                        onMouseEnter={() => setHoveredArchetype(arch.name)}
                                        onMouseLeave={() => setHoveredArchetype(null)}
                                    >
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-0.5 flex items-center gap-2">
                                                <span className="text-sm font-bold uppercase tracking-tight text-foreground">{arch.name}</span>
                                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-foreground">
                                                    {arch.totalSets} / {arch.goal} sets
                                                </span>
                                                {arch.totalSets >= arch.goal && (
                                                    <span className="verdigris-text text-[10px] font-medium">Goal Met</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-white/[0.04]">
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
                                <TooltipContent side="top" className="stone-panel max-w-[240px] border-white/10 p-3 shadow-xl">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 border-b border-white/8 pb-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: arch.displayColor }} />
                                            <p className="font-bold text-sm tracking-tight">{arch.name} Progress</p>
                                        </div>
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            You've completed <span className="font-bold text-foreground">{arch.totalSets}</span> of your <span className="font-bold text-foreground">{arch.goal}</span> target sets this week.
                                        </p>
                                        {(arch.name === 'Push' || arch.name === 'Pull') && (
                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/8">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Vertical</p>
                                                    <p className="text-xs font-bold" style={{ color: arch.displayVerticalColor }}>{arch.verticalSets} sets</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Horizontal</p>
                                                    <p className="text-xs font-bold" style={{ color: arch.displayHorizontalColor }}>{arch.horizontalSets} sets</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                                            <div
                                                className="h-full"
                                                style={{
                                                    width: `${Math.min(100, (arch.totalSets / arch.goal) * 100)}%`,
                                                    backgroundColor: arch.displayColor
                                                }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-right font-medium text-muted-foreground italic">
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
