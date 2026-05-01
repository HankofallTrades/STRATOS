import React from 'react';
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface PerformanceIndicatorProps {
  direction: 'up' | 'down' | null;
  visible: boolean;
  description?: string;
  onClick?: () => void;
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  direction,
  visible,
  description,
  onClick
}) => {
  if (!visible || !direction) {
    return null;
  }

  const IconComponent = direction === 'up' ? ArrowUp : ArrowDown;
  const colorClass = direction === 'up' ? "verdigris-text" : "warm-metal-text";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="absolute right-2 top-1/2 -translate-y-1/2"
      aria-label={description ?? "Apply performance recommendation"}
      title={description}
    >
      <IconComponent
        size={16}
        className={cn("transition-opacity", colorClass)}
        aria-hidden="true"
      />
    </button>
  );
};

export default PerformanceIndicator; 
