-- Harden Phase 2 trigger functions without changing table access.
-- Anonymous sign-ins use the authenticated role, so own-row policies stay as they are.

alter function public.set_updated_at() set search_path = public;
alter function public.enforce_meditation_checkin_ownership() set search_path = public;
alter function public.enforce_listening_meditation_ownership() set search_path = public;

-- handle_new_user is security definer and must only run from the auth.users trigger.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
