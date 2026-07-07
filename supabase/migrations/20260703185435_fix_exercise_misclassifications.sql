-- Archetype/type fixes
UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Isolation')
WHERE name = 'Lateral Raise';

UPDATE public.exercises SET exercise_type = 'cardio', archetype_id = NULL, is_static = false
WHERE name = 'Boxing';

UPDATE public.exercises SET exercise_type = 'cardio', archetype_id = NULL
WHERE name = 'Assault bike';

UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Pull_Vertical')
WHERE name IN ('Dead Hang', 'Pulldown');

UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Bend')
WHERE name = 'Superman''s';

-- Replace wrong muscle lists (delete then re-insert with roles)
DELETE FROM public.exercise_muscle_groups
WHERE exercise_id IN (
  SELECT id FROM public.exercises WHERE name IN ('Shoulder Ext. Rotation', 'Pull-up', 'Face Pull')
);

INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Shoulder Ext. Rotation', 'Rotator Cuff',      'primary'),
  ('Pull-up',                'Latissimus Dorsi',  'primary'),
  ('Pull-up',                'Biceps Brachii',    'secondary'),
  ('Pull-up',                'Lower Trapezius',   'secondary'),
  ('Pull-up',                'Teres Major',       'secondary'),
  ('Pull-up',                'Grip/Forearms',     'stabilizer'),
  ('Pull-up',                'Core',              'stabilizer'),
  ('Face Pull',              'Posterior Deltoid', 'primary'),
  ('Face Pull',              'Rotator Cuff',      'secondary'),
  ('Face Pull',              'Middle Trapezius',  'secondary'),
  ('Face Pull',              'Rhomboids',         'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name;

-- Additions for exercises that had no mappings at all
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Lateral Raise', 'Lateral Deltoid',  'primary'),
  ('Dip',           'Pectoralis Major', 'primary'),
  ('Dip',           'Triceps Brachii',  'primary'),
  ('Dip',           'Anterior Deltoid', 'secondary'),
  ('Dead Hang',     'Grip/Forearms',    'primary'),
  ('Dead Hang',     'Latissimus Dorsi', 'stabilizer')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);
