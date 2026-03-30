create extension if not exists pgcrypto;

create table if not exists public.user_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'openai', 'anthropic', 'google')),
  encrypted_api_key text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  key_last_four text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists user_provider_credentials_user_id_idx
  on public.user_provider_credentials(user_id);

create index if not exists user_provider_credentials_user_provider_idx
  on public.user_provider_credentials(user_id, provider);

alter table public.user_provider_credentials enable row level security;

create or replace function public.handle_user_provider_credentials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_user_provider_credentials_updated on public.user_provider_credentials;

create trigger on_user_provider_credentials_updated
before update on public.user_provider_credentials
for each row
execute function public.handle_user_provider_credentials_updated_at();

comment on table public.user_provider_credentials is
  'Encrypted hosted-provider API keys for Coach. Access is server-side only.';
