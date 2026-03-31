import React from 'react';
import { animate, motion, PanInfo, useMotionValue } from 'framer-motion';
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
const VISUAL_OFFSET_LIMIT = 10;

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
  const visualOffsetX = useMotionValue(0);
  const visualOffsetY = useMotionValue(0);
  const [isPanning, setIsPanning] = React.useState(false);
  // Tracks whether a pan gesture is active or just ended, to suppress
  // button clicks synthesized by the browser at the touchend position.
  const panActive = React.useRef(false);
  const panClearTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDecrementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (panActive.current || disabled) return;
    onAdjust(smallStepNegative);
  };

  const handleIncrementClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (panActive.current || disabled) return;
    onAdjust(smallStepPositive);
  };

  const handlePanEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    initialPanPoint.current = null;
    setIsPanning(false);
    animate(visualOffsetX, 0, { type: "spring", stiffness: 380, damping: 28 });
    animate(visualOffsetY, 0, { type: "spring", stiffness: 380, damping: 28 });
    // Keep panActive set for a short window after pan ends so that any
    // synthetic click the browser fires at the touchend position is ignored.
    if (panClearTimeout.current) clearTimeout(panClearTimeout.current);
    panClearTimeout.current = setTimeout(() => {
      panActive.current = false;
    }, 300);
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

  React.useEffect(() => {
    return () => {
      if (panClearTimeout.current) clearTimeout(panClearTimeout.current);
    };
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isPanning) {
      root.classList.add('gesture-lock');
      body.classList.add('gesture-lock');
      return () => {
        root.classList.remove('gesture-lock');
        body.classList.remove('gesture-lock');
      };
    }

    root.classList.remove('gesture-lock');
    body.classList.remove('gesture-lock');

    return undefined;
  }, [isPanning]);

  return (
    <motion.div
      className={cn("flex items-center justify-center gap-1 overflow-hidden [contain:paint] touch-none", wrapperClassName)}
      data-card-swipe-block="true"
      style={{ x: visualOffsetX, y: visualOffsetY }}
      onPanStart={(event, info) => {
        initialPanPoint.current = { x: info.point.x, y: info.point.y };
        panActive.current = true;
        if (panClearTimeout.current) clearTimeout(panClearTimeout.current);
        setIsPanning(true);
        visualOffsetX.set(0);
        visualOffsetY.set(0);

        // It's important to check if the event is a TouchEvent and has touches
        // as preventDefault might not be available or behave differently otherwise.
        // However, framer-motion's event is a wrapper.
        // We need to access the original event for preventDefault.
        // Let's try to call preventDefault in onPan when we detect vertical movement.
      }}
      onPan={(event, info) => {
        if (disabled || !initialPanPoint.current) return;

        visualOffsetX.set(
          Math.round(
            Math.max(-VISUAL_OFFSET_LIMIT, Math.min(VISUAL_OFFSET_LIMIT, info.offset.x * 0.16))
          )
        );
        visualOffsetY.set(
          Math.round(
            Math.max(-VISUAL_OFFSET_LIMIT, Math.min(VISUAL_OFFSET_LIMIT, info.offset.y * 0.16))
          )
        );

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
