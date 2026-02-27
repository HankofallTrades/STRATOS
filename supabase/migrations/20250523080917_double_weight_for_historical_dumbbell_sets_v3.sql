-- MIGRATION SCRIPT: Double weight for historical completed dumbbell sets (v3 - corrected table for equipment_type)
--
-- Purpose:
-- This script updates the 'weight' in the 'exercise_sets' table.
-- It doubles the weight for sets that were:
-- 1. Marked as 'completed'.
-- 2. Where the 'equipment_type' on the 'exercise_sets' table itself was 'Dumbbell'.
--
-- Assumptions:
-- - Users previously logged the weight of a SINGLE dumbbell for dumbbell exercises.
-- - The 'public.exercise_sets' table has 'weight', 'completed', 'workout_exercise_id', AND 'equipment_type' columns.
--
-- !! IMPORTANT !!
-- 1. BACKUP YOUR DATABASE before running this script.
-- 2. VERIFY the exact string value for dumbbell equipment (assumed 'Dumbbell').
-- 3. This script is intended to be RUN ONLY ONCE.

BEGIN;

-- Perform the update.
-- Adjust the value 'Dumbbell' if your schema uses a different string.
UPDATE
    public.exercise_sets
SET
    weight = weight * 2
WHERE
    completed = TRUE
    AND equipment_type = 'Dumbbell' -- VERIFY THIS VALUE
    AND weight IS NOT NULL;

-- It's good practice to log this migration execution manually if you have a migrations tracking table.
-- For example:
-- INSERT INTO public.schema_migrations (version, description, executed_at)
-- VALUES ('YYYYMMDDHHMMSS_double_dumbbell_weights_v3', 'Doubled weight for historical dumbbell sets (v3) based on exercise_sets.equipment_type.', NOW());

COMMIT;
;
