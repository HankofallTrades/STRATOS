-- Periodization foundation: mesocycles + protocol session templates + workout linkage.

create extension if not exists pgcrypto;

create table if not exists public.mesocycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  goal_focus text not null check (goal_focus in ('strength','hypertrophy','zone2','zone5','speed','recovery','mixed')),
  protocol text not null check (protocol in ('occams','custom')),
  start_date date not null,
  duration_weeks integer not null check (duration_weeks between 4 and 12),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mesocycles_user_id_idx on public.mesocycles(user_id);
create index if not exists mesocycles_user_status_idx on public.mesocycles(user_id, status);
create unique index if not exists mesocycles_single_active_per_user_idx
  on public.mesocycles(user_id)
  where status = 'active';

create table if not exists public.mesocycle_sessions (
  id uuid primary key default gen_random_uuid(),
  mesocycle_id uuid not null references public.mesocycles(id) on delete cascade,
  name text not null,
  session_order integer not null check (session_order >= 1),
  session_focus text check (session_focus in ('strength','hypertrophy','zone2','zone5','speed','recovery','mixed')),
  sets_per_exercise integer check (sets_per_exercise >= 1),
  rep_range text,
  progression_rule text,
  created_at timestamptz not null default now(),
  unique (mesocycle_id, session_order)
);

create index if not exists mesocycle_sessions_mesocycle_id_idx on public.mesocycle_sessions(mesocycle_id);

create table if not exists public.mesocycle_session_exercises (
  id uuid primary key default gen_random_uuid(),
  mesocycle_session_id uuid not null references public.mesocycle_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_order integer not null check (exercise_order >= 1),
  target_sets integer check (target_sets >= 1),
  target_reps text,
  load_increment_kg numeric(6, 2) check (load_increment_kg >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (mesocycle_session_id, exercise_order)
);

create index if not exists mesocycle_session_exercises_session_id_idx
  on public.mesocycle_session_exercises(mesocycle_session_id);

alter table public.workouts
  add column if not exists mesocycle_id uuid references public.mesocycles(id) on delete set null,
  add column if not exists mesocycle_session_id uuid references public.mesocycle_sessions(id) on delete set null,
  add column if not exists mesocycle_week integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workouts_mesocycle_week_check'
  ) then
    alter table public.workouts
      add constraint workouts_mesocycle_week_check
      check (mesocycle_week is null or mesocycle_week >= 1);
  end if;
end $$;

create index if not exists workouts_user_mesocycle_idx on public.workouts(user_id, mesocycle_id);

alter table public.mesocycles enable row level security;
alter table public.mesocycle_sessions enable row level security;
alter table public.mesocycle_session_exercises enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycles' and policyname = 'mesocycles_select_own'
  ) then
    create policy mesocycles_select_own on public.mesocycles
      for select using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycles' and policyname = 'mesocycles_insert_own'
  ) then
    create policy mesocycles_insert_own on public.mesocycles
      for insert with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycles' and policyname = 'mesocycles_update_own'
  ) then
    create policy mesocycles_update_own on public.mesocycles
      for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycles' and policyname = 'mesocycles_delete_own'
  ) then
    create policy mesocycles_delete_own on public.mesocycles
      for delete using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_sessions' and policyname = 'mesocycle_sessions_select_own'
  ) then
    create policy mesocycle_sessions_select_own on public.mesocycle_sessions
      for select using (
        exists (
          select 1
          from public.mesocycles m
          where m.id = mesocycle_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_sessions' and policyname = 'mesocycle_sessions_insert_own'
  ) then
    create policy mesocycle_sessions_insert_own on public.mesocycle_sessions
      for insert with check (
        exists (
          select 1
          from public.mesocycles m
          where m.id = mesocycle_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_sessions' and policyname = 'mesocycle_sessions_update_own'
  ) then
    create policy mesocycle_sessions_update_own on public.mesocycle_sessions
      for update using (
        exists (
          select 1
          from public.mesocycles m
          where m.id = mesocycle_id and m.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1
          from public.mesocycles m
          where m.id = mesocycle_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_sessions' and policyname = 'mesocycle_sessions_delete_own'
  ) then
    create policy mesocycle_sessions_delete_own on public.mesocycle_sessions
      for delete using (
        exists (
          select 1
          from public.mesocycles m
          where m.id = mesocycle_id and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_session_exercises' and policyname = 'mesocycle_session_exercises_select_own'
  ) then
    create policy mesocycle_session_exercises_select_own on public.mesocycle_session_exercises
      for select using (
        exists (
          select 1
          from public.mesocycle_sessions s
          join public.mesocycles m on m.id = s.mesocycle_id
          where s.id = mesocycle_session_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_session_exercises' and policyname = 'mesocycle_session_exercises_insert_own'
  ) then
    create policy mesocycle_session_exercises_insert_own on public.mesocycle_session_exercises
      for insert with check (
        exists (
          select 1
          from public.mesocycle_sessions s
          join public.mesocycles m on m.id = s.mesocycle_id
          where s.id = mesocycle_session_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_session_exercises' and policyname = 'mesocycle_session_exercises_update_own'
  ) then
    create policy mesocycle_session_exercises_update_own on public.mesocycle_session_exercises
      for update using (
        exists (
          select 1
          from public.mesocycle_sessions s
          join public.mesocycles m on m.id = s.mesocycle_id
          where s.id = mesocycle_session_id and m.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1
          from public.mesocycle_sessions s
          join public.mesocycles m on m.id = s.mesocycle_id
          where s.id = mesocycle_session_id and m.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'mesocycle_session_exercises' and policyname = 'mesocycle_session_exercises_delete_own'
  ) then
    create policy mesocycle_session_exercises_delete_own on public.mesocycle_session_exercises
      for delete using (
        exists (
          select 1
          from public.mesocycle_sessions s
          join public.mesocycles m on m.id = s.mesocycle_id
          where s.id = mesocycle_session_id and m.user_id = auth.uid()
        )
      );
  end if;
end $$;
