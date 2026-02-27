alter table public.mesocycle_session_exercises
  drop column if exists target_equipment_type,
  drop column if exists target_variation;
