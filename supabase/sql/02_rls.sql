alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.closures enable row level security;
alter table public.app_config enable row level security;
alter table public.day_selections enable row level security;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    where ae.email = auth.jwt() ->> 'email'
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    where ae.email = auth.jwt() ->> 'email'
      and ae.is_admin = true
  );
$$;

revoke all on function public.is_allowed_user() from public;
revoke all on function public.is_admin_user() from public;
grant execute on function public.is_allowed_user() to authenticated;
grant execute on function public.is_admin_user() to authenticated;

drop policy if exists "allowed_emails select self" on public.allowed_emails;
create policy "allowed_emails select self"
on public.allowed_emails
for select
to authenticated
using (email = auth.jwt() ->> 'email');

drop policy if exists "profiles owner select" on public.profiles;
create policy "profiles owner select"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles owner upsert" on public.profiles;
create policy "profiles owner upsert"
on public.profiles
for all
to authenticated
using (id = auth.uid() and public.is_allowed_user())
with check (id = auth.uid() and public.is_allowed_user());

grant select on public.profiles_public to authenticated;

drop policy if exists "profiles_public whitelist read" on public.profiles;
create policy "profiles_public whitelist read"
on public.profiles
for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "day_selections whitelist read" on public.day_selections;
create policy "day_selections whitelist read"
on public.day_selections
for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "day_selections own insert" on public.day_selections;
create policy "day_selections own insert"
on public.day_selections
for insert
to authenticated
with check (public.is_allowed_user() and user_id = auth.uid());

drop policy if exists "day_selections own delete" on public.day_selections;
create policy "day_selections own delete"
on public.day_selections
for delete
to authenticated
using (public.is_allowed_user() and user_id = auth.uid());

drop policy if exists "closures whitelist read" on public.closures;
create policy "closures whitelist read"
on public.closures
for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "closures admin write" on public.closures;
create policy "closures admin write"
on public.closures
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "app_config whitelist read" on public.app_config;
create policy "app_config whitelist read"
on public.app_config
for select
to authenticated
using (public.is_allowed_user());

drop policy if exists "app_config admin write" on public.app_config;
create policy "app_config admin write"
on public.app_config
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
