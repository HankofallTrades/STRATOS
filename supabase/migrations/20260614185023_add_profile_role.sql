-- Adds a coarse access role to profiles so dev/admin-only features (e.g. the
-- Coach dev tools) can be gated on the server-controlled role rather than a
-- client flag. A trigger prevents app users from self-granting a role.

alter table public.profiles
  add column role text not null default 'user'
  check (role in ('user','developer','admin'));

-- Block app users (PostgREST 'authenticated') from changing their own role.
-- Privileged connections (dashboard/service_role) can still set it.
create or replace function public.profiles_guard_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and current_user = 'authenticated' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();
