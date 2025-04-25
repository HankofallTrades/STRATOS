-- 1. Exercises Table: Master list of exercises
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_equipment_type text CHECK (default_equipment_type IN ('DB', 'BB', 'KB', 'Cable', 'Free')),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: Track user-created exercises
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all exercises
CREATE POLICY "Allow public read access" ON public.exercises
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert new exercises
CREATE POLICY "Allow authenticated insert" ON public.exercises
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Optional Policy: Allow user to update/delete exercises they created
-- CREATE POLICY "Allow user update/delete" ON public.exercises
--   FOR UPDATE USING (auth.uid() = created_by_user_id);
-- CREATE POLICY "Allow user delete" ON public.exercises
--   FOR DELETE USING (auth.uid() = created_by_user_id);


-- 2. User Exercise Stats Table: User-specific data about exercises
CREATE TABLE public.user_exercise_stats (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  one_rep_max float,
  last_used_equipment_type text CHECK (last_used_equipment_type IN ('DB', 'BB', 'KB', 'Cable', 'Free')),
  custom_variations text[], -- Array of text
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id) -- Composite primary key
);

-- Enable RLS
ALTER TABLE public.user_exercise_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to manage their own exercise stats
CREATE POLICY "Allow users own stats access" ON public.user_exercise_stats
  FOR ALL USING (auth.uid() = user_id);


-- 3. Workouts Table: Represents a single workout session
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to manage their own workouts
CREATE POLICY "Allow users own workouts access" ON public.workouts
  FOR ALL USING (auth.uid() = user_id);


-- 4. Workout Exercises Table: Links exercises to workouts (an exercise instance in a workout)
CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  "order" integer NOT NULL, -- Use quotes because "order" is a reserved keyword
  created_at timestamptz DEFAULT now(),
  UNIQUE (workout_id, exercise_id, "order") -- Ensure order is unique within a workout/exercise combo if needed, or just (workout_id, "order")
);

-- Enable RLS
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users access via the parent workout record
CREATE POLICY "Allow users access via workout" ON public.workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.workouts w
      WHERE w.id = workout_id AND w.user_id = auth.uid()
    )
  );


-- 5. Exercise Sets Table: Details of each set performed
CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  weight float NOT NULL,
  reps integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  equipment_type text CHECK (equipment_type IN ('DB', 'BB', 'KB', 'Cable', 'Free')),
  variation text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (workout_exercise_id, set_number) -- Ensure set_number is unique for a given workout_exercise
);

-- Enable RLS
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users access via the parent workout record
CREATE POLICY "Allow users access via workout" ON public.exercise_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.workout_exercises we
      JOIN public.workouts w ON we.workout_id = w.id
      WHERE we.id = workout_exercise_id AND w.user_id = auth.uid()
    )
  );

-- 6. Exercise Variations Table: One-to-many relationship for exercise variations
CREATE TABLE public.exercise_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  variation_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (exercise_id, variation_name) -- Prevent duplicate variations per exercise
);

-- Enable RLS
ALTER TABLE public.exercise_variations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all variations
CREATE POLICY "Allow public read access" ON public.exercise_variations
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert new variations
CREATE POLICY "Allow authenticated insert" ON public.exercise_variations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Optional: Allow users to delete/update variations they created if you track creator
-- Otherwise omit unless you plan to add `created_by_user_id` column


-- Indexes for Performance (Good Practice)
CREATE INDEX idx_user_exercise_stats_user ON public.user_exercise_stats(user_id);
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, date DESC);
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON public.workout_exercises(exercise_id);
CREATE INDEX idx_exercise_sets_workout_exercise ON public.exercise_sets(workout_exercise_id);