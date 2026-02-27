-- Migration: Separate time into hours, minutes, seconds for better UX
-- This replaces the single time_seconds field with separate fields

-- 1. Add new time fields
ALTER TABLE exercise_sets 
ADD COLUMN time_hours INTEGER DEFAULT 0 CHECK (time_hours >= 0),
ADD COLUMN time_minutes INTEGER DEFAULT 0 CHECK (time_minutes >= 0 AND time_minutes < 60),
ADD COLUMN time_seconds_only INTEGER DEFAULT 0 CHECK (time_seconds_only >= 0 AND time_seconds_only < 60);

-- 2. Migrate existing time_seconds data to new fields
UPDATE exercise_sets 
SET 
  time_hours = FLOOR(time_seconds / 3600),
  time_minutes = FLOOR((time_seconds % 3600) / 60),
  time_seconds_only = time_seconds % 60
WHERE time_seconds IS NOT NULL;

-- 3. Create a computed column view for total seconds (for calculations)
CREATE OR REPLACE VIEW exercise_sets_with_total_time AS
SELECT 
  *,
  (COALESCE(time_hours, 0) * 3600 + COALESCE(time_minutes, 0) * 60 + COALESCE(time_seconds_only, 0)) AS total_time_seconds
FROM exercise_sets;

-- 4. Create indexes for the new time fields
CREATE INDEX idx_exercise_sets_time_hours ON exercise_sets(time_hours) WHERE time_hours > 0;
CREATE INDEX idx_exercise_sets_time_minutes ON exercise_sets(time_minutes) WHERE time_minutes > 0;

-- 5. Grant permissions on the new view
GRANT SELECT ON exercise_sets_with_total_time TO authenticated;;
