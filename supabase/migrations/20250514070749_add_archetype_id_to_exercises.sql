ALTER TABLE public.exercises
ADD COLUMN archetype_id UUID NULL,
ADD CONSTRAINT fk_exercise_archetype
FOREIGN KEY (archetype_id)
REFERENCES public.movement_archetypes(id)
ON DELETE SET NULL;;
