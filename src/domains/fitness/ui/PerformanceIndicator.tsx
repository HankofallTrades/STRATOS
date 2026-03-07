import React from 'react';
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PerformanceIndicatorProps {
  direction: 'up' | 'down' | null;
  visible: boolean;
  description?: string;
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  direction,
  visible,
  description
}) => {
  if (!visible || !direction) {
    return null;
  }

  const IconComponent = direction === 'up' ? ArrowUp : ArrowDown;
  const colorClass = direction === 'up' ? "verdigris-text" : "warm-metal-text";

  return (
    <IconComponent
      size={16}
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
        colorClass
      )}
      title={description}
      aria-hidden="true"
    />
  );
};

export default PerformanceIndicator; 
