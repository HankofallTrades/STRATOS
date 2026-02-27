
DO $$
DECLARE
    squat_id UUID;
    lunge_id UUID;
    push_v_id UUID;
    push_h_id UUID;
    pull_v_id UUID;
    pull_h_id UUID;
    bend_id UUID;
    twist_id UUID;
    gait_id UUID;
    isolation_id UUID;
BEGIN
    SELECT id INTO squat_id FROM public.movement_archetypes WHERE name = 'Squat';
    SELECT id INTO lunge_id FROM public.movement_archetypes WHERE name = 'Lunge';
    SELECT id INTO push_v_id FROM public.movement_archetypes WHERE name = 'Push (Vertical)';
    SELECT id INTO push_h_id FROM public.movement_archetypes WHERE name = 'Push (Horizontal)';
    SELECT id INTO pull_v_id FROM public.movement_archetypes WHERE name = 'Pull (Vertical)';
    SELECT id INTO pull_h_id FROM public.movement_archetypes WHERE name = 'Pull (Horizontal)';
    SELECT id INTO bend_id FROM public.movement_archetypes WHERE name = 'Bend';
    SELECT id INTO twist_id FROM public.movement_archetypes WHERE name = 'Twist';
    SELECT id INTO gait_id FROM public.movement_archetypes WHERE name = 'Gait';
    SELECT id INTO isolation_id FROM public.movement_archetypes WHERE name = 'Isolation';

    -- More specific matches first
    UPDATE public.exercises SET archetype_id = push_v_id WHERE name ILIKE '%Overhead Press%' OR name ILIKE '%OHP%' AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = push_h_id WHERE name ILIKE '%Bench Press%' OR name ILIKE '%Push Up%' OR name ILIKE '%Chest Press%' AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = pull_v_id WHERE name ILIKE '%Pull Up%' OR name ILIKE '%Chin Up%' OR name ILIKE '%Lat Pulldown%' AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = pull_h_id WHERE name ILIKE '%Row%' OR name ILIKE '%Bent Over Row%' AND archetype_id IS NULL;

    -- General keyword matches
    -- Note: Order can be important here to avoid overly broad terms matching too early.
    UPDATE public.exercises SET archetype_id = squat_id WHERE (name ILIKE '%Squat%' OR name ILIKE '%Leg Press%') AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = lunge_id WHERE name ILIKE '%Lunge%' AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = bend_id WHERE (name ILIKE '%Deadlift%' OR name ILIKE '%Good Morning%' OR name ILIKE '%Hip Hinge%' OR name ILIKE '%Kettlebell Swing%') AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = twist_id WHERE (name ILIKE '%Twist%' OR name ILIKE '%Rotation%' OR name ILIKE '%Chop%' OR name ILIKE '%Hay Baler%') AND archetype_id IS NULL;
    UPDATE public.exercises SET archetype_id = gait_id WHERE (name ILIKE '%Walk%' OR name ILIKE '%Run%' OR name ILIKE '%Sprint%' OR name ILIKE '%Carry%' OR name ILIKE '%March%') AND archetype_id IS NULL;
    
    -- Catch-all for Push/Pull if not caught by specific vertical/horizontal
    UPDATE public.exercises SET archetype_id = push_h_id WHERE name ILIKE '%Push%' AND archetype_id IS NULL; -- Default Push to Horizontal if ambiguous
    UPDATE public.exercises SET archetype_id = pull_h_id WHERE name ILIKE '%Pull%' AND archetype_id IS NULL; -- Default Pull to Horizontal if ambiguous

    -- Isolation: Match common isolation exercise terms. This list will need to be expanded.
    UPDATE public.exercises SET archetype_id = isolation_id WHERE 
        (name ILIKE '%Curl%' OR 
         name ILIKE '%Extension%' OR 
         name ILIKE '%Raise%' OR 
         name ILIKE '%Fly%' OR 
         name ILIKE '%Kickback%' OR
         name ILIKE '%Abduction%' OR
         name ILIKE '%Adduction%' OR
         name ILIKE '%Calf Raise%') AND 
         archetype_id IS NULL;

END $$;
;
