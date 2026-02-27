ALTER TABLE public.exercises ADD CONSTRAINT fk_exercises_archetype_id_unique FOREIGN KEY (archetype_id) REFERENCES public.movement_archetypes(id) ON DELETE SET NULL;;
