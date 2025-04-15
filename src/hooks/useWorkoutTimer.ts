import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { tickWorkoutTime, selectIsWorkoutActive } from '../state/workout/workoutSlice';

/**
 * Custom hook to manage the workout timer.
 * It dispatches the `tickWorkoutTime` action every second when a workout is active.
 */
export const useWorkoutTimer = () => {
  const dispatch = useAppDispatch();
  const isWorkoutActive = useAppSelector(selectIsWorkoutActive);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isWorkoutActive) {
      // Start the timer interval
      interval = setInterval(() => {
        dispatch(tickWorkoutTime());
      }, 1000);
    } else {
      // Clear interval if workout is not active
      if (interval) {
        clearInterval(interval);
      }
    }

    // Cleanup function to clear interval on component unmount or when workout becomes inactive
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorkoutActive, dispatch]);

  // This hook doesn't return the time directly, 
  // as the time is managed in the Redux store (state.workout.workoutTime).
  // Components should select the time from the store using `useAppSelector(selectWorkoutTime)`.
}; 