-- Exercise category for organizational filtering (doesn't change set structure)
ALTER TABLE exercises ADD COLUMN exercise_category text
  CHECK (exercise_category IN ('weights', 'calisthenics', 'cardio', 'mobility', 'stability'));

-- Backfill existing exercises
UPDATE exercises SET exercise_category = 'cardio' WHERE exercise_type = 'cardio';
UPDATE exercises SET exercise_category = 'weights' WHERE exercise_type IS NULL OR exercise_type = 'strength';

-- Warmup duration at the workout level
ALTER TABLE workouts ADD COLUMN warmup_seconds integer;
