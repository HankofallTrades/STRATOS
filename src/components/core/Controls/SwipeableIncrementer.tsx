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
  // Store the initial pointer position to determine swipe direction
  const initialPanPoint = React.useRef<{ x: number; y: number } | null>(null);

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
    initialPanPoint.current = null; // Reset initial pan point
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
      onPanStart={(event, info) => {
        // Store the initial pointer position.
        // The 'point' object in PanInfo contains x and y coordinates.
        initialPanPoint.current = { x: info.point.x, y: info.point.y };

        // It's important to check if the event is a TouchEvent and has touches
        // as preventDefault might not be available or behave differently otherwise.
        // However, framer-motion's event is a wrapper.
        // We need to access the original event for preventDefault.
        // Let's try to call preventDefault in onPan when we detect vertical movement.
      }}
      onPan={(event, info) => {
        if (disabled || !initialPanPoint.current) return;

        const currentPoint = info.point;
        const deltaX = Math.abs(currentPoint.x - initialPanPoint.current.x);
        const deltaY = Math.abs(currentPoint.y - initialPanPoint.current.y);

        // Check if the swipe is primarily vertical
        if (deltaY > deltaX && deltaY > 5) { // Add a small threshold for vertical movement
          // Access the original event. For pointer events, it's directly the event.
          // For touch events, it might be nested. Framer Motion's event is a PointerEvent.
          if (event instanceof Event && typeof event.preventDefault === 'function') {
            // Check if the event is cancelable before calling preventDefault
            // This is particularly important for events like 'touchstart' or 'touchmove'
            // For 'pointermove' (which onPan uses), it's generally cancelable if part of a scroll.
            // However, some browsers might have specific behaviors.
            // Let's check the event type to be more specific for touch.
            const nativeEvent = event as PointerEvent; // Framer motion uses PointerEvents

            // Check if this is part of a touch sequence that could scroll
            // For touch events, `event.cancelable` might be true.
            // For pointer events, this check might be less direct.
            // The key is that we only want to prevent default if it's a vertical pan
            // that would otherwise scroll the page.
            if (nativeEvent.cancelable !== false) { // Check if cancelable
                 // Check if the target of the event is not one of the buttons
                const targetElement = nativeEvent.target as HTMLElement;
                if (!targetElement.closest('button')) {
                    nativeEvent.preventDefault();
                }
            }
          }
        }
      }}
      onPanEnd={handlePanEnd}
      // Prevent the div itself from being dragged visually
      // drag={false} // onPan events might not fire if drag is false. Let's test this.
      // If onPan doesn't fire, we might need to set drag={true} or drag="x"/"y"
      // and then use dragConstraints and dragElastic to prevent visual movement.
      drag // Let's enable drag and see if onPan fires. We'll constrain it later.
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0} // No elasticity, snaps back immediately
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