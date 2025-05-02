-- Function to get overall performance stats for a user
CREATE OR REPLACE FUNCTION get_user_performance_stats(p_user_id uuid)
RETURNS TABLE (
    total_workouts bigint,
    total_duration_seconds bigint,
    most_common_exercise_id uuid
    -- Consider adding most_common_exercise_name text here later
)
LANGUAGE sql
STABLE -- Indicates the function doesn't modify the database
AS $$
WITH UserWorkouts AS (
    -- Select relevant workouts for the user
    SELECT
        id,
        COALESCE(duration_seconds, 0) as duration_seconds -- Use COALESCE for null durations
    FROM public.workouts
    WHERE user_id = p_user_id
      AND completed = true -- Only count completed workouts
      AND is_single_log = false
),
WorkoutCounts AS (
    -- Calculate total workouts and total duration
    SELECT
        COUNT(*) AS total_workouts,
        SUM(duration_seconds) AS total_duration_seconds
    FROM UserWorkouts
),
ExerciseCounts AS (
    -- Count occurrences of each exercise across all completed sets in the user's workouts
    SELECT
        we.exercise_id,
        COUNT(*) AS exercise_count
    FROM public.exercise_sets es
    JOIN public.workout_exercises we ON es.workout_exercise_id = we.id
    JOIN UserWorkouts uw ON we.workout_id = uw.id -- Join with pre-filtered workouts
    WHERE es.completed = true -- Count based on completed sets
    GROUP BY we.exercise_id
),
MostCommonExercise AS (
    -- Find the exercise_id with the highest count
    SELECT exercise_id
    FROM ExerciseCounts
    ORDER BY exercise_count DESC, exercise_id -- Add secondary sort for deterministic result if counts are equal
    LIMIT 1
)
-- Combine all the stats
SELECT
    wc.total_workouts,
    wc.total_duration_seconds,
    mce.exercise_id AS most_common_exercise_id
FROM WorkoutCounts wc, MostCommonExercise mce;

-- If there are no workouts, WorkoutCounts will have one row with 0s,
-- and MostCommonExercise will be empty. The cross join results in no rows.
-- We need to ensure we always return a row, even with nulls/zeros.

-- Revised final SELECT to handle zero workouts case
SELECT
    COALESCE(wc.total_workouts, 0) as total_workouts,
    COALESCE(wc.total_duration_seconds, 0) as total_duration_seconds,
    mce.exercise_id AS most_common_exercise_id
FROM
    (SELECT COUNT(*) AS total_workouts, SUM(COALESCE(duration_seconds, 0)) AS total_duration_seconds 
     FROM public.workouts 
     WHERE user_id = p_user_id 
       AND completed = true 
       AND is_single_log = false
    ) wc -- Calculate totals directly
LEFT JOIN
    (SELECT we.exercise_id
     FROM public.exercise_sets es
     JOIN public.workout_exercises we ON es.workout_exercise_id = we.id
     JOIN public.workouts w ON we.workout_id = w.id -- Join workouts directly here
     WHERE w.user_id = p_user_id 
       AND w.completed = true 
       AND w.is_single_log = false
       AND es.completed = true
     GROUP BY we.exercise_id
     ORDER BY COUNT(*) DESC, we.exercise_id
     LIMIT 1
    ) mce ON true; -- Left join ensures the row from wc is always returned
$$;

-- Optional: Grant execute permission
-- GRANT EXECUTE ON FUNCTION get_user_performance_stats(uuid) TO authenticated;
