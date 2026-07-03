# Exercise Taxonomy v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the exercise taxonomy so the Coach can plan for no-gym, injury, and recovery scenarios, and expand the global catalog to ~70 curated movements.

**Architecture:** Additive Supabase migrations (schema + data) plus a new pure candidate-filtering seam (`workoutCandidates.ts`) wired into `buildWorkoutPlan`, with new `propose_workout` constraints. One row per movement; equipment/variation stay per-set logging dimensions.

**Tech Stack:** Supabase (Postgres migrations, RPC), TypeScript, React, Vitest, zod.

**Spec:** `docs/superpowers/specs/2026-07-03-exercise-taxonomy-v2-design.md` (approved).

## Global Constraints

- Work happens in worktree `/Users/hank/agent-ops/Forge/stratos/.claude/worktrees/exercise-taxonomy-v2` on branch `exercise-taxonomy-v2`.
- One row per movement. Never create equipment-specific exercise rows.
- Archetype required for `weights`/`calisthenics`; NULL for `cardio`/`mobility`/`stability`.
- No renames of existing muscles; no analytics RPC changes; no changes to set logging, variations, mesocycle templates, or the volume-deficit algorithm.
- Pages/hooks must not import Supabase directly; I/O lives in `src/domains/*/data`.
- Verification commands run sequentially, never in parallel: `npm run build`, then `npm run lint`, then `npm test`. Lint baseline: 8 warnings, 0 errors.
- Migrations are local files during implementation; they are applied to the remote project only in the Rollout task (via Supabase MCP), then renamed to the MCP-recorded versions.
- Equipment names (exact strings): `Barbell`, `Bodyweight`, `Cable`, `Dumbbell`, `Kettlebell`, `Landmine`, `Machine`, `Swiss Ball`, plus new `Pull-up Bar`.
- New muscle names (exact strings): `Rotator Cuff`, `Adductors`, `Lateral Deltoid`, `Grip/Forearms`.

---

### Task 1: Schema migrations (role column, compatible_equipment, reference rows, primary-muscle RPC)

**Files:**
- Create: `supabase/migrations/20260703090000_add_muscle_role_to_exercise_muscle_groups.sql`
- Create: `supabase/migrations/20260703090100_add_compatible_equipment_to_exercises.sql`
- Create: `supabase/migrations/20260703090200_add_taxonomy_reference_rows.sql`
- Create: `supabase/migrations/20260703090300_add_primary_muscle_map_rpc.sql`

**Interfaces:**
- Produces: `exercise_muscle_groups.role` (`primary|secondary|stabilizer`, NOT NULL DEFAULT `'primary'`), `exercises.compatible_equipment text[] NOT NULL DEFAULT '{}'`, muscle rows `Rotator Cuff`/`Adductors`/`Lateral Deltoid`/`Grip/Forearms`, equipment row `Pull-up Bar`, RPC `get_exercise_primary_muscle_map() RETURNS json` (`{exercise_id: [muscle names…]}` for role `primary` only).

- [ ] **Step 1: Write migration 1 — role column**

`supabase/migrations/20260703090000_add_muscle_role_to_exercise_muscle_groups.sql`:

```sql
ALTER TABLE public.exercise_muscle_groups
  ADD COLUMN role text NOT NULL DEFAULT 'primary'
  CHECK (role IN ('primary', 'secondary', 'stabilizer'));
```

- [ ] **Step 2: Write migration 2 — compatible_equipment**

`supabase/migrations/20260703090100_add_compatible_equipment_to_exercises.sql`:

```sql
-- OR-semantics: the movement can be performed with any one listed equipment
-- name. Empty array = unknown (filters treat unknown as allowed).
ALTER TABLE public.exercises
  ADD COLUMN compatible_equipment text[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 3: Write migration 3 — reference rows**

`supabase/migrations/20260703090200_add_taxonomy_reference_rows.sql`:

```sql
INSERT INTO public.muscle_definitions (name)
SELECT v.name
FROM (VALUES ('Rotator Cuff'), ('Adductors'), ('Lateral Deltoid'), ('Grip/Forearms')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.muscle_definitions m WHERE m.name = v.name
);

INSERT INTO public.equipment_types (name)
SELECT 'Pull-up Bar'
WHERE NOT EXISTS (
  SELECT 1 FROM public.equipment_types e WHERE e.name = 'Pull-up Bar' AND e.user_id IS NULL
);
```

- [ ] **Step 4: Write migration 4 — primary-muscle RPC (mirrors existing `get_exercise_muscle_group_map`)**

`supabase/migrations/20260703090300_add_primary_muscle_map_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION get_exercise_primary_muscle_map()
RETURNS json
LANGUAGE sql
AS $$
  SELECT json_object_agg(exercise_id, muscle_names)
  FROM (
    SELECT
      emg.exercise_id,
      array_agg(md.name ORDER BY md.name) AS muscle_names
    FROM public.exercise_muscle_groups emg
    JOIN public.muscle_definitions md ON emg.muscle_definition_id = md.id
    WHERE emg.role = 'primary'
    GROUP BY emg.exercise_id
  ) AS subquery;
$$;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607030900*.sql supabase/migrations/20260703090300_add_primary_muscle_map_rpc.sql
git commit -m "feat(db): add muscle role, compatible_equipment, reference rows, primary-muscle RPC"
```

---

### Task 2: Data migration — misclassification fixes

**Files:**
- Create: `supabase/migrations/20260703090400_fix_exercise_misclassifications.sql`

**Interfaces:**
- Consumes: Task 1 columns/rows.
- Produces: corrected rows for the 10 spec-listed exercises. Later tasks assume these classifications.

- [ ] **Step 1: Write the migration**

All names are unique in the current catalog; scope updates by name. Muscle re-inserts use name lookups.

```sql
-- Archetype/type fixes
UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Isolation')
WHERE name = 'Lateral Raise';

UPDATE public.exercises SET exercise_type = 'cardio', archetype_id = NULL, is_static = false
WHERE name = 'Boxing';

UPDATE public.exercises SET exercise_type = 'cardio', archetype_id = NULL
WHERE name = 'Assault bike';

UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Pull_Vertical')
WHERE name IN ('Dead Hang', 'Pulldown');

UPDATE public.exercises SET archetype_id = (SELECT id FROM public.movement_archetypes WHERE name = 'Bend')
WHERE name = 'Superman''s';

-- Replace wrong muscle lists (delete then re-insert with roles)
DELETE FROM public.exercise_muscle_groups
WHERE exercise_id IN (
  SELECT id FROM public.exercises WHERE name IN ('Shoulder Ext. Rotation', 'Pull-up', 'Face Pull')
);

INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Shoulder Ext. Rotation', 'Rotator Cuff',      'primary'),
  ('Pull-up',                'Latissimus Dorsi',  'primary'),
  ('Pull-up',                'Biceps Brachii',    'secondary'),
  ('Pull-up',                'Lower Trapezius',   'secondary'),
  ('Pull-up',                'Teres Major',       'secondary'),
  ('Pull-up',                'Grip/Forearms',     'stabilizer'),
  ('Pull-up',                'Core',              'stabilizer'),
  ('Face Pull',              'Posterior Deltoid', 'primary'),
  ('Face Pull',              'Rotator Cuff',      'secondary'),
  ('Face Pull',              'Middle Trapezius',  'secondary'),
  ('Face Pull',              'Rhomboids',         'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name;

-- Additions for exercises that had no mappings at all
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Lateral Raise', 'Lateral Deltoid',  'primary'),
  ('Dip',           'Pectoralis Major', 'primary'),
  ('Dip',           'Triceps Brachii',  'primary'),
  ('Dip',           'Anterior Deltoid', 'secondary'),
  ('Dead Hang',     'Grip/Forearms',    'primary'),
  ('Dead Hang',     'Latissimus Dorsi', 'stabilizer')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260703090400_fix_exercise_misclassifications.sql
git commit -m "fix(db): correct misclassified exercises and wrong muscle lists"
```

---

### Task 3: Data migration — promote staples, set roles on existing mappings, backfill muscles + equipment

**Files:**
- Create: `supabase/migrations/20260703090500_promote_and_backfill_global_catalog.sql`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: 37 global rows (20 existing + 17 promoted), each with roles on muscle mappings and non-empty `compatible_equipment`; user rows backfilled from `default_equipment_type`.

- [ ] **Step 1: Write the migration**

```sql
-- 1. Promote staples to global (keeps ids and logged history)
UPDATE public.exercises SET created_by_user_id = NULL
WHERE created_by_user_id IS NOT NULL AND name IN (
  'Push-up', 'Lunge', 'Split Squat', 'Overhead Press', 'Lateral Raise',
  'Triceps Extension', 'Calf Raise', 'Glute Bridge', 'Back Extension',
  'Leg Press', 'Leg Extension', 'Russian Twist', 'Wood Chop', 'Pec Fly',
  'Reverse Fly', 'Pulldown', 'Dead Hang'
);

-- 2. Demote generic archetype-copied mappings to correct roles on rows that
--    already have muscles (Deadlift, Squat, Bench Press, Row, Push-up, Lunge,
--    Leg Press). Primary = prime movers; everything else secondary/stabilizer.
UPDATE public.exercise_muscle_groups emg SET role = v.role
FROM (VALUES
  ('Deadlift',   'Glutes',            'primary'),
  ('Deadlift',   'Hamstrings',        'primary'),
  ('Deadlift',   'Erector Spinae',    'secondary'),
  ('Deadlift',   'Core',              'stabilizer'),
  ('Squat',      'Quadriceps',        'primary'),
  ('Squat',      'Glutes',            'primary'),
  ('Squat',      'Hamstrings',        'secondary'),
  ('Squat',      'Erector Spinae',    'stabilizer'),
  ('Squat',      'Core',              'stabilizer'),
  ('Bench Press','Pectoralis Major',  'primary'),
  ('Bench Press','Triceps Brachii',   'secondary'),
  ('Bench Press','Anterior Deltoid',  'secondary'),
  ('Bench Press','Serratus Anterior', 'stabilizer'),
  ('Bench Press','Core',              'stabilizer'),
  ('Row',        'Latissimus Dorsi',  'primary'),
  ('Row',        'Rhomboids',         'primary'),
  ('Row',        'Middle Trapezius',  'primary'),
  ('Row',        'Biceps Brachii',    'secondary'),
  ('Row',        'Posterior Deltoid', 'secondary'),
  ('Row',        'Core',              'stabilizer'),
  ('Push-up',    'Pectoralis Major',  'primary'),
  ('Push-up',    'Triceps Brachii',   'secondary'),
  ('Push-up',    'Anterior Deltoid',  'secondary'),
  ('Push-up',    'Serratus Anterior', 'stabilizer'),
  ('Push-up',    'Core',              'stabilizer'),
  ('Lunge',      'Quadriceps',        'primary'),
  ('Lunge',      'Glutes',            'primary'),
  ('Lunge',      'Hamstrings',        'secondary'),
  ('Lunge',      'Calves',            'stabilizer'),
  ('Lunge',      'Hip Flexors',       'stabilizer'),
  ('Lunge',      'Core',              'stabilizer'),
  ('Leg Press',  'Quadriceps',        'primary'),
  ('Leg Press',  'Glutes',            'primary'),
  ('Leg Press',  'Hamstrings',        'secondary'),
  ('Leg Press',  'Erector Spinae',    'stabilizer'),
  ('Leg Press',  'Core',              'stabilizer')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE emg.exercise_id = e.id AND emg.muscle_definition_id = m.id;

-- 3. Add missing mappings for global rows that have none (or partial)
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Deadlift',          'Grip/Forearms',     'secondary'),
  ('Bicep Curl',        'Grip/Forearms',     'secondary'),
  ('Split Squat',       'Quadriceps',        'primary'),
  ('Split Squat',       'Glutes',            'primary'),
  ('Split Squat',       'Hamstrings',        'secondary'),
  ('Split Squat',       'Adductors',         'secondary'),
  ('Split Squat',       'Core',              'stabilizer'),
  ('Overhead Press',    'Anterior Deltoid',  'primary'),
  ('Overhead Press',    'Lateral Deltoid',   'secondary'),
  ('Overhead Press',    'Triceps Brachii',   'secondary'),
  ('Overhead Press',    'Upper Trapezius',   'secondary'),
  ('Overhead Press',    'Core',              'stabilizer'),
  ('Triceps Extension', 'Triceps Brachii',   'primary'),
  ('Calf Raise',        'Calves',            'primary'),
  ('Glute Bridge',      'Glutes',            'primary'),
  ('Glute Bridge',      'Hamstrings',        'secondary'),
  ('Glute Bridge',      'Core',              'stabilizer'),
  ('Back Extension',    'Erector Spinae',    'primary'),
  ('Back Extension',    'Glutes',            'secondary'),
  ('Back Extension',    'Hamstrings',        'secondary'),
  ('Russian Twist',     'Obliques',          'primary'),
  ('Russian Twist',     'Rectus Abdominis',  'secondary'),
  ('Russian Twist',     'Hip Flexors',       'secondary'),
  ('Wood Chop',         'Obliques',          'primary'),
  ('Wood Chop',         'Rectus Abdominis',  'secondary'),
  ('Wood Chop',         'Erector Spinae',    'stabilizer'),
  ('Pec Fly',           'Pectoralis Major',  'primary'),
  ('Reverse Fly',       'Posterior Deltoid', 'primary'),
  ('Reverse Fly',       'Rhomboids',         'secondary'),
  ('Reverse Fly',       'Middle Trapezius',  'secondary'),
  ('Pulldown',          'Latissimus Dorsi',  'primary'),
  ('Pulldown',          'Biceps Brachii',    'secondary'),
  ('Pulldown',          'Teres Major',       'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);

-- 4. compatible_equipment for all (now-)global rows
UPDATE public.exercises e SET compatible_equipment = v.equipment
FROM (VALUES
  ('Squat',                  ARRAY['Barbell','Dumbbell','Kettlebell','Bodyweight','Machine']),
  ('Deadlift',               ARRAY['Barbell','Dumbbell','Kettlebell']),
  ('Bench Press',            ARRAY['Barbell','Dumbbell','Machine']),
  ('Row',                    ARRAY['Dumbbell','Barbell','Cable','Machine','Landmine']),
  ('Pull-up',                ARRAY['Pull-up Bar']),
  ('Dip',                    ARRAY['Bodyweight']),
  ('Face Pull',              ARRAY['Cable']),
  ('Bicep Curl',             ARRAY['Dumbbell','Barbell','Cable']),
  ('Shoulder Ext. Rotation', ARRAY['Dumbbell','Cable']),
  ('Trap Raise',             ARRAY['Dumbbell','Cable']),
  ('Push-up',                ARRAY['Bodyweight']),
  ('Lunge',                  ARRAY['Bodyweight','Dumbbell','Barbell','Kettlebell']),
  ('Split Squat',            ARRAY['Bodyweight','Dumbbell','Barbell']),
  ('Overhead Press',         ARRAY['Barbell','Dumbbell','Kettlebell']),
  ('Lateral Raise',          ARRAY['Dumbbell','Cable']),
  ('Triceps Extension',      ARRAY['Dumbbell','Cable','Barbell']),
  ('Calf Raise',             ARRAY['Bodyweight','Dumbbell','Barbell','Machine']),
  ('Glute Bridge',           ARRAY['Bodyweight','Barbell','Dumbbell']),
  ('Back Extension',         ARRAY['Bodyweight','Machine']),
  ('Leg Press',              ARRAY['Machine']),
  ('Leg Extension',          ARRAY['Machine']),
  ('Russian Twist',          ARRAY['Bodyweight','Dumbbell','Kettlebell']),
  ('Wood Chop',              ARRAY['Cable','Dumbbell']),
  ('Pec Fly',                ARRAY['Machine','Cable','Dumbbell']),
  ('Reverse Fly',            ARRAY['Machine','Dumbbell','Cable']),
  ('Pulldown',               ARRAY['Machine','Cable']),
  ('Dead Hang',              ARRAY['Pull-up Bar']),
  ('Cycling',                ARRAY['Machine']),
  ('Elliptical',             ARRAY['Machine']),
  ('Jump Rope',              ARRAY['Bodyweight']),
  ('Rowing',                 ARRAY['Machine']),
  ('Running',                ARRAY['Bodyweight']),
  ('Stair Climber',          ARRAY['Machine']),
  ('Stationary Bike',        ARRAY['Machine']),
  ('Swimming',               ARRAY['Bodyweight']),
  ('Treadmill',              ARRAY['Machine']),
  ('Walking',                ARRAY['Bodyweight'])
) AS v(name, equipment)
WHERE e.name = v.name AND e.created_by_user_id IS NULL;

-- 5. Backfill user-created rows from their logging default
UPDATE public.exercises
SET compatible_equipment = ARRAY[default_equipment_type]
WHERE created_by_user_id IS NOT NULL
  AND default_equipment_type IS NOT NULL
  AND compatible_equipment = '{}';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260703090500_promote_and_backfill_global_catalog.sql
git commit -m "feat(db): promote staples to global, add muscle roles and compatible equipment"
```

---

### Task 4: Data migration — seed 33 new global movements

**Files:**
- Create: `supabase/migrations/20260703090600_seed_global_movement_catalog.sql`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: ~70 global rows total; every new row has category, archetype (or NULL per rule), muscles+roles, compatible_equipment, default_equipment_type, is_static, and a `Standard` variation.

- [ ] **Step 1: Write the migration**

```sql
-- New global movements. archetype name '' means NULL (mobility/stability).
WITH new_exercises(name, archetype, category, is_static, default_equipment, equipment) AS (
  VALUES
  -- Bend
  ('Hip Thrust',              'Bend',            'weights',       false, 'Barbell',    ARRAY['Barbell','Bodyweight','Dumbbell']),
  ('Good Morning',            'Bend',            'weights',       false, 'Barbell',    ARRAY['Barbell']),
  ('Kettlebell Swing',        'Bend',            'weights',       false, 'Kettlebell', ARRAY['Kettlebell']),
  ('Nordic Curl',             'Bend',            'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Leg Curl',                'Isolation',       'weights',       false, 'Machine',    ARRAY['Machine','Swiss Ball']),
  -- Lunge
  ('Step-Up',                 'Lunge',           'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight','Dumbbell','Barbell']),
  -- Push_Vertical
  ('Pike Push-up',            'Push_Vertical',   'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Pull_Horizontal
  ('Inverted Row',            'Pull_Horizontal', 'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight','Pull-up Bar','Barbell']),
  -- Twist
  ('Bicycle Crunch',          'Twist',           'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Gait
  ('Farmer''s Carry',         'Gait',            'weights',       false, 'Dumbbell',   ARRAY['Dumbbell','Kettlebell']),
  ('Sled Push',               'Gait',            'weights',       false, 'Machine',    ARRAY['Machine']),
  ('Bear Crawl',              'Gait',            'calisthenics',  false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Mobility (archetype NULL)
  ('Downward Dog',            '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Cat-Cow',                 '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Child''s Pose',           '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Cobra',                   '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Pigeon Pose',             '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Couch Stretch',           '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Hamstring Stretch',       '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Hip Flexor Stretch',      '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('World''s Greatest Stretch','',               'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Deep Squat Hold',         '',                'mobility',      true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Thoracic Rotation',       '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Shoulder Dislocates',     '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  ('90/90 Hip Switch',        '',                'mobility',      false, 'Bodyweight', ARRAY['Bodyweight']),
  -- Stability (archetype NULL)
  ('Plank',                   '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Side Plank',              '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Bird Dog',                '',                'stability',     false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Dead Bug',                '',                'stability',     false, 'Bodyweight', ARRAY['Bodyweight']),
  ('Pallof Press',            '',                'stability',     false, 'Cable',      ARRAY['Cable']),
  ('Copenhagen Plank',        '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Single-Leg Balance',      '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight']),
  ('Wall Sit',                '',                'stability',     true,  'Bodyweight', ARRAY['Bodyweight'])
)
INSERT INTO public.exercises
  (name, archetype_id, exercise_category, exercise_type, is_static,
   default_equipment_type, compatible_equipment, created_by_user_id)
SELECT
  ne.name,
  CASE WHEN ne.archetype = '' THEN NULL
       ELSE (SELECT id FROM public.movement_archetypes a WHERE a.name = ne.archetype) END,
  ne.category,
  'strength',
  ne.is_static,
  ne.default_equipment,
  ne.equipment,
  NULL
FROM new_exercises ne
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercises e
  WHERE e.name = ne.name AND e.created_by_user_id IS NULL
);

-- Standard variation for each non-cardio global row that has none
-- (cardio rows intentionally have no variations)
INSERT INTO public.exercise_variations (exercise_id, variation_name)
SELECT e.id, 'Standard'
FROM public.exercises e
WHERE e.created_by_user_id IS NULL
  AND e.exercise_type <> 'cardio'
  AND NOT EXISTS (
    SELECT 1 FROM public.exercise_variations v WHERE v.exercise_id = e.id
  );

-- Muscle mappings for the new movements
INSERT INTO public.exercise_muscle_groups (exercise_id, muscle_definition_id, role)
SELECT e.id, m.id, v.role
FROM (VALUES
  ('Hip Thrust',               'Glutes',            'primary'),
  ('Hip Thrust',               'Hamstrings',        'secondary'),
  ('Good Morning',             'Hamstrings',        'primary'),
  ('Good Morning',             'Glutes',            'primary'),
  ('Good Morning',             'Erector Spinae',    'secondary'),
  ('Kettlebell Swing',         'Glutes',            'primary'),
  ('Kettlebell Swing',         'Hamstrings',        'primary'),
  ('Kettlebell Swing',         'Erector Spinae',    'secondary'),
  ('Kettlebell Swing',         'Grip/Forearms',     'secondary'),
  ('Kettlebell Swing',         'Core',              'stabilizer'),
  ('Nordic Curl',              'Hamstrings',        'primary'),
  ('Nordic Curl',              'Glutes',            'stabilizer'),
  ('Leg Curl',                 'Hamstrings',        'primary'),
  ('Step-Up',                  'Quadriceps',        'primary'),
  ('Step-Up',                  'Glutes',            'primary'),
  ('Step-Up',                  'Core',              'stabilizer'),
  ('Pike Push-up',             'Anterior Deltoid',  'primary'),
  ('Pike Push-up',             'Triceps Brachii',   'secondary'),
  ('Pike Push-up',             'Upper Trapezius',   'secondary'),
  ('Inverted Row',             'Latissimus Dorsi',  'primary'),
  ('Inverted Row',             'Rhomboids',         'primary'),
  ('Inverted Row',             'Middle Trapezius',  'primary'),
  ('Inverted Row',             'Biceps Brachii',    'secondary'),
  ('Inverted Row',             'Posterior Deltoid', 'secondary'),
  ('Bicycle Crunch',           'Obliques',          'primary'),
  ('Bicycle Crunch',           'Rectus Abdominis',  'primary'),
  ('Bicycle Crunch',           'Hip Flexors',       'secondary'),
  ('Farmer''s Carry',          'Grip/Forearms',     'primary'),
  ('Farmer''s Carry',          'Upper Trapezius',   'secondary'),
  ('Farmer''s Carry',          'Core',              'stabilizer'),
  ('Sled Push',                'Quadriceps',        'primary'),
  ('Sled Push',                'Glutes',            'primary'),
  ('Sled Push',                'Calves',            'secondary'),
  ('Bear Crawl',               'Core',              'primary'),
  ('Bear Crawl',               'Anterior Deltoid',  'secondary'),
  ('Bear Crawl',               'Quadriceps',        'secondary'),
  ('Bear Crawl',               'Hip Flexors',       'secondary'),
  ('Downward Dog',             'Hamstrings',        'primary'),
  ('Downward Dog',             'Calves',            'primary'),
  ('Cat-Cow',                  'Erector Spinae',    'primary'),
  ('Child''s Pose',            'Latissimus Dorsi',  'primary'),
  ('Child''s Pose',            'Erector Spinae',    'primary'),
  ('Cobra',                    'Rectus Abdominis',  'primary'),
  ('Cobra',                    'Hip Flexors',       'primary'),
  ('Pigeon Pose',              'Glutes',            'primary'),
  ('Pigeon Pose',              'Hip Rotators',      'primary'),
  ('Couch Stretch',            'Hip Flexors',       'primary'),
  ('Couch Stretch',            'Quadriceps',        'primary'),
  ('Hamstring Stretch',        'Hamstrings',        'primary'),
  ('Hip Flexor Stretch',       'Hip Flexors',       'primary'),
  ('World''s Greatest Stretch','Hip Flexors',       'primary'),
  ('World''s Greatest Stretch','Hamstrings',        'primary'),
  ('World''s Greatest Stretch','Erector Spinae',    'secondary'),
  ('Deep Squat Hold',          'Adductors',         'primary'),
  ('Deep Squat Hold',          'Hip Flexors',       'primary'),
  ('Thoracic Rotation',        'Erector Spinae',    'primary'),
  ('Thoracic Rotation',        'Obliques',          'secondary'),
  ('Shoulder Dislocates',      'Rotator Cuff',      'primary'),
  ('Shoulder Dislocates',      'Anterior Deltoid',  'secondary'),
  ('90/90 Hip Switch',         'Hip Rotators',      'primary'),
  ('90/90 Hip Switch',         'Glutes',            'secondary'),
  ('Plank',                    'Core',              'primary'),
  ('Plank',                    'Serratus Anterior', 'secondary'),
  ('Side Plank',               'Obliques',          'primary'),
  ('Side Plank',               'Core',              'secondary'),
  ('Bird Dog',                 'Core',              'primary'),
  ('Bird Dog',                 'Glutes',            'secondary'),
  ('Bird Dog',                 'Erector Spinae',    'secondary'),
  ('Dead Bug',                 'Core',              'primary'),
  ('Dead Bug',                 'Transverse Abdominis', 'primary'),
  ('Dead Bug',                 'Hip Flexors',       'secondary'),
  ('Pallof Press',             'Core',              'primary'),
  ('Pallof Press',             'Obliques',          'primary'),
  ('Copenhagen Plank',         'Adductors',         'primary'),
  ('Copenhagen Plank',         'Obliques',          'secondary'),
  ('Single-Leg Balance',       'Glutes',            'primary'),
  ('Single-Leg Balance',       'Calves',            'secondary'),
  ('Wall Sit',                 'Quadriceps',        'primary'),
  ('Wall Sit',                 'Glutes',            'secondary')
) AS v(exercise_name, muscle_name, role)
JOIN public.exercises e ON e.name = v.exercise_name AND e.created_by_user_id IS NULL
JOIN public.muscle_definitions m ON m.name = v.muscle_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_muscle_groups x
  WHERE x.exercise_id = e.id AND x.muscle_definition_id = m.id
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260703090600_seed_global_movement_catalog.sql
git commit -m "feat(db): seed 33 new global movements incl. mobility and stability"
```

---

### Task 5: TypeScript types for the new columns

**Files:**
- Modify: `src/lib/integrations/supabase/types.ts:172-187` (exercise_muscle_groups Row/Insert/Update) and `:284-320` (exercises Row/Insert/Update)
- Modify: `src/lib/types/workout.ts:9-19` (Exercise interface)

**Interfaces:**
- Produces: `Exercise.compatible_equipment?: string[] | null`; supabase Row types include `compatible_equipment: string[]` and `role: string`.

- [ ] **Step 1: Add fields**

In `src/lib/integrations/supabase/types.ts`, `exercise_muscle_groups`: add `role: string` to Row, `role?: string` to Insert and Update. `exercises`: add `compatible_equipment: string[]` to Row, `compatible_equipment?: string[]` to Insert and Update.

In `src/lib/types/workout.ts`:

```ts
export interface Exercise {
  id: string;
  name: string;
  exercise_type?: 'strength' | 'cardio';
  exercise_category?: ExerciseCategory | null;
  archetype_id?: string | null;
  default_equipment_type?: string | null;
  created_by_user_id?: string | null;
  muscle_groups?: string[];
  is_static?: boolean | null;
  compatible_equipment?: string[] | null;
}
```

- [ ] **Step 2: Verify compile**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/integrations/supabase/types.ts src/lib/types/workout.ts
git commit -m "feat(types): compatible_equipment and muscle role columns"
```

---

### Task 6: Pure candidate-filter seam (TDD)

**Files:**
- Create: `src/domains/guidance/data/workoutCandidates.ts`
- Test: `src/domains/guidance/data/workoutCandidates.test.ts`

**Interfaces:**
- Produces:
  - `interface CandidateConstraints { availableEquipment?: string[] | null; avoidMuscles?: string[] | null; }`
  - `filterCandidateExercises(exercises: Exercise[], constraints: CandidateConstraints, primaryMuscleMap: Record<string, string[]>): Exercise[]`
  - `selectRecoveryExercises(exercises: Exercise[], count: number, constraints: CandidateConstraints, primaryMuscleMap: Record<string, string[]>): Exercise[]`
- Semantics: equipment keeps an exercise when `compatible_equipment` is empty/missing (unknown = allowed) or intersects `availableEquipment` (case-insensitive). `avoidMuscles` drops an exercise when any of its **primary** muscles matches (case-insensitive); exercises absent from the map are kept. `selectRecoveryExercises` filters to categories `mobility`/`stability`, applies both constraints, and returns up to `count` items favoring a mobility/stability mix (fill from whichever category has remainder).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import type { Exercise } from "@/lib/types/workout";

import {
  filterCandidateExercises,
  selectRecoveryExercises,
} from "./workoutCandidates";

const exercise = (overrides: Partial<Exercise> & { id: string; name: string }): Exercise => ({
  exercise_type: "strength",
  ...overrides,
});

describe("filterCandidateExercises", () => {
  const pool: Exercise[] = [
    exercise({ id: "squat", name: "Squat", compatible_equipment: ["Barbell", "Bodyweight"] }),
    exercise({ id: "legpress", name: "Leg Press", compatible_equipment: ["Machine"] }),
    exercise({ id: "mystery", name: "Mystery", compatible_equipment: [] }),
  ];

  it("keeps exercises whose equipment intersects availableEquipment", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("squat");
    expect(result.map((e) => e.id)).not.toContain("legpress");
  });

  it("treats empty compatible_equipment as unknown and keeps the exercise", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("mystery");
  });

  it("matches equipment case-insensitively", () => {
    const result = filterCandidateExercises(pool, { availableEquipment: ["bodyweight"] }, {});
    expect(result.map((e) => e.id)).toContain("squat");
  });

  it("drops exercises whose primary muscles are avoided, keeps secondary involvement", () => {
    const primaryMap = { squat: ["Quadriceps", "Glutes"], legpress: ["Quadriceps", "Glutes"] };
    const result = filterCandidateExercises(pool, { avoidMuscles: ["Quadriceps"] }, primaryMap);
    expect(result.map((e) => e.id)).toEqual(["mystery"]);
  });

  it("keeps exercises with no primary-muscle data", () => {
    const result = filterCandidateExercises(pool, { avoidMuscles: ["Quadriceps"] }, {});
    expect(result).toHaveLength(3);
  });

  it("applies no filtering when constraints are empty", () => {
    expect(filterCandidateExercises(pool, {}, {})).toHaveLength(3);
  });
});

describe("selectRecoveryExercises", () => {
  const pool: Exercise[] = [
    exercise({ id: "plank", name: "Plank", exercise_category: "stability", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "pallof", name: "Pallof Press", exercise_category: "stability", compatible_equipment: ["Cable"] }),
    exercise({ id: "downdog", name: "Downward Dog", exercise_category: "mobility", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "pigeon", name: "Pigeon Pose", exercise_category: "mobility", compatible_equipment: ["Bodyweight"] }),
    exercise({ id: "squat", name: "Squat", exercise_category: "weights", compatible_equipment: ["Barbell"] }),
  ];

  it("returns only mobility/stability exercises", () => {
    const result = selectRecoveryExercises(pool, 3, {}, {});
    expect(result.every((e) => e.exercise_category === "mobility" || e.exercise_category === "stability")).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("honors equipment constraints", () => {
    const result = selectRecoveryExercises(pool, 4, { availableEquipment: ["Bodyweight"] }, {});
    expect(result.map((e) => e.id)).not.toContain("pallof");
  });

  it("honors avoidMuscles against primary muscles", () => {
    const result = selectRecoveryExercises(pool, 4, { avoidMuscles: ["Hamstrings"] }, { downdog: ["Hamstrings", "Calves"] });
    expect(result.map((e) => e.id)).not.toContain("downdog");
  });

  it("returns fewer when the pool is smaller than count", () => {
    expect(selectRecoveryExercises(pool, 10, {}, {})).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- workoutCandidates`
Expected: FAIL — module `./workoutCandidates` not found.

- [ ] **Step 3: Implement**

```ts
import type { Exercise } from "@/lib/types/workout";

export interface CandidateConstraints {
  availableEquipment?: string[] | null;
  avoidMuscles?: string[] | null;
}

const normalize = (value: string) => value.trim().toLowerCase();

const matchesEquipment = (
  exercise: Exercise,
  availableEquipment: string[]
): boolean => {
  const compatible = exercise.compatible_equipment ?? [];
  if (compatible.length === 0) {
    // Unknown equipment data (e.g. legacy user-created rows) stays eligible.
    return true;
  }
  const available = new Set(availableEquipment.map(normalize));
  return compatible.some((name) => available.has(normalize(name)));
};

const avoidsPrimaryMuscle = (
  exercise: Exercise,
  avoidMuscles: string[],
  primaryMuscleMap: Record<string, string[]>
): boolean => {
  const primaries = primaryMuscleMap[exercise.id];
  if (!primaries || primaries.length === 0) {
    return false;
  }
  const avoided = new Set(avoidMuscles.map(normalize));
  return primaries.some((muscle) => avoided.has(normalize(muscle)));
};

export const filterCandidateExercises = (
  exercises: Exercise[],
  constraints: CandidateConstraints,
  primaryMuscleMap: Record<string, string[]>
): Exercise[] => {
  const availableEquipment = constraints.availableEquipment ?? [];
  const avoidMuscles = constraints.avoidMuscles ?? [];

  return exercises.filter((exercise) => {
    if (
      availableEquipment.length > 0 &&
      !matchesEquipment(exercise, availableEquipment)
    ) {
      return false;
    }
    if (
      avoidMuscles.length > 0 &&
      avoidsPrimaryMuscle(exercise, avoidMuscles, primaryMuscleMap)
    ) {
      return false;
    }
    return true;
  });
};

const shuffle = <T,>(values: T[]): T[] => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

export const selectRecoveryExercises = (
  exercises: Exercise[],
  count: number,
  constraints: CandidateConstraints,
  primaryMuscleMap: Record<string, string[]>
): Exercise[] => {
  const eligible = filterCandidateExercises(
    exercises.filter(
      (exercise) =>
        exercise.exercise_category === "mobility" ||
        exercise.exercise_category === "stability"
    ),
    constraints,
    primaryMuscleMap
  );

  const mobility = shuffle(
    eligible.filter((exercise) => exercise.exercise_category === "mobility")
  );
  const stability = shuffle(
    eligible.filter((exercise) => exercise.exercise_category === "stability")
  );

  // Alternate mobility/stability for a balanced recovery session, then fill
  // from whichever category still has entries.
  const selected: Exercise[] = [];
  while (selected.length < count && (mobility.length > 0 || stability.length > 0)) {
    const preferMobility = selected.length % 2 === 0;
    const next =
      (preferMobility ? mobility.shift() : stability.shift()) ??
      mobility.shift() ??
      stability.shift();
    if (!next) break;
    selected.push(next);
  }
  return selected;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- workoutCandidates`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domains/guidance/data/workoutCandidates.ts src/domains/guidance/data/workoutCandidates.test.ts
git commit -m "feat(guidance): pure candidate filtering for equipment and injury constraints"
```

---

### Task 7: Repository function for the primary-muscle map

**Files:**
- Modify: `src/domains/fitness/data/fitnessRepository.ts` (below `fetchExerciseMuscleGroupMappings`, around line 311)
- Modify: `src/domains/guidance/data/guidanceRepository.ts`

**Interfaces:**
- Consumes: RPC `get_exercise_primary_muscle_map` (Task 1).
- Produces: `fetchExercisePrimaryMuscleMap(): Promise<Record<string, string[]>>` exported from both repositories (guidance wraps fitness, matching the existing pattern).

- [ ] **Step 1: Add to fitnessRepository.ts (mirror `fetchExerciseMuscleGroupMappings`)**

```ts
export const fetchExercisePrimaryMuscleMap = async (): Promise<ExerciseMuscleGroupMapping> => {
    const { data, error } = await supabase.rpc('get_exercise_primary_muscle_map' as never);

    if (error) {
        console.error('Error fetching primary muscle map from RPC:', error);
        throw new Error(`Failed to fetch primary muscle map: ${error.message}`);
    }

    if (!data) {
        return {};
    }

    return data as ExerciseMuscleGroupMapping;
};
```

- [ ] **Step 2: Wrap in guidanceRepository.ts**

```ts
export const fetchGuidancePrimaryMuscleMap = async (): Promise<ExerciseMuscleGroupMapping> => {
    return fetchExercisePrimaryMuscleMap();
};
```

(Import `fetchExercisePrimaryMuscleMap` in the existing import block from `fitnessRepository`.)

- [ ] **Step 3: Verify compile, commit**

Run: `npm run build` — Expected: success.

```bash
git add src/domains/fitness/data/fitnessRepository.ts src/domains/guidance/data/guidanceRepository.ts
git commit -m "feat(data): primary-muscle map repository fetch"
```

---

### Task 8: Wire constraints + recovery path into buildWorkoutPlan

**Files:**
- Modify: `src/domains/guidance/hooks/useWorkoutGenerator.ts`

**Interfaces:**
- Consumes: `filterCandidateExercises`, `selectRecoveryExercises` (Task 6), `fetchGuidancePrimaryMuscleMap` (Task 7).
- Produces: `WorkoutConstraints` gains `availableEquipment?: string[] | null; avoidMuscles?: string[] | null;`. `GenerateStrengthWorkoutParams` gains `primaryMuscleMap?: Record<string, string[]>`. `GeneratedWorkoutSummary["source"]` union gains `"recovery"`.

- [ ] **Step 1: Extend types and constraint parsing**

In `useWorkoutGenerator.ts`:

```ts
export interface WorkoutConstraints {
  focus?: SessionFocus | null;
  durationMinutes?: number | null;
  targetArchetypes?: string[] | null;
  avoidArchetypes?: string[] | null;
  availableEquipment?: string[] | null;
  avoidMuscles?: string[] | null;
}
```

Add `primaryMuscleMap?: Record<string, string[]>;` to `GenerateStrengthWorkoutParams`. Add `"recovery"` to the `source` union in `GeneratedWorkoutSummary` and a branch in `buildGeneratorMessage`'s `sourceLabel`:

```ts
const sourceLabel =
  source === "recovery"
    ? " focused on mobility and stability work"
    : source === "periodized_template"
      ? ...
```

- [ ] **Step 2: Recovery path at the top of buildWorkoutPlan (before the archetype filter/throw)**

```ts
const primaryMuscleMap = params.primaryMuscleMap ?? {};

if (constraints?.focus === "recovery") {
  const requestedExerciseCount =
    constraints?.durationMinutes != null
      ? Math.min(8, Math.max(2, Math.round(constraints.durationMinutes / 12)))
      : DEFAULT_EXERCISE_COUNT_BY_FOCUS.recovery;
  const recoveryExercises = selectRecoveryExercises(
    baseExercises,
    requestedExerciseCount,
    constraints,
    primaryMuscleMap
  );
  if (recoveryExercises.length === 0) {
    throw new Error("No mobility or stability exercises match the constraints.");
  }
  const initialExercises = recoveryExercises.map(buildExerciseDraft);
  const startWorkoutPayload = {
    initialExercises,
    ownerUserId: userId,
    sessionFocus: "recovery" as SessionFocus,
  };
  const selectedExerciseNames = initialExercises.map((e) => e.exercise.name);
  const summary: GeneratedWorkoutSummary = {
    message: buildGeneratorMessage({
      selectedExercises: selectedExerciseNames,
      sessionFocus: "recovery",
      source: "recovery",
      targetedArchetypes: [],
    }),
    selectedExercises: selectedExerciseNames,
    sessionFocus: "recovery",
    source: "recovery",
    targetedArchetypes: [],
    volumeFocus: [],
  };
  return { summary, startWorkoutPayload };
}
```

(Adjust the plan body to destructure `constraints` before this block; `buildGeneratorMessage` params `activeProgram`/`nextSession` are already optional.)

- [ ] **Step 3: Apply the candidate filter to the strength pool**

Immediately after `exercisesWithArchetypes` is computed in `buildWorkoutPlan`:

```ts
const constrainedExercises = filterCandidateExercises(
  exercisesWithArchetypes,
  constraints ?? {},
  primaryMuscleMap
);
```

Use `constrainedExercises` everywhere `exercisesWithArchetypes` was used below that point (the `exerciseMap`, `avoidedExerciseIds` filter, and `selectExercisesForWorkout`'s `availableExercises`). Keep the existing "no archetype data" throw based on `exercisesWithArchetypes`, and add after filtering:

```ts
if (constrainedExercises.length === 0) {
  throw new Error("No exercises match the equipment/injury constraints.");
}
```

- [ ] **Step 4: Fetch the primary-muscle map in createWorkoutProposal and pass constraints through**

Extend the parsed constraints:

```ts
const constraints: WorkoutConstraints = parsedInput.success
  ? {
      focus: parsedInput.data.focus,
      durationMinutes: parsedInput.data.durationMinutes,
      targetArchetypes: parsedInput.data.targetArchetypes,
      avoidArchetypes: parsedInput.data.avoidArchetypes,
      availableEquipment: parsedInput.data.availableEquipment,
      avoidMuscles: parsedInput.data.avoidMuscles,
    }
  : {};
```

Add to the existing `Promise.all`:

```ts
queryClient.ensureQueryData({
  queryKey: ["exercisePrimaryMuscleMap"],
  queryFn: fetchGuidancePrimaryMuscleMap,
  staleTime: Infinity,
}),
```

and pass `primaryMuscleMap` into `buildWorkoutPlan`. Import `fetchGuidancePrimaryMuscleMap` from `@/domains/guidance/data/guidanceRepository` and the two candidate functions from `@/domains/guidance/data/workoutCandidates`.

- [ ] **Step 5: Build, run tests**

Run: `npm run build` then `npm test`
Expected: build success; all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/domains/guidance/hooks/useWorkoutGenerator.ts
git commit -m "feat(guidance): equipment/injury constraints and real recovery sessions in workout generator"
```

---

### Task 9: propose_workout schema + tool description

**Files:**
- Modify: `src/domains/guidance/agent/tools.ts:19-45,146-151`

**Interfaces:**
- Produces: `proposeWorkoutInputSchema` with `availableEquipment` and `avoidMuscles`; enums `equipmentNameInputSchema`, `muscleNameInputSchema` (exported for reuse).

- [ ] **Step 1: Add enums and extend the schema**

```ts
export const equipmentNameInputSchema = z.enum([
  "Barbell",
  "Bodyweight",
  "Cable",
  "Dumbbell",
  "Kettlebell",
  "Landmine",
  "Machine",
  "Pull-up Bar",
  "Swiss Ball",
]);

export const muscleNameInputSchema = z.enum([
  "Adductors",
  "Anterior Deltoid",
  "Biceps Brachii",
  "Calves",
  "Core",
  "Erector Spinae",
  "Glutes",
  "Grip/Forearms",
  "Hamstrings",
  "Hip Flexors",
  "Hip Rotators",
  "Lateral Deltoid",
  "Latissimus Dorsi",
  "Lower Trapezius",
  "Middle Trapezius",
  "Obliques",
  "Pectoralis Major",
  "Posterior Deltoid",
  "Quadriceps",
  "Rectus Abdominis",
  "Rhomboids",
  "Rotator Cuff",
  "Serratus Anterior",
  "Teres Major",
  "Transverse Abdominis",
  "Triceps Brachii",
  "Upper Trapezius",
]);

export const proposeWorkoutInputSchema = z.object({
  focus: sessionFocusInputSchema.nullish(),
  durationMinutes: z.number().int().min(10).max(180).nullish(),
  targetArchetypes: z.array(movementArchetypeInputSchema).nullish(),
  avoidArchetypes: z.array(movementArchetypeInputSchema).nullish(),
  availableEquipment: z.array(equipmentNameInputSchema).nullish(),
  avoidMuscles: z.array(muscleNameInputSchema).nullish(),
});
```

- [ ] **Step 2: Update the propose_workout description**

Replace the descriptor's `description` with:

```
Build a draft training session and render it as a reviewable draft (does NOT save; the user applies it). Pass any constraints the user states: `focus` (e.g. hypertrophy, strength, recovery — recovery builds a mobility/stability session), `durationMinutes` for time available, `targetArchetypes` to emphasize movement patterns, `avoidArchetypes` to skip whole patterns, `availableEquipment` when the user lacks a full gym (e.g. no gym at all -> ["Bodyweight"]; home setup -> what they own), and `avoidMuscles` for injuries — exercises whose PRIMARY muscles match are excluded while complementary/supporting work stays. Omit any field that wasn't stated; the draft still honors the user's program and weekly volume gaps.
```

- [ ] **Step 3: Build, test, commit**

Run: `npm run build` then `npm test` — Expected: pass.

```bash
git add src/domains/guidance/agent/tools.ts
git commit -m "feat(coach): equipment and injury constraints on propose_workout"
```

---

### Task 10: Catalog formatting groups NULL-archetype exercises by category (TDD)

**Files:**
- Modify: `src/domains/guidance/data/toolBuilders.ts:57-71` (`formatCatalogByArchetype`)
- Test: `src/domains/guidance/data/toolBuilders.test.ts`

**Interfaces:**
- Produces: `formatCatalogByArchetype` labels non-cardio NULL-archetype exercises as `Mobility` / `Stability` (capitalized category) instead of `Other`.

- [ ] **Step 1: Add failing test to toolBuilders.test.ts (follow the file's existing fixture style)**

```ts
it("groups archetype-less mobility and stability exercises by category", () => {
  const catalog: Exercise[] = [
    { id: "1", name: "Plank", exercise_type: "strength", exercise_category: "stability", archetype_id: null },
    { id: "2", name: "Pigeon Pose", exercise_type: "strength", exercise_category: "mobility", archetype_id: null },
  ];
  const formatted = formatCatalogByArchetype(catalog, new Map());
  expect(formatted).toContain("Mobility: Pigeon Pose");
  expect(formatted).toContain("Stability: Plank");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- toolBuilders`
Expected: FAIL — grouped under "Other".

- [ ] **Step 3: Implement**

```ts
const categoryLabel = (category?: string | null): string | null => {
  if (!category || category === "weights" || category === "calisthenics") {
    return null;
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
};

export const formatCatalogByArchetype = (
  catalog: Exercise[],
  archetypeMap: Map<string, string>
): string => {
  const grouped = new Map<string, string[]>();
  for (const exercise of strengthCatalog(catalog)) {
    const archetype =
      (exercise.archetype_id && archetypeMap.get(exercise.archetype_id)) ||
      categoryLabel(exercise.exercise_category) ||
      "Other";
    grouped.set(archetype, [...(grouped.get(archetype) ?? []), exercise.name]);
  }
  return Array.from(grouped.entries())
    .map(([archetype, names]) => `${archetype}: ${names.sort().join(", ")}`)
    .join("; ");
};
```

- [ ] **Step 4: Run tests, commit**

Run: `npm test -- toolBuilders` — Expected: PASS.

```bash
git add src/domains/guidance/data/toolBuilders.ts src/domains/guidance/data/toolBuilders.test.ts
git commit -m "feat(coach): catalog message groups mobility/stability by category"
```

---

### Task 11: Full verification + CODEMAP update

**Files:**
- Modify: `CODEMAP.md` (Backend and Data Contract + Domain Map guidance entries)

- [ ] **Step 1: Run the full verification suite sequentially**

Run: `npm run build` → success; `npm run lint` → 8 warnings, 0 errors; `npm test` → all pass.

- [ ] **Step 2: Update CODEMAP.md**

Add to "Recent feature areas visible in migrations": `exercise taxonomy v2: muscle roles (primary/secondary/stabilizer) on exercise_muscle_groups, exercises.compatible_equipment text[], get_exercise_primary_muscle_map RPC, ~70-movement global catalog incl. mobility/stability`. Add `data/workoutCandidates.ts` under the guidance domain data list with one line: `pure equipment/injury candidate filtering + recovery selection (workoutCandidates.test.ts)`. Update the `propose_workout` tool bullet to mention `availableEquipment`/`avoidMuscles`.

- [ ] **Step 3: Commit**

```bash
git add CODEMAP.md
git commit -m "docs: codemap for exercise taxonomy v2"
```

---

### Task 12: Rollout — apply migrations to the linked Supabase project and verify live

This task requires the Supabase MCP (`apply_migration`, `execute_sql`) on project `fhkhpwoxedcytetcjnob` — execute from the main session, not a subagent.

- [ ] **Step 1: Apply the 7 migrations in filename order via `apply_migration`** (names without timestamps: `add_muscle_role_to_exercise_muscle_groups`, `add_compatible_equipment_to_exercises`, `add_taxonomy_reference_rows`, `add_primary_muscle_map_rpc`, `fix_exercise_misclassifications`, `promote_and_backfill_global_catalog`, `seed_global_movement_catalog`).

- [ ] **Step 2: Rename local migration files to the MCP-recorded versions**

Query: `select version, name from supabase_migrations.schema_migrations order by version desc limit 10;` and rename each local file's timestamp prefix to match (CODEMAP convention; drift breaks `db push`).

- [ ] **Step 3: Live verification queries (expected values)**

```sql
-- ~70 global rows
select count(*) from exercises where created_by_user_id is null;
-- 0 rows: global weights/calisthenics without archetype
select count(*) from exercises where created_by_user_id is null
  and exercise_category in ('weights','calisthenics') and archetype_id is null;
-- 0 rows: global rows with empty compatible_equipment
select count(*) from exercises where created_by_user_id is null and compatible_equipment = '{}';
-- 0 rows: global non-cardio rows without a primary muscle
select count(*) from exercises e where e.created_by_user_id is null and e.exercise_type <> 'cardio'
  and not exists (select 1 from exercise_muscle_groups g where g.exercise_id = e.id and g.role = 'primary');
-- 13 mobility, 8 stability
select exercise_category, count(*) from exercises where created_by_user_id is null
  and exercise_category in ('mobility','stability') group by 1;
```

- [ ] **Step 4: Commit the renamed migration files**

```bash
git add -A supabase/migrations
git commit -m "chore(db): align migration versions with applied remote history"
```

---

### Task 13: Push branch and open draft PR

- [ ] **Step 1: Push**

```bash
git push -u origin exercise-taxonomy-v2
```

- [ ] **Step 2: Draft PR** via `gh pr create --draft` titled "Exercise taxonomy v2: muscle roles, equipment compatibility, recovery sessions, ~70-movement catalog" with a body summarizing spec, migrations, and coach changes.
