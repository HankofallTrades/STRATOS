
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
SELECT
    e.id AS exercise_id,
    amm.muscle_id -- Corrected column name
FROM
    public.exercises e
JOIN
    public.movement_archetypes ma ON e.archetype_id = ma.id
JOIN
    public.archetype_muscle_map amm ON e.archetype_id = amm.archetype_id
WHERE
    ma.name <> 'Isolation' AND e.archetype_id IS NOT NULL
ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
;
