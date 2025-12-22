import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RestTimerProps {
    startTime: number;
    className?: string;
}

export const RestTimer: React.FC<RestTimerProps> = ({ startTime, className }) => {
    const [elapsed, setElapsed] = useState<number>(0);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            setElapsed(Math.floor((now - startTime) / 1000));
        };

        update(); // Initial update
        const interval = setInterval(update, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds: number) => {
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${mm}:${ss.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn("flex items-center gap-1.5 text-xs font-medium text-primary animate-in fade-in slide-in-from-left-2 duration-300", className)}>
            <Timer size={13} className="animate-pulse" />
            <span>{formatTime(elapsed)}</span>
        </div>
    );
};

export default RestTimer;
