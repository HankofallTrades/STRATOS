-- 1. Promote staples to global (keeps ids and logged history)
UPDATE public.exercises SET created_by_user_id = NULL
WHERE created_by_user_id IS NOT NULL AND name IN (
  'Push-up', 'Lunge', 'Split Squat', 'Overhead Press', 'Lateral Raise',
  'Triceps Extension', 'Calf Raise', 'Glute Bridge', 'Back Extension',
  'Leg Press', 'Leg Extension', 'Russian Twist', 'Wood Chop', 'Pec Fly',
  'Reverse Fly', 'Pulldown', 'Dead Hang'
);

-- 2. Set correct roles on rows that already have muscle mappings
--    (previously archetype-level copies with no primary/secondary signal)
UPDATE public.exercise_muscle_groups emg SET role = v.role
FROM (VALUES
  ('Deadlift',   'Glutes',            'primary'),
  ('Deadlift',   'Hamstrings',        'primary'),
  ('Deadlift',   'Erector Spinae',    'secondary'),
  ('Deadlift',   'Core',              'stabilizer'),
  ('Squat',      'Quadriceps',        'primary'),
  ('Squat',      'Glutes',            'primary'),
  ('Squat',      'Hamstrings',        'secondary'),
  ('Squat',      'Erector Spinae',    'stabilizer'),
  ('Squat',      'Core',              'stabilizer'),
  ('Bench Press','Pectoralis Major',  'primary'),
  ('Bench Press','Triceps Brachii',   'secondary'),
  ('Bench Press','Anterior Deltoid',  'secondary'),
  ('Bench Press','Serratus Anterior', 'stabilizer'),
  ('Bench Press','Core',              'stabilizer'),
  ('Row',        'Latissimus Dorsi',  'primary'),
  ('Row',        'Rhomboids',         'primary'),
  ('Row',        'Middle Trapezius',  'primary'),
  ('Row',        'Biceps Brachii',    'secondary'),
  ('Row',        'Posterior Deltoid', 'secondary'),
  ('Row',        'Core',              'stabilizer'),
  ('Push-up',    'Pectoralis Major',  'primary'),
  ('Push-up',    'Triceps Brachii',   'secondary'),
  ('Push-up',    'Anterior Deltoid',  'secondary'),
  ('Push-up',    'Serratus Anterior', 'stabilizer'),
  ('Push-up',    'Core',              'stabilizer'),
  ('Lunge',      'Quadriceps',        'primary'),
  ('Lunge',      'Glutes',            'primary'),
  ('Lunge',      'Hamstrings',        'secondary'),
  ('Lunge',      'Calves',            'stabilizer'),
  ('Lunge',      'Hip Flexors',       'stabilizer'),
  ('Lunge',      'Core',              'stabilizer'),
  ('Leg Press',  'Quadriceps',        'primary'),
  ('Leg Press',  'Glutes',            'primary'),
  ('Leg Press',  'Hamstrings',        'secondary'),
  ('Leg Press',  'Erector Spinae',    'stabilizer'),
  ('Leg Press',  'Core',              'stabilizer')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE emg.exercise_id = e.id AND emg.muscle_definition_id = m.id;

-- 3. Add missing mappings for global rows that have none (or partial)
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Deadlift',          'Grip/Forearms',     'secondary'),
  ('Bicep Curl',        'Grip/Forearms',     'secondary'),
  ('Split Squat',       'Quadriceps',        'primary'),
  ('Split Squat',       'Glutes',            'primary'),
  ('Split Squat',       'Hamstrings',        'secondary'),
  ('Split Squat',       'Adductors',         'secondary'),
  ('Split Squat',       'Core',              'stabilizer'),
  ('Overhead Press',    'Anterior Deltoid',  'primary'),
  ('Overhead Press',    'Lateral Deltoid',   'secondary'),
  ('Overhead Press',    'Triceps Brachii',   'secondary'),
  ('Overhead Press',    'Upper Trapezius',   'secondary'),
  ('Overhead Press',    'Core',              'stabilizer'),
  ('Triceps Extension', 'Triceps Brachii',   'primary'),
  ('Calf Raise',        'Calves',            'primary'),
  ('Glute Bridge',      'Glutes',            'primary'),
  ('Glute Bridge',      'Hamstrings',        'secondary'),
  ('Glute Bridge',      'Core',              'stabilizer'),
  ('Back Extension',    'Erector Spinae',    'primary'),
  ('Back Extension',    'Glutes',            'secondary'),
  ('Back Extension',    'Hamstrings',        'secondary'),
  ('Russian Twist',     'Obliques',          'primary'),
  ('Russian Twist',     'Rectus Abdominis',  'secondary'),
  ('Russian Twist',     'Hip Flexors',       'secondary'),
  ('Wood Chop',         'Obliques',          'primary'),
  ('Wood Chop',         'Rectus Abdominis',  'secondary'),
  ('Wood Chop',         'Erector Spinae',    'stabilizer'),
  ('Pec Fly',           'Pectoralis Major',  'primary'),
  ('Reverse Fly',       'Posterior Deltoid', 'primary'),
  ('Reverse Fly',       'Rhomboids',         'secondary'),
  ('Reverse Fly',       'Middle Trapezius',  'secondary'),
  ('Pulldown',          'Latissimus Dorsi',  'primary'),
  ('Pulldown',          'Biceps Brachii',    'secondary'),
  ('Pulldown',          'Teres Major',       'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);

-- 4. compatible_equipment for all (now-)global rows
UPDATE public.exercises e SET compatible_equipment = v.equipment
FROM (VALUES
  ('Squat',                  ARRAY['Barbell','Dumbbell','Kettlebell','Bodyweight','Machine']),
  ('Deadlift',               ARRAY['Barbell','Dumbbell','Kettlebell']),
  ('Bench Press',            ARRAY['Barbell','Dumbbell','Machine']),
  ('Row',                    ARRAY['Dumbbell','Barbell','Cable','Machine','Landmine']),
  ('Pull-up',                ARRAY['Pull-up Bar']),
  ('Dip',                    ARRAY['Bodyweight']),
  ('Face Pull',              ARRAY['Cable']),
  ('Bicep Curl',             ARRAY['Dumbbell','Barbell','Cable']),
  ('Shoulder Ext. Rotation', ARRAY['Dumbbell','Cable']),
  ('Trap Raise',             ARRAY['Dumbbell','Cable']),
  ('Push-up',                ARRAY['Bodyweight']),
  ('Lunge',                  ARRAY['Bodyweight','Dumbbell','Barbell','Kettlebell']),
  ('Split Squat',            ARRAY['Bodyweight','Dumbbell','Barbell']),
  ('Overhead Press',         ARRAY['Barbell','Dumbbell','Kettlebell']),
  ('Lateral Raise',          ARRAY['Dumbbell','Cable']),
  ('Triceps Extension',      ARRAY['Dumbbell','Cable','Barbell']),
  ('Calf Raise',             ARRAY['Bodyweight','Dumbbell','Barbell','Machine']),
  ('Glute Bridge',           ARRAY['Bodyweight','Barbell','Dumbbell']),
  ('Back Extension',         ARRAY['Bodyweight','Machine']),
  ('Leg Press',              ARRAY['Machine']),
  ('Leg Extension',          ARRAY['Machine']),
  ('Russian Twist',          ARRAY['Bodyweight','Dumbbell','Kettlebell']),
  ('Wood Chop',              ARRAY['Cable','Dumbbell']),
  ('Pec Fly',                ARRAY['Machine','Cable','Dumbbell']),
  ('Reverse Fly',            ARRAY['Machine','Dumbbell','Cable']),
  ('Pulldown',               ARRAY['Machine','Cable']),
  ('Dead Hang',              ARRAY['Pull-up Bar']),
  ('Cycling',                ARRAY['Machine']),
  ('Elliptical',             ARRAY['Machine']),
  ('Jump Rope',              ARRAY['Bodyweight']),
  ('Rowing',                 ARRAY['Machine']),
  ('Running',                ARRAY['Bodyweight']),
  ('Stair Climber',          ARRAY['Machine']),
  ('Stationary Bike',        ARRAY['Machine']),
  ('Swimming',               ARRAY['Bodyweight']),
  ('Treadmill',              ARRAY['Machine']),
  ('Walking',                ARRAY['Bodyweight'])
) AS v(name, equipment)
WHERE e.name = v.name AND e.created_by_user_id IS NULL;

-- 5. Backfill user-created rows from their logging default
UPDATE public.exercises
SET compatible_equipment = ARRAY[default_equipment_type]
WHERE created_by_user_id IS NOT NULL
  AND default_equipment_type IS NOT NULL
  AND compatible_equipment = '{}';
