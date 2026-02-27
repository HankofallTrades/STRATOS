-- Step 1: Add the new time_seconds column
ALTER TABLE public.exercise_sets
ADD COLUMN time_seconds INTEGER NULL;

COMMENT ON COLUMN public.exercise_sets.time_seconds IS 'Duration of the set in seconds, for static exercises.';

-- Step 2: Modify the reps column to be nullable
ALTER TABLE public.exercise_sets
ALTER COLUMN reps DROP NOT NULL;

-- Step 3: Add a check constraint to ensure either reps or time_seconds is provided
-- and that existing data (where time_seconds will be NULL) is valid.
ALTER TABLE public.exercise_sets
ADD CONSTRAINT chk_reps_or_time CHECK (
  (reps IS NOT NULL AND time_seconds IS NULL) OR -- Existing data and new rep-based sets
  (reps IS NULL AND time_seconds IS NOT NULL)    -- New time-based sets
);
;
