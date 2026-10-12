-- 5MinMindfulness Phase 2 schema
-- Target meditation duration: 300 seconds

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_checkins
-- ---------------------------------------------------------------------------
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  moods text[] not null default '{}',
  energy_level integer not null,
  focus text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint daily_checkins_energy_level_range
    check (energy_level between 1 and 10),
  constraint daily_checkins_moods_not_empty
    check (cardinality(moods) >= 1),
  constraint daily_checkins_focus_valid
    check (
      focus in (
        'Relaxation',
        'Stress Relief',
        'Gratitude',
        'Motivation',
        'Sleep',
        'Mindfulness'
      )
    )
);

create index daily_checkins_user_id_created_at_idx
  on public.daily_checkins (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- meditations
-- ---------------------------------------------------------------------------
create table public.meditations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_id uuid not null references public.daily_checkins (id) on delete cascade,
  title text,
  script_json jsonb,
  audio_storage_path text,
  target_duration_seconds integer not null default 300,
  actual_duration_seconds integer,
  status text not null default 'pending',
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint meditations_status_valid
    check (
      status in (
        'pending',
        'generating_script',
        'generating_audio',
        'processing_audio',
        'ready',
        'failed'
      )
    ),
  constraint meditations_target_duration_positive
    check (target_duration_seconds > 0)
);

create index meditations_user_id_created_at_idx
  on public.meditations (user_id, created_at desc);

create index meditations_user_id_status_idx
  on public.meditations (user_id, status);

-- ---------------------------------------------------------------------------
-- listening_history
-- ---------------------------------------------------------------------------
create table public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meditation_id uuid not null references public.meditations (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  listened_seconds integer not null default 0,
  constraint listening_history_listened_seconds_nonnegative
    check (listened_seconds >= 0)
);

create index listening_history_user_id_started_at_idx
  on public.listening_history (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  preferred_voice text,
  personalization_enabled boolean not null default true,
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_preferences_user_id_idx
  on public.user_preferences (user_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-provision profile + preferences for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ownership helpers: meditation must belong to same user as check-in
-- ---------------------------------------------------------------------------
create or replace function public.enforce_meditation_checkin_ownership()
returns trigger
language plpgsql
as $$
declare
  checkin_owner uuid;
begin
  select user_id into checkin_owner
  from public.daily_checkins
  where id = new.checkin_id;

  if checkin_owner is null then
    raise exception 'check-in not found';
  end if;

  if checkin_owner <> new.user_id then
    raise exception 'meditation user_id must match check-in owner';
  end if;

  return new;
end;
$$;

create trigger meditations_enforce_checkin_ownership
  before insert or update on public.meditations
  for each row execute function public.enforce_meditation_checkin_ownership();

create or replace function public.enforce_listening_meditation_ownership()
returns trigger
language plpgsql
as $$
declare
  meditation_owner uuid;
begin
  select user_id into meditation_owner
  from public.meditations
  where id = new.meditation_id;

  if meditation_owner is null then
    raise exception 'meditation not found';
  end if;

  if meditation_owner <> new.user_id then
    raise exception 'listening history user_id must match meditation owner';
  end if;

  return new;
end;
$$;

create trigger listening_history_enforce_meditation_ownership
  before insert or update on public.listening_history
  for each row execute function public.enforce_listening_meditation_ownership();
