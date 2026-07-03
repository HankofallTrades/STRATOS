# Exercise Taxonomy v2 — Design

Date: 2026-07-03
Status: Draft for review
Scope: exercises catalog + taxonomy schema, data cleanup, global catalog expansion, Coach/generator wiring.

## Problem

The Coach can only plan by movement-archetype volume deficits. Three user scenarios fail today:

1. **Recovery focus** (stretching/yoga/stability): `recovery` session focus is normalized to `strength`; the `mobility` category has 0 exercises, `stability` has 1.
2. **No gym**: equipment is a single nullable free-text default; it is never consulted during exercise selection.
3. **Injury** (train complementary/supporting muscles): 38 of 50 exercises have no muscle mappings; the ones that exist are archetype-level copies, some wrong; there is no primary/secondary distinction.

Additionally the catalog itself is thin and inconsistent: only 20 global exercises (10 of them cardio machines); staples like Push-up, Lunge, and Overhead Press exist only as one user's private rows; several rows are misclassified.

## Core model (unchanged, now stated explicitly)

**One row per movement.** Equipment and variation are per-set logging dimensions (`exercise_sets.equipment_type`, `exercise_sets.variation`); `exercises.default_equipment_type` only pre-selects the logging picker. There are never separate rows for "Dumbbell Row" vs "Barbell Row".

Each classification dimension has exactly one job:

| Dimension | Job | Values |
|---|---|---|
| `exercise_type` | How sets are logged | `strength` (weight/reps; time if `is_static`) / `cardio` (time/distance) |
| `exercise_category` | Modality, drives recovery selection | `weights` / `calisthenics` / `cardio` / `mobility` / `stability` |
| `archetype_id` | Movement pattern, drives volume-deficit selection | 10 archetypes; **required for `weights`/`calisthenics`, NULL for `cardio`/`mobility`/`stability`** |
| muscles (+ new `role`) | What it trains, drives injury-aware selection | per-exercise mappings |
| `compatible_equipment` (new) | What it can be performed with (OR-semantics), drives no-gym selection | text[] of equipment names |
| `is_static` | Timed hold vs reps | boolean |

## Schema changes (two additive migrations)

1. `exercise_muscle_groups.role text NOT NULL DEFAULT 'primary' CHECK (role IN ('primary','secondary','stabilizer'))`.
2. `exercises.compatible_equipment text[] NOT NULL DEFAULT '{}'` — equipment names from `equipment_types` (by name, matching the existing convention used by `default_equipment_type` and `exercise_sets.equipment_type`). OR-semantics: the exercise can be performed with any one listed item. `{Bodyweight}` (or including it) means no equipment needed.

New `muscle_definitions` rows (no renames; existing archetype maps and analytics RPCs untouched): **Rotator Cuff, Adductors, Lateral Deltoid, Grip/Forearms**.

No changes to `exercise_type`, `exercise_category`, `default_equipment_type`, variations, or set logging.

## Data cleanup (existing rows)

Misclassification fixes:

| Exercise | Fix |
|---|---|
| Lateral Raise | archetype Pull_Vertical → Isolation; muscles: Lateral Deltoid (primary) |
| Boxing | exercise_type → cardio, archetype → NULL, is_static → false |
| Assault bike | exercise_type → cardio, archetype → NULL |
| Shoulder Ext. Rotation | replace wrong core-muscle list with Rotator Cuff (primary) |
| Pull-up | replace horizontal-pull muscle list with Lats (primary), Biceps + Lower Trap + Teres Major (secondary) |
| Face Pull | Posterior Deltoid (primary), Rotator Cuff + Middle Trap + Rhomboids (secondary) |
| Dip | add muscles: Pecs + Triceps (primary), Anterior Deltoid (secondary) |
| Dead Hang | archetype → Pull_Vertical; muscles: Grip/Forearms (primary), Lats (stabilizer) |
| Pulldown | archetype → Pull_Vertical |
| Superman's | archetype Pull_Horizontal → Bend |

Then, for every global exercise: complete muscle mappings with roles (2–5 per exercise, primary = prime movers only) and populate `compatible_equipment`. User-created rows get `compatible_equipment` backfilled from `default_equipment_type` where present; their muscle data is only fixed where clearly wrong (list above).

## Global catalog expansion (≈70 movements)

Promote these existing user rows to global (`created_by_user_id → NULL`, keeps ids/history): Push-up, Lunge, Split Squat, Overhead Press, Lateral Raise, Triceps Extension, Calf Raise, Glute Bridge, Back Extension, Leg Press, Leg Extension, Russian Twist, Wood Chop, Pec Fly, Reverse Fly, Pulldown, Dead Hang. Niche personal rows (QL Raise, Loaded Pigeon, Loaded Butterfly, Jefferson Curl, Man Maker, Lower abdominal activation, Superman's, Clean and Press, Landmine Twist, Reverse Hyperextension, Boxing, Assault bike) stay user-scoped.

New global movements (target state ≈ 70 global rows: 20 existing + 17 promoted + 33 new):

- **Bend**: Hip Thrust, Good Morning, Kettlebell Swing, Leg Curl*, Nordic Curl
- **Squat**: Goblet Squat is a Squat variation — no new rows beyond promotes; add Wall Sit under stability instead
- **Lunge**: Step-Up
- **Push_Horizontal**: (covered: Bench Press, Push-up, Dip, Pec Fly)
- **Push_Vertical**: Pike Push-up
- **Pull_Horizontal**: Inverted Row (`compatible_equipment` includes Bodyweight — sturdy table/low bar/rings all count as no added load; this is the archetype's bodyweight option now that Superman's moves to Bend)
- **Pull_Vertical**: (covered: Pull-up, Pulldown, Dead Hang)
- **Twist**: Bicycle Crunch
- **Gait**: Farmer's Carry, Sled Push, Bear Crawl (bodyweight — without a Bear Crawl, Gait would have no equipment-free option since Farmer's Carry/Sled Push both need load)
- **Isolation**: no new rows — Trap Raise already covers upper traps (Shrug would duplicate it); Hammer Curl is a Bicep Curl variation, not a row
- **Mobility (~13, archetype NULL, mostly is_static)**: Downward Dog, Cat-Cow, Child's Pose, Cobra, Pigeon Pose, Couch Stretch, Hamstring Stretch, Hip Flexor Stretch, World's Greatest Stretch, Deep Squat Hold, Thoracic Rotation, Shoulder Dislocates, 90/90 Hip Switch
- **Stability (~8, archetype NULL)**: Plank, Side Plank, Bird Dog, Dead Bug, Pallof Press, Copenhagen Plank, Single-Leg Balance, Wall Sit

\* Leg Curl is Isolation by current convention (machine knee flexion) — classify Isolation, muscles Hamstrings primary.

Every archetype ends up with at least one movement whose `compatible_equipment` includes Bodyweight (Squat and Lunge include it alongside their default equipment, since air-squat/bodyweight-lunge variants are standard; Calf Raise likewise for Isolation). Every new row ships with: category, archetype (or NULL per the rule), muscles + roles, compatible_equipment, default_equipment_type, is_static, and a `Standard` variation.

## Coach / generator wiring

`proposeWorkoutInputSchema` gains:

- `availableEquipment: string[] | null` — keep exercises where `compatible_equipment ∩ availableEquipment ≠ ∅`. "No gym" = `["Bodyweight"]`. Null = no filter.
- `avoidMuscles: string[] | null` — exclude exercises where any listed muscle is mapped with role `primary`. Secondary/stabilizer involvement is allowed (this is the "complementary muscles" behavior).

`buildWorkoutPlan` (`useWorkoutGenerator.ts`):

- Applies both filters to the candidate pool before deficit selection (needs the muscle-group mapping, already fetchable via `fetchExerciseMuscleGroupMappings`).
- `focus: "recovery"` stops normalizing to `strength`: it selects from `mobility`/`stability` categories (which bypass the archetype pipeline), count from the existing `DEFAULT_EXERCISE_COUNT_BY_FOCUS.recovery`.

`agent/tools.ts` tool description updated so the model knows the new constraints exist. `formatCatalogByArchetype` groups NULL-archetype exercises under their category (Mobility/Stability/Cardio) instead of "Other".

Hand-maintained `src/lib/integrations/supabase/types.ts` and the `Exercise` type get the new columns.

## Testing

- Vitest unit tests for the new candidate filtering (equipment intersection, primary-muscle avoidance) and the recovery-focus selection path, following the existing pure-seam test pattern.
- Existing suites must stay green; `npm run build` then `npm run lint` sequentially per repo rules.

## Rollout

1. PR with code + migration files + catalog data migrations (schema and global-catalog data are both migrations for reproducibility).
2. Apply via Supabase MCP `apply_migration`, then rename local migration files to the MCP-recorded versions (per CODEMAP convention, this is what previously broke `db push`).
3. Verify live: counts per category/archetype, no NULL-archetype weights/calisthenics rows, all global rows have ≥1 primary muscle and non-empty compatible_equipment.

## Non-goals

- No progression/regression or alternative-for relations, difficulty tiers, contraindication tables (Approach C material).
- No muscle renames or analytics RPC changes.
- No changes to set logging, variations, mesocycle templates, or the volume-deficit algorithm itself.
