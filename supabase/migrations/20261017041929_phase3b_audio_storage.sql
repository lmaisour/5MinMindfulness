-- Phase 3B: private meditation audio, attempt accounting, and cost logs.
-- Ready still requires a stored file whose measured length is 285–315 seconds.

alter table public.meditations
  add column audio_attempts integer not null default 0;

alter table public.meditations
  add constraint meditations_audio_attempts_nonnegative
  check (audio_attempts >= 0);

alter table public.meditations
  add column audio_attempted_at timestamptz;

-- Set while one request is calling ElevenLabs. Cleared between segments so the next request can continue.
alter table public.meditations
  add column audio_lock_until timestamptz;

-- Segment paths and voice settings only. Never store journal notes here.
alter table public.meditations
  add column audio_manifest jsonb;

create or replace function public.prevent_ready_without_audio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'ready'
     and (
       new.audio_storage_path is null
       or new.actual_duration_seconds is null
       or new.actual_duration_seconds < 285
       or new.actual_duration_seconds > 315
     ) then
    raise exception 'status ready requires measured audio between 285 and 315 seconds';
  end if;

  if tg_op = 'UPDATE' and new.generation_attempts < old.generation_attempts then
    raise exception 'generation attempts cannot decrease';
  end if;

  if tg_op = 'UPDATE' and new.audio_attempts < old.audio_attempts then
    raise exception 'audio attempts cannot decrease';
  end if;

  return new;
end;
$$;

-- One row per ElevenLabs attempt, segment, or failure. No script text and no notes.
create table public.audio_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meditation_id uuid references public.meditations (id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  characters integer,
  duration_seconds integer,
  estimated_cost_usd numeric(10, 4),
  error_code text,
  constraint audio_generation_events_type_valid
    check (event_type in ('started', 'segment', 'assembled', 'failed')),
  constraint audio_generation_events_characters_nonnegative
    check (characters is null or characters >= 0),
  constraint audio_generation_events_duration_nonnegative
    check (duration_seconds is null or duration_seconds >= 0),
  constraint audio_generation_events_cost_nonnegative
    check (estimated_cost_usd is null or estimated_cost_usd >= 0)
);

create index audio_generation_events_user_created_idx
  on public.audio_generation_events (user_id, created_at desc);

alter table public.audio_generation_events enable row level security;

revoke all on public.audio_generation_events from anon;

grant select, insert on public.audio_generation_events to authenticated;

create policy "audio_generation_events_select_own"
  on public.audio_generation_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "audio_generation_events_insert_own"
  on public.audio_generation_events for insert
  to authenticated
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meditation-audio',
  'meditation-audio',
  false,
  26214400,
  array['audio/wav', 'audio/x-wav', 'audio/wave']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects live at {user_id}/{meditation_id}.wav and {user_id}/{meditation_id}/segments/{n}.wav.
create policy "meditation_audio_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'meditation-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "meditation_audio_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'meditation-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "meditation_audio_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'meditation-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'meditation-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "meditation_audio_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'meditation-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
