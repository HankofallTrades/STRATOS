
ALTER TABLE public.exercise_muscle_groups RENAME COLUMN muscle_group_id TO muscle_definition_id;
ALTER TABLE public.exercise_muscle_groups ADD CONSTRAINT exercise_muscle_groups_muscle_definition_id_fkey FOREIGN KEY (muscle_definition_id) REFERENCES public.muscle_definitions(id) ON DELETE CASCADE;
;
