-- MIGRATION SCRIPT: Double weight for historical completed kettlebell sets (v1)
--
-- Purpose:
-- This script updates the 'weight' in the 'exercise_sets' table.
-- It doubles the weight for sets that were:
-- 1. Marked as 'completed'.
-- 2. Where the 'equipment_type' on the 'exercise_sets' table itself was 'Kettlebell'.
--
-- Assumptions:
-- - Users previously logged the weight of a SINGLE kettlebell for kettlebell exercises where total weight would have been double (e.g. two kettlebells used, or convention was to log half).
-- - The 'public.exercise_sets' table has 'weight', 'completed', AND 'equipment_type' columns.
--
-- !! IMPORTANT !!
-- 1. BACKUP YOUR DATABASE before running this script.
-- 2. VERIFY the exact string value for kettlebell equipment (assumed 'Kettlebell').
-- 3. This script is intended to be RUN ONLY ONCE for records not already doubled.

BEGIN;

-- Perform the update.
-- Adjust the value 'Kettlebell' if your schema uses a different string.
UPDATE
    public.exercise_sets
SET
    weight = weight * 2
WHERE
    completed = TRUE
    AND equipment_type = 'Kettlebell' -- VERIFY THIS VALUE
    AND weight IS NOT NULL;

-- It's good practice to log this migration execution manually if you have a migrations tracking table.
-- For example:
-- INSERT INTO public.schema_migrations (version, description, executed_at)
-- VALUES ('YYYYMMDDHHMMSS_double_kettlebell_weights_v1', 'Doubled weight for historical kettlebell sets (v1) based on exercise_sets.equipment_type.', NOW());

COMMIT;
;
