import React, { useRef, useEffect, useState } from 'react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { cn } from '@/lib/utils/cn';

interface CircularProgressDisplayProps {
  currentValue: number;
  goalValue: number;
  label?: string; // Optional label like "Protein"
  unit?: string;  // Optional unit like "g" or "sets"
  size?: number; // Diameter of the chart, e.g., 160
  barSize?: number; // Thickness of the progress bar, e.g., 12
  defaultColor?: string; // Color before goal is met
  highlightColor?: string; // Color when goal is met
  backgroundColor?: string; // Background color of the track
  className?: string;
  textClassName?: string;
  showTooltip?: boolean;
  showCenterText?: boolean;
}

const CircularProgressDisplay: React.FC<CircularProgressDisplayProps> = ({
  currentValue,
  goalValue,
  label,
  unit = '',
  size = 160, // Default size
  barSize = 12, // Default bar thickness
  defaultColor = '#2563EB', // Default blue
  highlightColor = '#16A34A', // Default green
  backgroundColor = 'rgba(128, 128, 128, 0.08)',
  className,
  textClassName,
  showTooltip = false,
  showCenterText = true,
}) => {
  const isGoalMet = goalValue > 0 && currentValue >= goalValue;
  const displayColor = isGoalMet ? highlightColor : defaultColor;
  // Ensure goalValue is not 0 to prevent division by zero for domain
  const effectiveGoal = goalValue > 0 ? goalValue : 1;
  const percentage = goalValue > 0 ? (currentValue / goalValue) * 100 : 0;

  // Animation logic: animate from previous value to currentValue
  const prevValueRef = useRef(currentValue);
  const [animatedValue, setAnimatedValue] = useState(currentValue);

  useEffect(() => {
    if (currentValue === prevValueRef.current) return;
    let frame: number;
    const duration = 500; // ms
    const start = performance.now();
    const from = prevValueRef.current;
    const to = currentValue;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = from + (to - from) * progress;
      setAnimatedValue(value);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = to;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [currentValue]);

  useEffect(() => {
    // If the component mounts or goal changes, sync everything
    prevValueRef.current = currentValue;
    setAnimatedValue(currentValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalValue]);

  const R = size / 2;
  const ir = R > barSize ? R - barSize : 0; // Ensure inner radius is not negative
  const innerRadiusPercentage = R > 0 ? (ir / R) * 100 : 65; // Default to 65 if R is 0
  const outerRadiusPercentage = 100;

  const chartData = [{ name: label || 'Progress', value: animatedValue, goal: effectiveGoal }];

  return (
    <div 
      className={cn("flex flex-col items-center", className)}
      style={{ width: size, height: size + (label ? 40 : 20) }} // Adjust height for label
    >
      {label && (
        <h3 className={cn("text-md font-semibold mb-1 text-center", textClassName)}>
          {label}
        </h3>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={`${innerRadiusPercentage}%`}
            outerRadius={`${outerRadiusPercentage}%`}
            barSize={barSize}
            data={chartData}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis 
              type="number" 
              domain={[0, effectiveGoal]} 
              angleAxisId={0} 
              tick={false} 
            />
            <RadialBar
              label={false} // We render text manually in the center
              background={{ fill: backgroundColor }}
              dataKey="value"
              cornerRadius={barSize / 2}
              fill={displayColor}
              isAnimationActive={true}
            />
            {showTooltip && goalValue > 0 && (
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  color: '#fff', 
                  borderRadius: '5px', 
                  padding: '5px 10px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => [
                  `${value}${unit} / ${goalValue}${unit} (${percentage.toFixed(0)}%)`,
                  name
                ]}
              />
            )}
          </RadialBarChart>
        </ResponsiveContainer>
        {showCenterText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={cn("text-2xl font-bold text-foreground", textClassName)}>
              {Math.round(animatedValue)}
            </span>
            {goalValue > 0 && (
              <span className={cn("text-xs text-muted-foreground", textClassName)}>
                / {goalValue}{unit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircularProgressDisplay; 