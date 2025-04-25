/**
 * Calculates the estimated 1 Rep Max (e1RM) using the Brzycki formula.
 * 
 * Formula: weight / (1.0278 - 0.0278 * reps)
 * 
 * @param weight - The weight lifted.
 * @param reps - The number of repetitions performed.
 * @returns The estimated 1 Rep Max, or 0 if reps are less than 1 or weight is 0 or less.
 */
export const calculateE1RM = (weight: number, reps: number): number => {
  if (reps < 1 || weight <= 0) {
    return 0; // Cannot calculate e1RM for 0 or negative weight/reps, or reps < 1
  }
  // Avoid division by zero or near-zero for high reps where the formula breaks down
  if (reps >= 37) { 
    // The denominator approaches 0 around 37 reps. 
    // Return weight itself or handle as per specific app logic for very high reps.
    // For simplicity, returning weight might be acceptable, or consider capping e1RM.
    // Here, we return the weight lifted as a fallback for extremely high reps.
    return weight; 
  }
  
  const e1rm = weight / (1.0278 - 0.0278 * reps);
  
  // Return the calculated e1RM, perhaps rounded
  return Math.round(e1rm * 10) / 10; // Round to one decimal place
}; 