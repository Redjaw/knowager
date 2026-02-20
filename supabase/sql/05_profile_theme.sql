alter table public.profiles
add column if not exists theme text not null default 'light' check (theme in ('light', 'dark'));

update public.profiles
set theme = 'light'
where theme is null;
