CREATE OR REPLACE FUNCTION fetch_weekly_archetype_sets(p_user_id uuid)
RETURNS TABLE(
    base_archetype_name text,
    archetype_subtype_name text,
    total_sets bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        trim(split_part(ma.name, '(', 1)) AS base_archetype_name,
        CASE
            WHEN ma.name LIKE '%(%)%' THEN
                trim(regexp_replace(regexp_substr(ma.name, '\\(.*?\\)'), '[()]', '', 'g'))
            ELSE
                NULL
        END AS archetype_subtype_name,
        COUNT(DISTINCT es.id) AS total_sets
    FROM
        public.exercise_sets es
    JOIN
        public.workout_exercises we ON es.workout_exercise_id = we.id
    JOIN
        public.workouts w ON we.workout_id = w.id
    JOIN
        public.exercises ex ON we.exercise_id = ex.id
    JOIN
        public.movement_archetypes ma ON ex.archetype_id = ma.id
    WHERE
        w.user_id = p_user_id
        AND w.completed = TRUE
        AND es.completed = TRUE
        AND w.created_at >= (CURRENT_DATE - INTERVAL '7 days')
    GROUP BY
        base_archetype_name,
        archetype_subtype_name;
$$;;
