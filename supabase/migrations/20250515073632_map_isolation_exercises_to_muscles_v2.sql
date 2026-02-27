
DO $$
DECLARE
    exer_rec RECORD;
    -- Muscle definition IDs
    biceps_brachii_id UUID;
    triceps_brachii_id UUID;
    quadriceps_id UUID;
    hamstrings_id UUID;
    calves_id UUID;
    anterior_deltoid_id UUID;
    -- lateral_deltoid_id UUID; -- Not present in current list, but good for future
    posterior_deltoid_id UUID;
    pectoralis_major_id UUID;
    upper_trapezius_id UUID;
    -- Add more as needed: e.g., glutes_id for hip thrusts if isolated, specific core muscles.

BEGIN
    -- Fetch IDs for commonly isolated muscles to reduce DB lookups in loop
    SELECT id INTO biceps_brachii_id FROM public.muscle_definitions WHERE name = 'Biceps Brachii';
    SELECT id INTO triceps_brachii_id FROM public.muscle_definitions WHERE name = 'Triceps Brachii';
    SELECT id INTO quadriceps_id FROM public.muscle_definitions WHERE name = 'Quadriceps';
    SELECT id INTO hamstrings_id FROM public.muscle_definitions WHERE name = 'Hamstrings';
    SELECT id INTO calves_id FROM public.muscle_definitions WHERE name = 'Calves';
    SELECT id INTO anterior_deltoid_id FROM public.muscle_definitions WHERE name = 'Anterior Deltoid';
    SELECT id INTO posterior_deltoid_id FROM public.muscle_definitions WHERE name = 'Posterior Deltoid';
    SELECT id INTO pectoralis_major_id FROM public.muscle_definitions WHERE name = 'Pectoralis Major';
    SELECT id INTO upper_trapezius_id FROM public.muscle_definitions WHERE name = 'Upper Trapezius';

    FOR exer_rec IN
        SELECT e.id as exercise_id, e.name as exercise_name
        FROM public.exercises e
        JOIN public.movement_archetypes ma ON e.archetype_id = ma.id
        WHERE ma.name = 'Isolation'
    LOOP
        -- Biceps Brachii
        IF biceps_brachii_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Bicep Curl%' OR exer_rec.exercise_name ILIKE '%Biceps Curl%' OR (exer_rec.exercise_name ILIKE '%Curl%' AND exer_rec.exercise_name NOT ILIKE '%Leg Curl%' AND exer_rec.exercise_name NOT ILIKE '%Hamstring Curl%')) THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, biceps_brachii_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Triceps Brachii
        IF triceps_brachii_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Tricep Extension%' OR exer_rec.exercise_name ILIKE '%Triceps Extension%' OR exer_rec.exercise_name ILIKE '%Skullcrusher%' OR exer_rec.exercise_name ILIKE '%Rope Pushdown%' OR exer_rec.exercise_name ILIKE '%Kickback%') THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, triceps_brachii_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Quadriceps
        IF quadriceps_id IS NOT NULL AND exer_rec.exercise_name ILIKE '%Leg Extension%' THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, quadriceps_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Hamstrings
        IF hamstrings_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Leg Curl%' OR exer_rec.exercise_name ILIKE '%Hamstring Curl%') THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, hamstrings_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Calves
        IF calves_id IS NOT NULL AND exer_rec.exercise_name ILIKE '%Calf Raise%' THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, calves_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;
        
        -- Pectoralis Major (for Flyes, Cable Crossovers if isolated)
        IF pectoralis_major_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Fly%' OR exer_rec.exercise_name ILIKE '%Pec Deck%' OR exer_rec.exercise_name ILIKE '%Cable Crossover%') AND exer_rec.exercise_name NOT ILIKE '%Reverse Fly%' THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, pectoralis_major_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Posterior Deltoid (Reverse Flyes, Face Pulls if categorized as isolation)
        IF posterior_deltoid_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Reverse Fly%' OR exer_rec.exercise_name ILIKE '%Face Pull%' OR exer_rec.exercise_name ILIKE '%Rear Delt%') THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, posterior_deltoid_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

        -- Anterior Deltoid (Front Raises)
        IF anterior_deltoid_id IS NOT NULL AND exer_rec.exercise_name ILIKE '%Front Raise%' THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, anterior_deltoid_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;
        
        -- Upper Trapezius
        IF upper_trapezius_id IS NOT NULL AND (exer_rec.exercise_name ILIKE '%Trap Raise%' OR exer_rec.exercise_name ILIKE '%Shrug%') THEN
            INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id)
            VALUES (exer_rec.exercise_id, upper_trapezius_id) ON CONFLICT (exercise_id, muscle_definition_id) DO NOTHING;
        END IF;

    END LOOP;
END $$;
;
