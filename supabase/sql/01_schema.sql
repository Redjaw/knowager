create table if not exists public.allowed_emails (
  email text primary key,
  is_admin boolean not null default false
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  birth_date date,
  avatar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.closures (
  day date primary key,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.day_selections (
  day date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (day, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists app_config_set_updated_at on public.app_config;
create trigger app_config_set_updated_at
before update on public.app_config
for each row
execute procedure public.set_updated_at();

create or replace view public.profiles_public as
select id, first_name, last_name, avatar_id
from public.profiles;
