import React from 'react';
import { Info } from "lucide-react";
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/core/tooltip";
import { useVolumeChart, DisplayArchetypeData } from '../hooks/useVolumeChart';

interface VolumeProps {
    userId: string | undefined;
    embedded?: boolean;
}

const VolumeView: React.FC<VolumeProps> = ({ userId, embedded = false }) => {
    const { progressDisplayData, isLoading, error } = useVolumeChart(userId);

    if (isLoading) {
        return (
            <div className="p-5 text-center text-sm italic text-muted-foreground md:p-6">
                Loading volume data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-5 text-center text-sm italic text-red-400 md:p-6">
                Error loading volume data.
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className={embedded ? "" : "stone-surface rounded-[26px] p-5 md:p-6"}>
                {!embedded ? (
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Weekly Volume</h2>
                ) : null}

                <div className={`${embedded ? "" : "mt-5 "}grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2`}>
                    {progressDisplayData.map((arch: DisplayArchetypeData) => (
                        <UITooltip key={arch.name}>
                            <TooltipTrigger asChild>
                                <div className="space-y-2">
                                    <div className="flex items-end justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground/88">
                                                {arch.name}
                                            </span>
                                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/82">
                                            {arch.totalSets} / {arch.goal}
                                        </span>
                                    </div>

                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                                        <div className="flex h-full">
                                            {arch.name === 'Push' || arch.name === 'Pull' ? (
                                                <>
                                                    <div
                                                        className="h-full transition-all duration-700 ease-in-out"
                                                        style={{
                                                            width: `${Math.min(100, (arch.verticalSets / arch.goal) * 100)}%`,
                                                            backgroundColor: arch.displayVerticalColor,
                                                        }}
                                                    />
                                                    <div
                                                        className="h-full transition-all duration-700 ease-in-out"
                                                        style={{
                                                            width: `${Math.min(100 - (arch.verticalSets / arch.goal) * 100, (arch.horizontalSets / arch.goal) * 100)}%`,
                                                            backgroundColor: arch.displayHorizontalColor,
                                                        }}
                                                    />
                                                </>
                                            ) : (
                                                <div
                                                    className="h-full transition-all duration-700 ease-in-out"
                                                    style={{
                                                        width: `${Math.min(100, (arch.totalSets / arch.goal) * 100)}%`,
                                                        backgroundColor: arch.displayColor,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TooltipTrigger>

                            <TooltipContent side="top" className="stone-panel max-w-[240px] border-white/10 p-3 shadow-xl">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 border-b border-white/8 pb-1">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: arch.displayColor }} />
                                        <p className="text-sm font-bold tracking-tight">{arch.name} Progress</p>
                                    </div>
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        You've completed <span className="font-bold text-foreground">{arch.totalSets}</span> of your <span className="font-bold text-foreground">{arch.goal}</span> target sets this week.
                                    </p>
                                    {(arch.name === 'Push' || arch.name === 'Pull') && (
                                        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/8 pt-2">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Vertical</p>
                                                <p className="text-xs font-bold" style={{ color: arch.displayVerticalColor }}>{arch.verticalSets} sets</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Horizontal</p>
                                                <p className="text-xs font-bold" style={{ color: arch.displayHorizontalColor }}>{arch.horizontalSets} sets</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TooltipContent>
                        </UITooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
};

export default VolumeView;
