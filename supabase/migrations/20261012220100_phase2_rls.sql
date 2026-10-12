-- Row Level Security for user-owned tables
-- Anonymous Supabase users are authenticated (role = authenticated).

alter table public.profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.meditations enable row level security;
alter table public.listening_history enable row level security;
alter table public.user_preferences enable row level security;

-- No public policies. Authenticated users only access their own rows.

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- daily_checkins
create policy "daily_checkins_select_own"
  on public.daily_checkins for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_checkins_insert_own"
  on public.daily_checkins for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "daily_checkins_update_own"
  on public.daily_checkins for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_checkins_delete_own"
  on public.daily_checkins for delete
  to authenticated
  using (auth.uid() = user_id);

-- meditations
create policy "meditations_select_own"
  on public.meditations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "meditations_insert_own"
  on public.meditations for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.daily_checkins c
      where c.id = checkin_id
        and c.user_id = auth.uid()
    )
  );

create policy "meditations_update_own"
  on public.meditations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.daily_checkins c
      where c.id = checkin_id
        and c.user_id = auth.uid()
    )
  );

create policy "meditations_delete_own"
  on public.meditations for delete
  to authenticated
  using (auth.uid() = user_id);

-- listening_history
create policy "listening_history_select_own"
  on public.listening_history for select
  to authenticated
  using (auth.uid() = user_id);

create policy "listening_history_insert_own"
  on public.listening_history for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.meditations m
      where m.id = meditation_id
        and m.user_id = auth.uid()
    )
  );

create policy "listening_history_update_own"
  on public.listening_history for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.meditations m
      where m.id = meditation_id
        and m.user_id = auth.uid()
    )
  );

create policy "listening_history_delete_own"
  on public.listening_history for delete
  to authenticated
  using (auth.uid() = user_id);

-- user_preferences
create policy "user_preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences_delete_own"
  on public.user_preferences for delete
  to authenticated
  using (auth.uid() = user_id);
