-- Function to get max e1RM per day for a specific exercise and user (Corrected)
CREATE OR REPLACE FUNCTION get_exercise_max_e1rm_history(
    p_user_id uuid,
    p_exercise_id uuid
)
RETURNS TABLE(
    workout_date date,
    variation text,
    equipment_type text,
    max_e1rm float
)
LANGUAGE sql
AS $$
SELECT
    DATE(w.date) AS workout_date,
    COALESCE(es.variation, 'Default') AS variation,
    -- Corrected COALESCE: Use set equipment, then exercise default, then 'Default'
    COALESCE(es.equipment_type, e.default_equipment_type, 'Default') AS equipment_type,
    MAX(es.weight * (1 + es.reps / 30.0)) AS max_e1rm -- Calculate e1RM and find max
FROM
    public.exercise_sets es
JOIN
    public.workout_exercises we ON es.workout_exercise_id = we.id
JOIN
    public.workouts w ON we.workout_id = w.id
JOIN
    public.exercises e ON we.exercise_id = e.id -- Join exercises to get default equipment
WHERE
    w.user_id = p_user_id       -- Filter by user
    AND we.exercise_id = p_exercise_id -- Filter by exercise
    AND es.completed = true     -- Only completed sets
    AND es.weight > 0           -- Valid weight
    AND es.reps > 0             -- Valid reps
GROUP BY
    DATE(w.date),             -- Group by day
    COALESCE(es.variation, 'Default'),
    -- Corrected GROUP BY for equipment type
    COALESCE(es.equipment_type, e.default_equipment_type, 'Default')
ORDER BY
    workout_date ASC;
$$;

-- Optional: Grant execute permission if needed
-- GRANT EXECUTE ON FUNCTION get_exercise_max_e1rm_history(uuid, uuid) TO authenticated;