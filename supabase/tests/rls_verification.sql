-- RLS verification script (run in Supabase SQL editor as a privileged role)
-- Replace USER_A and USER_B with two real auth.users ids from your project.
--
-- Manual steps:
-- 1. Create two users (anonymous or email) via the app or Auth dashboard.
-- 2. Paste their UUIDs below.
-- 3. Run each section and confirm expected outcomes.

-- \set user_a '00000000-0000-0000-0000-0000000000a1'
-- \set user_b '00000000-0000-0000-0000-0000000000b2'

-- As service role, seed one check-in for each user (bypass RLS):
-- insert into daily_checkins (user_id, moods, energy_level, focus)
-- values
--   ('USER_A', array['Tired'], 4, 'Relaxation'),
--   ('USER_B', array['Hopeful'], 7, 'Gratitude');

-- Then, using the Supabase client as USER_A JWT:
-- select * from daily_checkins;  -- must return only USER_A rows
-- update daily_checkins set notes = 'hack' where user_id = 'USER_B'; -- must affect 0 rows
-- insert into daily_checkins (user_id, moods, energy_level, focus)
--   values ('USER_B', array['Sad'], 3, 'Sleep'); -- must fail

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'daily_checkins',
    'meditations',
    'listening_history',
    'user_preferences'
  )
order by tablename;

select
  pol.polname as policy_name,
  cls.relname as table_name,
  pol.polcmd as command
from pg_policy pol
join pg_class cls on cls.oid = pol.polrelid
join pg_namespace nsp on nsp.oid = cls.relnamespace
where nsp.nspname = 'public'
order by cls.relname, pol.polname;
