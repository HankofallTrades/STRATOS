import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

// Frames vendored from sindresorhus/cli-spinners (MIT).
const SPINNERS = {
  dots: {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  },
  aesthetic: {
    interval: 80,
    frames: [
      "▰▱▱▱▱▱▱",
      "▰▰▱▱▱▱▱",
      "▰▰▰▱▱▱▱",
      "▰▰▰▰▱▱▱",
      "▰▰▰▰▰▱▱",
      "▰▰▰▰▰▰▱",
      "▰▰▰▰▰▰▰",
      "▰▱▱▱▱▱▱",
    ],
  },
  moon: {
    interval: 80,
    frames: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  },
} as const;

interface UnicodeSpinnerProps {
  variant?: keyof typeof SPINNERS;
  className?: string;
  label?: string;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const UnicodeSpinner = ({
  variant = "dots",
  className,
  label = "Loading",
}: UnicodeSpinnerProps) => {
  const { frames, interval } = SPINNERS[variant];
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = window.setInterval(
      () => setFrameIndex((index) => (index + 1) % frames.length),
      interval
    );
    return () => window.clearInterval(timer);
  }, [frames.length, interval]);

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block font-mono leading-none", className)}
    >
      {frames[frameIndex]}
    </span>
  );
};

export default UnicodeSpinner;
