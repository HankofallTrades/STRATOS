
CREATE OR REPLACE FUNCTION get_exercise_muscle_group_map()
RETURNS json
LANGUAGE sql
AS $$
  SELECT 
    json_object_agg(
      exercise_id, 
      muscle_names
    )
  FROM (
    SELECT
      emg.exercise_id,
      array_agg(md.name ORDER BY md.name) as muscle_names
    FROM public.exercise_muscle_groups emg
    JOIN public.muscle_definitions md ON emg.muscle_definition_id = md.id
    GROUP BY emg.exercise_id
  ) AS subquery;
$$;
;
