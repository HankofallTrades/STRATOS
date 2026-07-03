-- New global movements. archetype name '' means NULL (mobility/stability).
WITH new_exercises(name, archetype, category, is_static, default_equipment, equipment) AS (
  VALUES
  -- Bend
  ('Hip Thrust',              'Bend',            'weights',       false, 'Barbell',    ARRAY['Barbell','Bodyweight','Dumbbell']),
  ('Good Morning',            'Bend',            'weights',       false, 'Barbell',    ARRAY['Barbell']),
  ('Kettlebell Swing',        'Bend',            'weights',       false, 'Kettlebell', ARRAY['Kettlebell']),
  ('Nordic Curl',             'Bend',            'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Leg Curl',                'Isolation',       'weights',       false, 'Machine',    ARRAY['Machine','Swiss Ball']),
  -- Lunge
  ('Step-Up',                 'Lunge',           'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight','Dumbbell','Barbell']),
  -- Push_Vertical
  ('Pike Push-up',            'Push_Vertical',   'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Pull_Horizontal
  ('Inverted Row',            'Pull_Horizontal', 'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight','Pull-up Bar','Barbell']),
  -- Twist
  ('Bicycle Crunch',          'Twist',           'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Gait
  ('Farmer''s Carry',         'Gait',            'weights',       false, 'Dumbbell',   ARRAY['Dumbbell','Kettlebell']),
  ('Sled Push',               'Gait',            'weights',       false, 'Machine',    ARRAY['Machine']),
  ('Bear Crawl',              'Gait',            'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Mobility (archetype NULL)
  ('Downward Dog',            '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Cat-Cow',                 '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Child''s Pose',           '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Cobra',                   '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Pigeon Pose',             '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Couch Stretch',           '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Hamstring Stretch',       '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Hip Flexor Stretch',      '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('World''s Greatest Stretch','',               'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Deep Squat Hold',         '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Thoracic Rotation',       '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Shoulder Dislocates',     '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('90/90 Hip Switch',        '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Stability (archetype NULL)
  ('Plank',                   '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Side Plank',              '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Bird Dog',                '',                'stability',     false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Dead Bug',                '',                'stability',     false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Pallof Press',            '',                'stability',     false, 'Cable',      ARRAY['Cable']),
  ('Copenhagen Plank',        '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Single-Leg Balance',      '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Wall Sit',                '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight'])
)
INSERT INTO public.exercises
  (name, archetype_id, exercise_category, exercise_type, is_static,
   default_equipment_type, compatible_equipment, created_by_user_id)
SELECT
  ne.name,
  CASE WHEN ne.archetype = '' THEN NULL
       ELSE (SELECT id FROM public.movement_archetypes a WHERE a.name = ne.archetype) END,
  ne.category,
  'strength',
  ne.is_static,
  ne.default_equipment,
  ne.equipment,
  NULL
FROM new_exercises ne
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e
  WHERE e.name = ne.name AND e.created_by_user_id IS NULL
);

-- Standard variation for each non-cardio global row that has none
-- (cardio rows intentionally have no variations)
INSERT INTO public.exercise_variations (exercise_id, variation_name)
SELECT e.id, 'Standard'
FROM public.exercises e
WHERE e.created_by_user_id IS NULL
  AND e.exercise_type <> 'cardio'
  AND NOT EXISTS (
    SELECT 1 FROM public.exercise_variations v WHERE v.exercise_id = e.id
  );

-- Muscle mappings for the new movements
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Hip Thrust',               'Glutes',            'primary'),
  ('Hip Thrust',               'Hamstrings',        'secondary'),
  ('Good Morning',             'Hamstrings',        'primary'),
  ('Good Morning',             'Glutes',            'primary'),
  ('Good Morning',             'Erector Spinae',    'secondary'),
  ('Kettlebell Swing',         'Glutes',            'primary'),
  ('Kettlebell Swing',         'Hamstrings',        'primary'),
  ('Kettlebell Swing',         'Erector Spinae',    'secondary'),
  ('Kettlebell Swing',         'Grip/Forearms',     'secondary'),
  ('Kettlebell Swing',         'Core',              'stabilizer'),
  ('Nordic Curl',              'Hamstrings',        'primary'),
  ('Nordic Curl',              'Glutes',            'stabilizer'),
  ('Leg Curl',                 'Hamstrings',        'primary'),
  ('Step-Up',                  'Quadriceps',        'primary'),
  ('Step-Up',                  'Glutes',            'primary'),
  ('Step-Up',                  'Core',              'stabilizer'),
  ('Pike Push-up',             'Anterior Deltoid',  'primary'),
  ('Pike Push-up',             'Triceps Brachii',   'secondary'),
  ('Pike Push-up',             'Upper Trapezius',   'secondary'),
  ('Inverted Row',             'Latissimus Dorsi',  'primary'),
  ('Inverted Row',             'Rhomboids',         'primary'),
  ('Inverted Row',             'Middle Trapezius',  'primary'),
  ('Inverted Row',             'Biceps Brachii',    'secondary'),
  ('Inverted Row',             'Posterior Deltoid', 'secondary'),
  ('Bicycle Crunch',           'Obliques',          'primary'),
  ('Bicycle Crunch',           'Rectus Abdominis',  'primary'),
  ('Bicycle Crunch',           'Hip Flexors',       'secondary'),
  ('Farmer''s Carry',          'Grip/Forearms',     'primary'),
  ('Farmer''s Carry',          'Upper Trapezius',   'secondary'),
  ('Farmer''s Carry',          'Core',              'stabilizer'),
  ('Sled Push',                'Quadriceps',        'primary'),
  ('Sled Push',                'Glutes',            'primary'),
  ('Sled Push',                'Calves',            'secondary'),
  ('Bear Crawl',               'Core',              'primary'),
  ('Bear Crawl',               'Anterior Deltoid',  'secondary'),
  ('Bear Crawl',               'Quadriceps',        'secondary'),
  ('Bear Crawl',               'Hip Flexors',       'secondary'),
  ('Downward Dog',             'Hamstrings',        'primary'),
  ('Downward Dog',             'Calves',            'primary'),
  ('Cat-Cow',                  'Erector Spinae',    'primary'),
  ('Child''s Pose',            'Latissimus Dorsi',  'primary'),
  ('Child''s Pose',            'Erector Spinae',    'primary'),
  ('Cobra',                    'Rectus Abdominis',  'primary'),
  ('Cobra',                    'Hip Flexors',       'primary'),
  ('Pigeon Pose',              'Glutes',            'primary'),
  ('Pigeon Pose',              'Hip Rotators',      'primary'),
  ('Couch Stretch',            'Hip Flexors',       'primary'),
  ('Couch Stretch',            'Quadriceps',        'primary'),
  ('Hamstring Stretch',        'Hamstrings',        'primary'),
  ('Hip Flexor Stretch',       'Hip Flexors',       'primary'),
  ('World''s Greatest Stretch','Hip Flexors',       'primary'),
  ('World''s Greatest Stretch','Hamstrings',        'primary'),
  ('World''s Greatest Stretch','Erector Spinae',    'secondary'),
  ('Deep Squat Hold',          'Adductors',         'primary'),
  ('Deep Squat Hold',          'Hip Flexors',       'primary'),
  ('Thoracic Rotation',        'Erector Spinae',    'primary'),
  ('Thoracic Rotation',        'Obliques',          'secondary'),
  ('Shoulder Dislocates',      'Rotator Cuff',      'primary'),
  ('Shoulder Dislocates',      'Anterior Deltoid',  'secondary'),
  ('90/90 Hip Switch',         'Hip Rotators',      'primary'),
  ('90/90 Hip Switch',         'Glutes',            'secondary'),
  ('Plank',                    'Core',              'primary'),
  ('Plank',                    'Serratus Anterior', 'secondary'),
  ('Side Plank',               'Obliques',          'primary'),
  ('Side Plank',               'Core',              'secondary'),
  ('Bird Dog',                 'Core',              'primary'),
  ('Bird Dog',                 'Glutes',            'secondary'),
  ('Bird Dog',                 'Erector Spinae',    'secondary'),
  ('Dead Bug',                 'Core',              'primary'),
  ('Dead Bug',                 'Transverse Abdominis', 'primary'),
  ('Dead Bug',                 'Hip Flexors',       'secondary'),
  ('Pallof Press',             'Core',              'primary'),
  ('Pallof Press',             'Obliques',          'primary'),
  ('Copenhagen Plank',         'Adductors',         'primary'),
  ('Copenhagen Plank',         'Obliques',          'secondary'),
  ('Single-Leg Balance',       'Glutes',            'primary'),
  ('Single-Leg Balance',       'Calves',            'secondary'),
  ('Wall Sit',                 'Quadriceps',        'primary'),
  ('Wall Sit',                 'Glutes',            'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name AND e.created_by_user_id IS NULL
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);
