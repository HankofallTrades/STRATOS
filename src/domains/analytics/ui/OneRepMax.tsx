import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { NameType, Payload, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { TooltipProps } from 'recharts/types/component/Tooltip';
import { CardContent, CardHeader } from "@/components/core/card";
import { ChevronDown, Search } from "lucide-react";
import { Exercise } from '@/lib/types/workout';
import { Button } from "@/components/core/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/core/Dialog";
import { Input } from "@/components/core/input";
import { Skeleton } from "@/components/core/skeleton";
import { cn } from "@/lib/utils/cn";
import { useOneRepMax, TimeRange, UnifiedDataPoint } from '../hooks/useOneRepMax';
import {
    workoutDialogClassName,
    workoutMenuInputClassName,
    workoutMenuOptionClassName,
} from "@/domains/fitness/ui/workoutSelectionStyles";

interface OneRepMaxProps {
    userId: string | undefined;
    exercises: Exercise[];
    isLoadingExercises: boolean;
    errorExercises: Error | null;
    embedded?: boolean;
}

const lineColors = [
    "#7cad9d",
    "#c8a06c",
    "#5f8377",
    "#a5b7b1",
    "#709787",
    "#b78d62",
    "#91b8ab",
    "#67757d",
];

const timeRangeOptions: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

interface ChartTooltipEntry extends Omit<Payload<ValueType, NameType>, 'dataKey' | 'name' | 'payload' | 'value'> {
    dataKey?: string;
    name?: string;
    payload?: UnifiedDataPoint;
    value?: number;
}

type ChartTooltipProps = TooltipProps<ValueType, NameType> & {
    label?: number;
    payload?: ChartTooltipEntry[];
};

interface LockedTooltipState {
    label?: number;
    payload?: ChartTooltipEntry[];
}

interface SelectableDotProps {
    cx?: number;
    cy?: number;
    stroke?: string;
    fill?: string;
    payload?: UnifiedDataPoint;
    dataKey?: string;
    name?: string;
    value?: number | string | null;
    onSelect?: (state: LockedTooltipState) => void;
}

interface CombinationLegendEntry {
    id?: string;
    color?: string;
}

const formatDate = (dateInput: Date | string): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatAxisDate = (timestamp: number, timeRange?: TimeRange): string => {
    const date = new Date(timestamp);
    if (timeRange === '1Y') {
        const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
        return monthInitials[date.getUTCMonth()];
    } else {
        return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
    }
};

const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
        const timestamp = label;
        if (timestamp == null) {
            return null;
        }
        const date = new Date(timestamp);

        return (
            <div className="stone-panel rounded-[16px] border-white/10 p-3 text-sm space-y-1">
                <p className="label mb-1 font-semibold text-foreground">{`Date: ${formatDate(date)}`}</p>
                {payload.map((entry, index: number) => {
                    const name = entry.name;
                    const value = entry.value;
                    const color = entry.color;
                    const dataKey = entry.dataKey;
                    const pointData = entry.payload;

                    if (name == null || value == null || dataKey == null || !pointData) return null;

                    const parts = name.split(' - ');
                    const variation = parts[0] || 'Unknown';
                    const equipmentTypeFromDisplayName = parts[1] || 'Unknown';

                    const variationDisplay = variation === 'Default' ? 'Standard' : variation;
                    let equipmentDisplay = equipmentTypeFromDisplayName;

                    if (equipmentTypeFromDisplayName === 'DB/KB' &&
                        pointData._originalEquipment &&
                        pointData._originalEquipment[dataKey]) {
                        const originalEquipment = pointData._originalEquipment[dataKey];
                        if (originalEquipment === 'Dumbbell' || originalEquipment === 'Kettlebell') {
                            equipmentDisplay = originalEquipment;
                        }
                    } else if (equipmentTypeFromDisplayName === 'Default') {
                        if (pointData._originalEquipment && pointData._originalEquipment[dataKey]) {
                            const originalEq = pointData._originalEquipment[dataKey];
                            equipmentDisplay = (originalEq && originalEq !== 'Default') ? originalEq : 'Bodyweight';
                        } else {
                            equipmentDisplay = 'Bodyweight';
                        }
                    }

                    return (
                        <div key={index} className="tooltip-entry">
                            <p className="intro font-medium" style={{ color: color }}>
                                {`${variationDisplay} (${equipmentDisplay}): ~${value.toFixed(1)} kg`}
                            </p>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

const SelectableDot = ({ cx, cy, fill, payload, dataKey, name, value, onSelect }: SelectableDotProps) => {
    if (cx == null || cy == null || value == null || !payload || !dataKey || !name) {
        return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numericValue)) {
        return null;
    }

    const selectPoint = () => {
        onSelect?.({
            label: payload.workout_timestamp,
            payload: [{
                dataKey,
                name,
                payload,
                value: numericValue,
                color: fill,
            }],
        });
    };

    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={20}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseDown={selectPoint}
                onTouchStart={selectPoint}
            />
            <circle cx={cx} cy={cy} r={4.5} fill={fill} strokeWidth={0} />
        </g>
    );
};

interface AnalyticsExerciseSelectorProps {
    exercises: Exercise[];
    selectedExercise: Exercise | null;
    onSelectExercise: (exercise: Exercise) => void;
    disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    weights: "Weights",
    calisthenics: "Calisthenics",
    cardio: "Cardio",
    mobility: "Mobility",
    stability: "Stability",
};

const CATEGORY_BADGE_STYLES: Record<string, string> = {
    weights: 'bg-white/[0.06] text-foreground/50',
    calisthenics: 'bg-amber-500/10 text-amber-400/70',
    cardio: 'bg-sky-500/10 text-sky-400/70',
    mobility: 'bg-emerald-500/10 text-emerald-400/70',
    stability: 'bg-violet-500/10 text-violet-400/70',
};

const AnalyticsExerciseSelector = ({
    exercises,
    selectedExercise,
    onSelectExercise,
    disabled = false,
}: AnalyticsExerciseSelectorProps) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredExercises = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return exercises;
        return exercises.filter((exercise) => exercise.name.toLowerCase().includes(query));
    }, [exercises, searchQuery]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            setSearchQuery("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    disabled={disabled}
                    className="h-auto max-w-full justify-start gap-1.5 rounded-[14px] px-0 py-0 text-left text-2xl font-semibold text-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                    <span className="truncate" title={selectedExercise?.name || "Exercise"}>
                        {selectedExercise ? selectedExercise.name : "Exercise"}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent
                className={cn(
                    workoutDialogClassName,
                    "!left-0 !top-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none p-4 sm:!left-[50%] sm:!top-[50%] sm:!h-auto sm:!w-full sm:!max-w-md sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:rounded-[28px] sm:p-5"
                )}
                onOpenAutoFocus={(event) => event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">Select Exercise</DialogTitle>
                </DialogHeader>
                <div className="flex min-h-0 flex-1 flex-col space-y-4 pt-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75" />
                        <Input
                            placeholder="Search exercises..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className={`${workoutMenuInputClassName} pl-11`}
                        />
                    </div>

                    <div className="stone-surface min-h-0 flex-1 space-y-1 overflow-y-auto rounded-[18px] p-2 sm:max-h-80">
                        {filteredExercises.length > 0 ? (
                            filteredExercises.map((exercise) => (
                                <Button
                                    key={exercise.id}
                                    variant="ghost"
                                    onClick={() => {
                                        onSelectExercise(exercise);
                                        setOpen(false);
                                        setSearchQuery("");
                                    }}
                                    disabled={exercise.id === selectedExercise?.id}
                                    className={`${workoutMenuOptionClassName} h-11 select-none justify-start px-4 text-sm ${
                                        exercise.id === selectedExercise?.id ? "bg-white/[0.03]" : ""
                                    }`}
                                >
                                    <span className="truncate">{exercise.name}</span>
                                    {exercise.exercise_category && exercise.exercise_category !== "weights" && (
                                        <span className={cn(
                                            "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                            CATEGORY_BADGE_STYLES[exercise.exercise_category] ?? "bg-white/[0.06] text-foreground/50"
                                        )}>
                                            {CATEGORY_LABELS[exercise.exercise_category] ?? exercise.exercise_category}
                                        </span>
                                    )}
                                </Button>
                            ))
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">No matching exercises found</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const OneRepMaxView: React.FC<OneRepMaxProps> = ({
    userId,
    exercises,
    isLoadingExercises,
    errorExercises,
    embedded = false,
}) => {
    const [lockedTooltip, setLockedTooltip] = useState<LockedTooltipState | null>(null);
    const {
        selectedExercise,
        setSelectedExercise,
        selectedTimeRange,
        setSelectedTimeRange,
        isLoadingHistory,
        errorHistory,
        allCombinationKeys,
        activeCombinationKeys,
        toggleCombination,
        chartData,
        domain,
        ticks
    } = useOneRepMax(userId, exercises);

    const handleSelectExercise = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setLockedTooltip(null);
    };

    const captureTooltip = (state: LockedTooltipState) => setLockedTooltip(state);

    const legendPayload = useMemo(() => {
        return allCombinationKeys.map((key, index) => {
            const parts = key.split('|');
            const variationPart = parts[0];
            const equipmentPart = parts[1];

            const displayVariation = (variationPart === 'Default') ? 'Standard' : variationPart;
            let displayEquipment;
            if (equipmentPart === 'DB_KB_COMBO') {
                displayEquipment = 'DB/KB';
            } else if (equipmentPart === 'Default') {
                displayEquipment = 'Bodyweight';
            } else {
                displayEquipment = equipmentPart;
            }

            const displayValue = displayVariation === 'Standard' ? displayEquipment : `${displayEquipment} (${displayVariation})`;

            return {
                id: key,
                type: 'line' as const,
                value: displayValue,
                color: lineColors[index % lineColors.length],
            };
        });
    }, [allCombinationKeys]);

    return (
        <>
            {isLoadingExercises ? (
                <div className={embedded ? "" : "stone-surface rounded-[26px] p-5 md:p-6"}>
                    <Skeleton className="mb-4 h-8 w-48" />
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-8 w-10 rounded-[12px]" />
                        ))}
                    </div>
                    <Skeleton className="h-[400px] w-full rounded-[16px]" />
                </div>
            ) : errorExercises ? (
                <div className="p-5 text-center text-sm italic text-red-400 md:p-6">
                    Error loading exercises: {errorExercises.message}
                </div>
            ) : exercises.length > 0 ? (
                <div className={embedded ? "" : "stone-surface rounded-[26px] p-5 md:p-6"}>
                    <CardHeader className="mb-4 p-0 md:pb-0">
                        <div className="mb-4 flex items-center">
                            <AnalyticsExerciseSelector
                                exercises={exercises}
                                selectedExercise={selectedExercise}
                                onSelectExercise={handleSelectExercise}
                                disabled={isLoadingExercises}
                            />
                        </div>

                        {selectedExercise && (
                            <div className="flex flex-wrap gap-1.5">
                                {timeRangeOptions.map(range => (
                                    <Button
                                        key={range}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedTimeRange(range)}
                                        aria-label={`Select ${range}`}
                                        className={selectedTimeRange === range
                                            ? "app-tonal-control h-8 rounded-[12px] px-2 text-foreground"
                                            : "h-8 rounded-[12px] border-0 bg-transparent px-2 text-foreground/62 hover:bg-white/[0.04] hover:text-foreground"
                                        }
                                    >
                                        {range}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 pt-0">
                        {selectedExercise && (
                            <>
                                {isLoadingHistory ? (
                                    <div className="py-10">
                                        <Skeleton className="mx-auto h-[300px] w-full rounded-[16px]" />
                                    </div>
                                ) : errorHistory ? (
                                    <p className="text-red-500 italic text-center py-10">Error loading history: {errorHistory.message}</p>
                                ) : chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 10, right: 4, left: 8, bottom: 5 }}
                                        >
                                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                                            <XAxis
                                                dataKey="workout_timestamp"
                                                tickFormatter={(ts) => formatAxisDate(ts, selectedTimeRange)}
                                                type="number"
                                                domain={domain}
                                                ticks={ticks}
                                                tick={{ fontSize: 12, fill: 'rgba(214, 223, 218, 0.64)' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                orientation="right"
                                                tick={{ fontSize: 12, fill: 'rgba(214, 223, 218, 0.64)' }}
                                                domain={['auto', 'auto']}
                                                tickFormatter={(value) => `${value} kg`}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={lockedTooltip ? { stroke: 'rgba(214, 223, 218, 0.18)', strokeWidth: 1 } : false}
                                                active={!!lockedTooltip}
                                                label={lockedTooltip?.label}
                                                payload={lockedTooltip?.payload}
                                                trigger="click"
                                            />
                                            <Legend
                                                onClick={(data) => {
                                                    if (data.id) {
                                                        toggleCombination(data.id);
                                                    }
                                                }}
                                                formatter={(value: string, entry: CombinationLegendEntry) => {
                                                    const isActive = !!entry.id && activeCombinationKeys.includes(entry.id);
                                                    const color = isActive ? entry.color : 'rgba(214, 223, 218, 0.4)';
                                                    return <span style={{ color, cursor: 'pointer' }}>{value}</span>;
                                                }}
                                                payload={legendPayload}
                                                wrapperStyle={{ paddingTop: '20px' }}
                                            />
                                            {allCombinationKeys.map((key, index) => {
                                                if (!activeCombinationKeys.includes(key)) return null;

                                                const parts = key.split('|');
                                                const variationPart = parts[0];
                                                const equipmentPart = parts[1];
                                                const displayVariation = variationPart === 'Default' ? 'Standard' : variationPart;
                                                const displayEquipment = equipmentPart === 'DB_KB_COMBO' ? 'DB/KB' : (equipmentPart === 'Default' ? 'Default' : equipmentPart);
                                                const displayName = `${displayVariation} - ${displayEquipment}`;

                                                return (
                                                    <Line
                                                        key={key}
                                                        type="monotone"
                                                        dataKey={key}
                                                        name={displayName}
                                                        stroke={lineColors[index % lineColors.length]}
                                                        strokeWidth={2.6}
                                                        dot={(dotProps) => (
                                                            <SelectableDot
                                                                {...dotProps}
                                                                fill={lineColors[index % lineColors.length]}
                                                                onSelect={captureTooltip}
                                                            />
                                                        )}
                                                        activeDot={{ r: 9, fill: lineColors[index % lineColors.length], stroke: 'rgba(214, 223, 218, 0.22)', strokeWidth: 10 }}
                                                        connectNulls={true}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-muted-foreground italic text-center py-10">
                                        {selectedTimeRange === 'ALL'
                                            ? "No estimated 1RM history found for this exercise. Complete some sets!"
                                            : `No estimated 1RM history found for this exercise in the last ${selectedTimeRange}.`}
                                    </p>
                                )}
                            </>
                        )}
                        {!selectedExercise && (
                            <p className="text-muted-foreground italic text-center py-10">Select an exercise above to see its progress.</p>
                        )}
                    </CardContent>
                </div>
            ) : (
                <div className="p-5 text-sm italic text-muted-foreground md:p-6">
                    No exercises defined yet. Add some via the workout screen.
                </div>
            )}
        </>
    );
};

export default OneRepMaxView;
