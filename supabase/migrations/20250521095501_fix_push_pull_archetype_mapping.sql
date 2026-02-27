create or replace function fetch_weekly_archetype_sets_v2(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  base_archetype_name text,
  archetype_subtype_name text,
  total_sets integer
)
language sql
as $$
  select
    case
      when ma.name = 'Push_Horizontal' then 'Push'
      when ma.name = 'Push_Vertical' then 'Push'
      when ma.name = 'Pull_Horizontal' then 'Pull'
      when ma.name = 'Pull_Vertical' then 'Pull'
      else ma.name
    end as base_archetype_name,
    case
      when ma.name = 'Push_Horizontal' then 'horizontal'
      when ma.name = 'Push_Vertical' then 'vertical'
      when ma.name = 'Pull_Horizontal' then 'horizontal'
      when ma.name = 'Pull_Vertical' then 'vertical'
      else es.variation
    end as archetype_subtype_name,
    count(*) as total_sets
  from exercise_sets es
  join workout_exercises we on es.workout_exercise_id = we.id
  join workouts w on we.workout_id = w.id
  join exercises ex on we.exercise_id = ex.id
  join movement_archetypes ma on ex.archetype_id = ma.id
  where w.user_id = p_user_id
    and es.completed = true
    and w.created_at::date >= p_start_date
    and w.created_at::date <= p_end_date
  group by 1, 2
$$;;
