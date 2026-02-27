DROP FUNCTION IF EXISTS get_exercise_max_e1rm_history(UUID, UUID);

CREATE FUNCTION get_exercise_max_e1rm_history(p_user_id UUID, p_exercise_id UUID)
RETURNS TABLE(workout_date DATE, variation TEXT, equipment_type TEXT, max_e1rm NUMERIC)
LANGUAGE sql
AS $$
WITH DailyMaxCalculations AS (
    SELECT
        DATE(w.created_at) AS workout_date,
        COALESCE(es.variation, 'Default') AS variation,
        COALESCE(es.equipment_type, e.default_equipment_type, 'Default') AS equipment_type,
        es.weight * (1 + es.reps / 30.0) AS calculated_e1rm
    FROM
        public.exercise_sets es
    JOIN
        public.workout_exercises we ON es.workout_exercise_id = we.id
    JOIN
        public.workouts w ON we.workout_id = w.id
    JOIN
        public.exercises e ON we.exercise_id = e.id
    WHERE
        w.user_id = p_user_id
        AND we.exercise_id = p_exercise_id
        AND es.completed = true
        AND es.weight > 0
        AND es.reps > 0
)
SELECT
    dmc.workout_date,
    dmc.variation,
    dmc.equipment_type,
    MAX(dmc.calculated_e1rm) AS max_e1rm
FROM DailyMaxCalculations dmc
GROUP BY
    dmc.workout_date,
    dmc.variation,
    dmc.equipment_type
ORDER BY
    dmc.workout_date ASC;
$$;;
