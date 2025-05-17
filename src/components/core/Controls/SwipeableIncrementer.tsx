import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/core/button'; // Assuming this path is correct
import { cn } from '@/lib/utils/cn'; // Assuming this path is correct

interface SwipeableIncrementerProps {
  onAdjust: (adjustment: number) => void;
  smallStepPositive?: number;
  smallStepNegative?: number;
  swipeUpStep?: number;
  swipeDownStep?: number;
  swipeRightStep?: number;
  swipeLeftStep?: number;
  label?: string;
  disabled?: boolean;
  incrementIcon?: React.ReactNode;
  decrementIcon?: React.ReactNode;
  buttonClassName?: string;
  wrapperClassName?: string;
  buttonSize?: "default" | "sm" | "lg" | "icon" | null; // For button size
  iconSize?: number; // For icon size
}

const SWIPE_THRESHOLD = 30; // Min distance for a swipe to be registered
const SWIPE_VELOCITY_THRESHOLD = 200; // Min velocity for a swipe

export const SwipeableIncrementer: React.FC<SwipeableIncrementerProps> = ({
  onAdjust,
  smallStepPositive = 1,
  smallStepNegative = -1,
  swipeUpStep = 5,
  swipeDownStep = -5,
  swipeRightStep = 2.5,
  swipeLeftStep = -2.5,
  label,
  disabled = false,
  incrementIcon,
  decrementIcon,
  buttonClassName,
  wrapperClassName,
  buttonSize = "icon",
  iconSize = 14,
}) => {
  const handleDecrementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent pan event from firing on the parent
    if (!disabled) {
      onAdjust(smallStepNegative);
    }
  };

  const handleIncrementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent pan event from firing on the parent
    if (!disabled) {
      onAdjust(smallStepPositive);
    }
  };

  const handlePanEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (disabled) return;

    const { offset, velocity } = info;

    // Determine primary swipe direction
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // Horizontal swipe
      if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
        if (offset.x > 0) { // Swipe Right
          onAdjust(swipeRightStep);
        } else { // Swipe Left
          onAdjust(swipeLeftStep);
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(offset.y) > SWIPE_THRESHOLD || Math.abs(velocity.y) > SWIPE_VELOCITY_THRESHOLD) {
        if (offset.y > 0) { // Swipe Down
          onAdjust(swipeDownStep);
        } else { // Swipe Up
          onAdjust(swipeUpStep);
        }
      }
    }
  };

  return (
    <motion.div
      className={cn("flex items-center justify-center gap-1", wrapperClassName)}
      onPanEnd={handlePanEnd}
      // Prevent the div itself from being dragged visually
      drag={false} 
      // Or, if you want to allow drag but constrain it so it snaps back:
      // drag="x" // or "y" or true
      // dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      // dragElastic={0} // No elasticity, snaps back immediately
      aria-label={label || 'Value adjuster'}
      role="group"
    >
      <Button
        variant="ghost"
        size={buttonSize}
        className={cn("h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent", buttonClassName)}
        onClick={handleDecrementClick}
        disabled={disabled}
        aria-label={label ? `Decrease ${label}` : 'Decrease value'}
        // Stop propagation to ensure pan on parent is not affected by button interactions
        onPointerDown={(e) => e.stopPropagation()}
      >
        {decrementIcon || <Minus size={iconSize} />}
      </Button>
      <Button
        variant="ghost"
        size={buttonSize}
        className={cn("h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-accent", buttonClassName)}
        onClick={handleIncrementClick}
        disabled={disabled}
        aria-label={label ? `Increase ${label}` : 'Increase value'}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {incrementIcon || <Plus size={iconSize} />}
      </Button>
    </motion.div>
  );
};

export default SwipeableIncrementer; 