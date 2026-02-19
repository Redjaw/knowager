create or replace function public.can_request_magic_link(request_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    where lower(ae.email) = lower(request_email)
  );
$$;

revoke all on function public.can_request_magic_link(text) from public;
grant execute on function public.can_request_magic_link(text) to anon;
grant execute on function public.can_request_magic_link(text) to authenticated;
