-- Categorize calisthenics (bodyweight-primary movements)
UPDATE exercises SET exercise_category = 'calisthenics' WHERE name IN (
  'Pull-up', 'Push-up', 'Dip', 'Dead Hang', 'Glute Bridge',
  'Man Maker', 'Lunge', 'Split Squat', 'Calf Raise'
);

-- Boxing is timed cardio, not weights
UPDATE exercises SET exercise_category = 'cardio' WHERE name = 'Boxing';
