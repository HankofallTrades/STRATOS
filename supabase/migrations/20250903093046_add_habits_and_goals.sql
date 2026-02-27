-- Habits & Goals schema (per PRD)
-- id columns use uuid; user_id references public.profiles(id)

create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits(user_id);
create index if not exists habits_user_active_idx on public.habits(user_id, is_active);

alter table public.habits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habits' and policyname = 'habits_select_own'
  ) then
    create policy habits_select_own on public.habits
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habits' and policyname = 'habits_insert_own'
  ) then
    create policy habits_insert_own on public.habits
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habits' and policyname = 'habits_update_own'
  ) then
    create policy habits_update_own on public.habits
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habits' and policyname = 'habits_delete_own'
  ) then
    create policy habits_delete_own on public.habits
      for delete using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

create index if not exists habit_completions_user_date_idx on public.habit_completions(user_id, date desc);
create index if not exists habit_completions_habit_date_idx on public.habit_completions(habit_id, date desc);

alter table public.habit_completions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habit_completions' and policyname = 'habit_completions_select_own'
  ) then
    create policy habit_completions_select_own on public.habit_completions
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habit_completions' and policyname = 'habit_completions_insert_own'
  ) then
    create policy habit_completions_insert_own on public.habit_completions
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habit_completions' and policyname = 'habit_completions_update_own'
  ) then
    create policy habit_completions_update_own on public.habit_completions
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'habit_completions' and policyname = 'habit_completions_delete_own'
  ) then
    create policy habit_completions_delete_own on public.habit_completions
      for delete using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_user_active_idx on public.goals(user_id, is_active);

alter table public.goals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals_select_own'
  ) then
    create policy goals_select_own on public.goals
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals_insert_own'
  ) then
    create policy goals_insert_own on public.goals
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals_update_own'
  ) then
    create policy goals_update_own on public.goals
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'goals_delete_own'
  ) then
    create policy goals_delete_own on public.goals
      for delete using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.goal_reflections (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, week_start_date)
);

create index if not exists goal_reflections_user_week_idx on public.goal_reflections(user_id, week_start_date desc);

alter table public.goal_reflections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_reflections' and policyname = 'goal_reflections_select_own'
  ) then
    create policy goal_reflections_select_own on public.goal_reflections
      for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_reflections' and policyname = 'goal_reflections_insert_own'
  ) then
    create policy goal_reflections_insert_own on public.goal_reflections
      for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_reflections' and policyname = 'goal_reflections_update_own'
  ) then
    create policy goal_reflections_update_own on public.goal_reflections
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'goal_reflections' and policyname = 'goal_reflections_delete_own'
  ) then
    create policy goal_reflections_delete_own on public.goal_reflections
      for delete using (user_id = auth.uid());
  end if;
end $$;;
