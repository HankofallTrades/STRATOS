-- Migration: Remove Unnecessary Columns from exercise_sets Table
-- This migration removes overly complex and redundant columns that were added during cardio implementation

-- Drop all dependent views first
DROP VIEW IF EXISTS exercise_sets_with_total_time CASCADE;
DROP VIEW IF EXISTS exercise_sets_readable CASCADE;

-- Drop the associated indexes that are no longer needed
DROP INDEX IF EXISTS idx_exercise_sets_target_zone;

-- Remove redundant time columns (we already have time_seconds which is sufficient)
ALTER TABLE exercise_sets 
DROP COLUMN IF EXISTS time_hours CASCADE,
DROP COLUMN IF EXISTS time_minutes CASCADE,
DROP COLUMN IF EXISTS time_seconds_only CASCADE;

-- Remove overly complex cardio tracking columns that aren't core functionality
ALTER TABLE exercise_sets 
DROP COLUMN IF EXISTS pace_min_per_km CASCADE,        -- Can be calculated from distance/time
DROP COLUMN IF EXISTS heart_rate_bpm CASCADE,         -- Overly complex array, not core
DROP COLUMN IF EXISTS target_heart_rate_zone CASCADE, -- Not core functionality
DROP COLUMN IF EXISTS perceived_exertion CASCADE,     -- Not core functionality  
DROP COLUMN IF EXISTS calories_burned CASCADE;        -- Can be calculated, not core data

-- Recreate the exercise_sets_readable view with the simplified structure
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

-- Grant necessary permissions
GRANT SELECT ON exercise_sets_readable TO authenticated;;
