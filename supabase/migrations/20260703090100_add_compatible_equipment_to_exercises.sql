-- OR-semantics: the movement can be performed with any one listed equipment
-- name. Empty array = unknown (filters treat unknown as allowed).
ALTER TABLE public.exercises
  ADD COLUMN compatible_equipment text[] NOT NULL DEFAULT '{}';
