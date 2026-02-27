alter table public.mesocycle_session_exercises
  add column if not exists target_equipment_type text,
  add column if not exists target_variation text;
