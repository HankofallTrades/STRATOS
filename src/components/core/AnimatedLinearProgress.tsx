import React from 'react';
import { cn } from '@/lib/utils/cn';

interface AnimatedLinearProgressProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
}

const AnimatedLinearProgress: React.FC<AnimatedLinearProgressProps> = ({
  value,
  className,
  barClassName,
}) => (
  <div
    className={cn(
      "h-2 w-full bg-muted rounded-full overflow-hidden",
      className
    )}
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className={cn(
        "h-full bg-primary rounded-full transition-none",
        barClassName
      )}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

export default AnimatedLinearProgress; 