
DROP FUNCTION IF EXISTS public.fetch_weekly_sets_per_muscle_group(UUID);

CREATE OR REPLACE FUNCTION public.fetch_weekly_sets_per_muscle_group(p_user_id UUID)
RETURNS TABLE(
  base_archetype_name TEXT,
  archetype_subtype_name TEXT,
  muscle_definition_name TEXT,
  total_sets BIGINT
)
LANGUAGE sql
STABLE
AS $$
SELECT
    CASE
        WHEN ma.name LIKE 'Push (%)' THEN 'Push'
        WHEN ma.name LIKE 'Pull (%)' THEN 'Pull'
        ELSE ma.name
    END AS base_archetype_name,
    CASE
        WHEN ma.name = 'Push (Vertical)' THEN 'Vertical'
        WHEN ma.name = 'Push (Horizontal)' THEN 'Horizontal'
        WHEN ma.name = 'Pull (Vertical)' THEN 'Vertical'
        WHEN ma.name = 'Pull (Horizontal)' THEN 'Horizontal'
        ELSE NULL
    END AS archetype_subtype_name,
    md.name AS muscle_definition_name,
    COUNT(*) AS total_sets
FROM public.workouts w
JOIN public.workout_exercises we ON w.id = we.workout_id
JOIN public.exercise_sets es ON we.id = es.workout_exercise_id
JOIN public.exercises ex ON we.exercise_id = ex.id
JOIN public.exercise_muscle_groups emg ON ex.id = emg.exercise_id
JOIN public.muscle_definitions md ON emg.muscle_definition_id = md.id
JOIN public.archetype_muscle_map amm ON md.id = amm.muscle_id
JOIN public.movement_archetypes ma ON amm.archetype_id = ma.id
WHERE
    w.user_id = p_user_id AND
    w.completed = TRUE AND
    es.completed = TRUE AND
    w.created_at >= (now() AT TIME ZONE 'UTC' - interval '7 days') AND
    w.created_at < (now() AT TIME ZONE 'UTC')
GROUP BY
    base_archetype_name,
    archetype_subtype_name,
    md.name;
$$;
;
