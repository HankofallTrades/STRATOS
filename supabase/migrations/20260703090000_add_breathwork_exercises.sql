-- Add 'breathwork' exercise category and seed the built-in breathwork exercises.
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_exercise_category_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_exercise_category_check
  CHECK (exercise_category IN ('weights', 'calisthenics', 'cardio', 'mobility', 'stability', 'breathwork'));

INSERT INTO exercises (name, exercise_type, exercise_category, is_static, created_by_user_id)
SELECT v.name, 'strength', 'breathwork', true, NULL
FROM (VALUES ('Box Breathing'), ('4-7-8 Breathing'), ('Coherent Breathing'), ('Breath Rounds')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.name = v.name AND e.created_by_user_id IS NULL
);
