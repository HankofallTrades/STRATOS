import React from 'react';
import { formatTime } from '@/lib/utils/timeUtils';
import { Clock, Calendar, Award } from "lucide-react";
import { Barbell } from "@phosphor-icons/react";
import { Skeleton } from "@/components/core/skeleton";
import { Exercise } from '@/lib/types/workout';
import { usePerformanceOverview } from '../hooks/usePerformanceOverview';

interface PerformanceOverviewProps {
    userId: string | undefined;
    exercises: Exercise[];
}

const PerformanceOverviewView: React.FC<PerformanceOverviewProps> = ({ userId, exercises }) => {
    const {
        stats,
        isLoadingStats,
        errorStats,
        averageTime,
        mostCommonExerciseName
    } = usePerformanceOverview(userId, exercises);

    const metrics = [
        {
            label: 'Workouts',
            value: `${stats?.total_workouts ?? 0}`,
            icon: Calendar,
            iconClassName: 'app-accent-text',
            valueClassName: 'text-4xl',
        },
        {
            label: 'Time',
            value: formatTime(stats?.total_duration_seconds ?? 0),
            icon: Clock,
            iconClassName: 'app-accent-text',
            valueClassName: 'text-3xl',
        },
        {
            label: 'Avg',
            value: formatTime(averageTime),
            icon: Barbell,
            iconClassName: 'app-accent-text',
            valueClassName: 'text-3xl',
        },
        {
            label: 'Top Exercise',
            value: mostCommonExerciseName ?? 'None',
            icon: Award,
            iconClassName: 'warm-metal-text',
            valueClassName: 'text-2xl leading-tight break-words',
        },
    ];

    if (isLoadingStats) {
        return (
            <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                    {[...Array(4)].map((_, index) => (
                        <div key={index} className="space-y-3">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-9 w-3/4" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (errorStats) {
        return (
            <div className="stone-surface rounded-[26px] p-5 text-center text-sm italic text-red-400 md:p-6">
                Error loading performance overview.
            </div>
        );
    }

    return (
        <section className="stone-panel stone-panel-hero overflow-hidden rounded-[28px] p-5 md:p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
                {metrics.map(({ label, value, icon: Icon, iconClassName, valueClassName }) => (
                    <div key={label} className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground/72">
                            <Icon className={`h-4 w-4 ${iconClassName}`} />
                            <span>{label}</span>
                        </div>
                        <p className={`font-semibold tracking-tight text-foreground ${valueClassName}`}>
                            {value}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PerformanceOverviewView;
