
ALTER TABLE public.exercise_muscle_groups DROP CONSTRAINT IF EXISTS exercise_muscle_groups_muscle_group_id_fkey;
DELETE FROM public.exercise_muscle_groups;
DROP TABLE IF EXISTS public.muscle_groups;
;
