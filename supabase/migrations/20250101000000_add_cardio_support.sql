-- Migration: Add Cardio Exercise Support
-- This migration adds support for cardio exercises by extending existing tables

-- 1. Add exercise_type column to exercises table
ALTER TABLE exercises 
ADD COLUMN exercise_type TEXT DEFAULT 'strength' CHECK (exercise_type IN ('strength', 'cardio'));

-- 2. Extend exercise_sets table to support cardio fields
ALTER TABLE exercise_sets 
ADD COLUMN duration_seconds INTEGER, -- For cardio: duration in seconds
ADD COLUMN distance_km DECIMAL(8,3), -- Distance in kilometers
ADD COLUMN pace_min_per_km DECIMAL(6,3), -- Pace in minutes per kilometer
ADD COLUMN heart_rate_bpm INTEGER[], -- Array of heart rate readings
ADD COLUMN target_heart_rate_zone INTEGER CHECK (target_heart_rate_zone BETWEEN 1 AND 5),
ADD COLUMN perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10), -- RPE scale 1-10
ADD COLUMN calories_burned INTEGER;

-- 3. Add indexes for cardio fields
CREATE INDEX idx_exercise_sets_duration ON exercise_sets(duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX idx_exercise_sets_distance ON exercise_sets(distance_km) WHERE distance_km IS NOT NULL;
CREATE INDEX idx_exercise_sets_target_zone ON exercise_sets(target_heart_rate_zone) WHERE target_heart_rate_zone IS NOT NULL;

-- 4. Update workouts table to support session focus and workout type
ALTER TABLE workouts 
ADD COLUMN session_focus TEXT CHECK (session_focus IN ('strength', 'hypertrophy', 'zone2', 'zone5', 'speed', 'recovery', 'mixed')),
ADD COLUMN notes TEXT;

-- Update the type column to support cardio and mixed workouts
ALTER TABLE workouts 
DROP CONSTRAINT IF EXISTS workouts_type_check,
ADD CONSTRAINT workouts_type_check CHECK (type IN ('strength', 'cardio', 'mixed'));

-- 5. Create some sample cardio exercises
INSERT INTO exercises (name, exercise_type, default_equipment_type, is_static) VALUES
('Running', 'cardio', 'Bodyweight', false),
('Cycling', 'cardio', 'Machine', false),
('Rowing', 'cardio', 'Machine', false),
('Swimming', 'cardio', 'Bodyweight', false),
('Walking', 'cardio', 'Bodyweight', false),
('Elliptical', 'cardio', 'Machine', false),
('Stair Climber', 'cardio', 'Machine', false),
('Jump Rope', 'cardio', 'Bodyweight', false),
('Treadmill', 'cardio', 'Machine', false),
('Stationary Bike', 'cardio', 'Machine', false)
ON CONFLICT (name) DO NOTHING;

-- 6. Update the exercise_sets_readable view to include cardio fields
DROP VIEW IF EXISTS exercise_sets_readable;
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

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON exercise_sets TO authenticated;
GRANT SELECT ON exercise_sets_readable TO authenticated; 