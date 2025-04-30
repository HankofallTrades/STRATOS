-- Function to get the latest maximum reps recorded for specific exercises by a user
CREATE OR REPLACE FUNCTION get_latest_max_reps_for_exercises(
    p_user_id uuid,
    p_exercise_ids uuid[]
)
RETURNS TABLE(
    exercise_id uuid,
    max_reps integer
)
LANGUAGE sql
STABLE -- Indicates the function cannot modify the database and always returns the same results for the same arguments within a single transaction.
AS $$
SELECT
    we.exercise_id,
    MAX(es.reps) AS max_reps
FROM
    public.exercise_sets es
JOIN
    public.workout_exercises we ON es.workout_exercise_id = we.id
JOIN
    public.workouts w ON we.workout_id = w.id
WHERE
    w.user_id = p_user_id           -- Filter by the specified user
    AND we.exercise_id = ANY(p_exercise_ids) -- Filter for exercises in the provided list
    AND es.completed = true         -- Only consider completed sets
    AND es.reps > 0                 -- Ensure reps are positive
GROUP BY
    we.exercise_id;                 -- Group by exercise to find the max reps for each
$$;

-- Optional: Grant execute permission to authenticated users
-- Make sure to run this if you want your frontend application users to be able to call this function.
-- GRANT EXECUTE ON FUNCTION get_latest_max_reps_for_exercises(uuid, uuid[]) TO authenticated; 