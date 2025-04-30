import { useState, useEffect } from 'react';

/**
 * Custom hook to calculate and update elapsed time since a given start time.
 * @param startTime The start time as a timestamp (milliseconds since epoch) or null/undefined if not started.
 * @returns The elapsed time in seconds.
 */
export const useElapsedTime = (startTime: number | null | undefined): number => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (startTime) {
      // Update immediately on start
      const calculateAndUpdate = () => {
        const now = Date.now();
        setElapsedTime(Math.max(0, Math.round((now - startTime) / 1000)));
      };

      calculateAndUpdate(); // Initial calculation

      // Update every second to refresh the display
      interval = setInterval(calculateAndUpdate, 1000);
    } else {
      // Reset if startTime becomes null (e.g., workout ends)
      setElapsedTime(0);
    }

    // Cleanup interval on component unmount or when startTime changes
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startTime]); // Rerun effect if startTime changes

  return elapsedTime;
}; 