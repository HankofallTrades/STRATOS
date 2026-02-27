-- Fix cardio duration to use time_seconds instead of duration_seconds
-- This aligns with the existing chk_reps_or_time constraint

-- 1. Drop the view first
DROP VIEW IF EXISTS exercise_sets_readable;

-- 2. Drop the duration_seconds column since we'll use time_seconds for cardio duration
ALTER TABLE exercise_sets DROP COLUMN IF EXISTS duration_seconds;

-- 3. Drop the index that was created for duration_seconds
DROP INDEX IF EXISTS idx_exercise_sets_duration;

-- 4. Create index for time_seconds when used for cardio (where reps is null)
CREATE INDEX idx_exercise_sets_cardio_time ON exercise_sets(time_seconds) 
WHERE time_seconds IS NOT NULL AND reps IS NULL;

-- 5. Recreate the view without duration_seconds
CREATE OR REPLACE VIEW exercise_sets_readable AS
SELECT 
    es.*,
    e.name as exercise_name,
    e.exercise_type,
    p.username
FROM exercise_sets es
JOIN workout_exercises we ON es.workout_exercise_id = we.id
JOIN exercises e ON we.exercise_id = e.id
JOIN workouts w ON we.workout_id = w.id
JOIN profiles p ON w.user_id = p.id;

-- 6. Grant necessary permissions
GRANT SELECT ON exercise_sets_readable TO authenticated;;
