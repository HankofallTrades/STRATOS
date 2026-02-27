
CREATE OR REPLACE FUNCTION public.fetch_weekly_sets_per_muscle_group(p_user_id UUID)
RETURNS TABLE (
    base_archetype_name TEXT,
    archetype_subtype_name TEXT,
    muscle_definition_name TEXT,
    total_sets BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        trim(split_part(ma.name, '(', 1)) AS calculated_base_archetype_name,
        CASE
            WHEN ma.name LIKE '%(%)%' THEN
                trim(regexp_replace(regexp_substr(ma.name, '\\(.*?\\)'), '[()]', '', 'g'))
            ELSE
                NULL
        END AS calculated_archetype_subtype_name,
        md.name AS muscle_name,
        COUNT(es.id) AS sets_count
    FROM
        public.exercise_sets es
    JOIN
        public.workout_exercises we ON es.workout_exercise_id = we.id
    JOIN
        public.workouts w ON we.workout_id = w.id
    JOIN
        public.exercises ex ON we.exercise_id = ex.id
    JOIN -- Changed from LEFT JOIN to JOIN: an exercise must have an archetype to contribute to this volume calculation
        public.movement_archetypes ma ON ex.archetype_id = ma.id
    JOIN -- An exercise must be mapped to specific muscles to be included
        public.exercise_muscle_groups emg ON ex.id = emg.exercise_id
    JOIN
        public.muscle_definitions md ON emg.muscle_definition_id = md.id
    WHERE
        w.user_id = p_user_id
        AND w.completed = TRUE
        AND es.completed = TRUE -- Count only completed sets for volume
        AND w.created_at >= (CURRENT_DATE - INTERVAL '7 days') -- Calculate for the last 7 days
        -- AND ex.archetype_id IS NOT NULL -- This is implicitly handled by the JOIN to movement_archetypes
GROUP BY
    calculated_base_archetype_name,
    calculated_archetype_subtype_name,
    muscle_name;
$$;
;
