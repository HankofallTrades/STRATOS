
-- Insert Movement Archetypes
INSERT INTO public.movement_archetypes (name) VALUES
('Squat'),
('Lunge'),
('Push (Vertical)'),
('Push (Horizontal)'),
('Pull (Vertical)'),
('Pull (Horizontal)'),
('Bend'),
('Twist'),
('Gait')
ON CONFLICT (name) DO NOTHING;

-- Insert Muscle Definitions
INSERT INTO public.muscle_definitions (name) VALUES
('Quadriceps'), ('Glutes'), ('Hamstrings'), ('Core'), ('Erector Spinae'),
('Calves'), ('Hip Flexors'), ('Pectoralis Major'), ('Anterior Deltoid'),
('Triceps Brachii'), ('Upper Trapezius'), ('Serratus Anterior'), ('Latissimus Dorsi'),
('Biceps Brachii'), ('Posterior Deltoid'), ('Lower Trapezius'), ('Teres Major'),
('Rhomboids'), ('Middle Trapezius'), ('Obliques'), ('Rectus Abdominis'),
('Transverse Abdominis'), ('Hip Rotators')
ON CONFLICT (name) DO NOTHING;

-- Insert Archetype-Muscle Mappings

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Squat' AND md.name IN ('Quadriceps', 'Glutes', 'Hamstrings', 'Core', 'Erector Spinae');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Lunge' AND md.name IN ('Quadriceps', 'Glutes', 'Hamstrings', 'Calves', 'Core', 'Hip Flexors');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Push (Vertical)' AND md.name IN ('Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii', 'Upper Trapezius', 'Core');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Push (Horizontal)' AND md.name IN ('Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii', 'Serratus Anterior', 'Core');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Pull (Vertical)' AND md.name IN ('Latissimus Dorsi', 'Biceps Brachii', 'Posterior Deltoid', 'Lower Trapezius', 'Teres Major', 'Core');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Pull (Horizontal)' AND md.name IN ('Rhomboids', 'Latissimus Dorsi', 'Posterior Deltoid', 'Middle Trapezius', 'Biceps Brachii', 'Core');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Bend' AND md.name IN ('Hamstrings', 'Glutes', 'Erector Spinae', 'Core');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Twist' AND md.name IN ('Obliques', 'Rectus Abdominis', 'Transverse Abdominis', 'Erector Spinae', 'Core', 'Hip Rotators');

WITH ma AS (SELECT id, name FROM public.movement_archetypes), md AS (SELECT id, name FROM public.muscle_definitions)
INSERT INTO public.archetype_muscle_map (archetype_id, muscle_id)
SELECT ma.id, md.id FROM ma, md WHERE ma.name = 'Gait' AND md.name IN ('Glutes', 'Hamstrings', 'Quadriceps', 'Calves', 'Hip Flexors', 'Core', 'Erector Spinae');
;
