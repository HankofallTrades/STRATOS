import React, { useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CardContent, CardHeader } from "@/components/core/card";
import { ChevronDown } from "lucide-react";
import { Exercise } from '@/lib/types/workout';
import { Button } from "@/components/core/button";
import { useOneRepMax, TimeRange } from '../controller/useOneRepMax';

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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const timestamp = label;
        const date = new Date(timestamp);

        return (
            <div className="stone-panel rounded-[16px] border-white/10 p-3 text-sm space-y-1">
                <p className="label mb-1 font-semibold text-foreground">{`Date: ${formatDate(date)}`}</p>
                {payload.map((entry: any, index: number) => {
                    const name = entry.name;
                    const value = entry.value;
                    const color = entry.color;
                    const dataKey = entry.dataKey;
                    const pointData = entry.payload;

                    if (name == null || value == null) return null;

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

const OneRepMaxView: React.FC<OneRepMaxProps> = ({
    userId,
    exercises,
    isLoadingExercises,
    errorExercises,
    embedded = false,
}) => {
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
                <div className="p-5 text-sm italic text-muted-foreground md:p-6">
                    Loading exercises...
                </div>
            ) : errorExercises ? (
                <div className="p-5 text-center text-sm italic text-red-400 md:p-6">
                    Error loading exercises: {errorExercises.message}
                </div>
            ) : exercises.length > 0 ? (
                <div className={embedded ? "" : "stone-surface rounded-[26px] p-5 md:p-6"}>
                    <CardHeader className="mb-4 p-0 md:pb-0">
                        <div className="mb-4 flex items-center">
                            <div className="relative inline-flex items-center cursor-pointer min-w-0">
                                <span className="text-2xl font-semibold truncate" title={selectedExercise?.name || 'Exercise'}>
                                    {selectedExercise ? selectedExercise.name : "Exercise"}
                                </span>
                                <div className="flex items-center ml-1">
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <select
                                    className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer"
                                    value={selectedExercise?.id || ""}
                                    onChange={(e) => {
                                        const selected = exercises.find(ex => ex.id === e.target.value);
                                        setSelectedExercise(selected || null);
                                    }}
                                    disabled={isLoadingExercises}
                                >
                                    <option value="" disabled={!!selectedExercise}>-- Select an Exercise --</option>
                                    {exercises.map((exercise) => (
                                        <option key={exercise.id} value={exercise.id}>
                                            {exercise.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    <p className="text-muted-foreground italic text-center py-10">Loading history...</p>
                                ) : errorHistory ? (
                                    <p className="text-red-500 italic text-center py-10">Error loading history: {errorHistory.message}</p>
                                ) : chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 5, right: -15, left: 20, bottom: 5 }}
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
                                            <Tooltip content={<CustomTooltip />} cursor={false} />
                                            <Legend
                                                onClick={(data) => toggleCombination(data.id)}
                                                formatter={(value, entry: any) => {
                                                    const isActive = activeCombinationKeys.includes(entry.id);
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
                                                        strokeWidth={2.2}
                                                        dot={{ r: 2.75, fill: lineColors[index % lineColors.length], strokeWidth: 0 }}
                                                        activeDot={{ r: 7, fill: lineColors[index % lineColors.length] }}
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
