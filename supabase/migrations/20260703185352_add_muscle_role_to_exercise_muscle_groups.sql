ALTER TABLE public.exercise_muscle_groups
  ADD COLUMN role text NOT NULL DEFAULT 'primary'
  CHECK (role IN ('primary', 'secondary', 'stabilizer'));
