-- Migration: Add function to get weekly zone 2 cardio minutes
-- This function calculates the total minutes of zone 2 cardio for the current week

CREATE OR REPLACE FUNCTION get_weekly_zone2_cardio_minutes(user_id UUID, start_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    SUM(ROUND(es.time_seconds::NUMERIC / 60)), 
    0
  )::INTEGER
  FROM exercise_sets es
  JOIN workout_exercises we ON es.workout_exercise_id = we.id
  JOIN workouts w ON we.workout_id = w.id
  JOIN exercises e ON we.exercise_id = e.id
  WHERE w.user_id = $1
    AND w.session_focus = 'zone2'
    AND es.completed = true
    AND w.created_at >= $2
    AND es.time_seconds IS NOT NULL
    AND e.exercise_type = 'cardio';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_weekly_zone2_cardio_minutes TO authenticated;;
