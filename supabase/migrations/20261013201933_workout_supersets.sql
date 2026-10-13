-- Pair identity is local to a workout; existing ownership RLS still applies.
alter table public.workout_exercises add column superset_id uuid;

create index workout_exercises_superset_idx
    on public.workout_exercises (workout_id, superset_id)
    where superset_id is not null;
