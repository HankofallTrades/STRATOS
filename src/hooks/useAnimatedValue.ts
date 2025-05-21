import { useRef, useEffect, useState } from 'react';

export function useAnimatedValue(value: number, duration = 500) {
  const [animated, setAnimated] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    let frame: number;
    const start = performance.now();
    const from = prev.current;
    const to = value;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimated(from + (to - from) * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        prev.current = to;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  useEffect(() => {
    prev.current = value;
    setAnimated(value);
  }, [value]);

  return animated;
} 