import React from 'react';
import { cn } from '@/lib/utils/cn';

interface ProgressBarProps {
  value: number; // Current value
  max?: number;   // Maximum value, defaults to 100
  className?: string;
  barClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  className,
  barClassName 
}) => {
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div 
      className={cn(
        "h-4 w-full bg-muted rounded-full overflow-hidden", 
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div 
        className={cn(
          "h-full bg-primary rounded-full transition-all duration-300 ease-in-out",
          barClassName
        )}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
};

export { ProgressBar }; 