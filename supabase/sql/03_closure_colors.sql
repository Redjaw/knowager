alter table public.closures
add column if not exists color text not null default 'gray';

alter table public.closures
drop constraint if exists closures_color_check;

alter table public.closures
add constraint closures_color_check check (color in ('gray', 'yellow', 'red'));
