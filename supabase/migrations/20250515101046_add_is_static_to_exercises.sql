ALTER TABLE public.exercises
ADD COLUMN is_static BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.exercises.is_static IS 'Indicates if the exercise is timed (true) or rep-based (false/null)';;
