-- Phase 3A: a validated script is saved before any audio exists.
-- `ready` stays reserved for a meditation that has playable audio.

do $$
begin
  if exists (
    select 1
    from public.meditations
    group by checkin_id
    having count(*) > 1
  ) then
    raise exception 'duplicate meditations.checkin_id rows must be resolved before this migration';
  end if;
end $$;

alter table public.meditations
  drop constraint meditations_status_valid;

alter table public.meditations
  add constraint meditations_status_valid
  check (
    status in (
      'pending',
      'generating_script',
      'script_ready',
      'generating_audio',
      'processing_audio',
      'ready',
      'failed'
    )
  );

-- One generation row per check-in. A failed attempt is retried on that same row.
create unique index meditations_checkin_id_unique
  on public.meditations (checkin_id);

-- updated_at marks when a generation claim started, so a second request
-- can see an in-flight row without using created_at.
alter table public.meditations
  add column updated_at timestamptz not null default now();

alter table public.meditations
  add column generation_attempts integer not null default 0;

alter table public.meditations
  add constraint meditations_generation_attempts_nonnegative
  check (generation_attempts >= 0);

create trigger meditations_set_updated_at
  before update on public.meditations
  for each row execute function public.set_updated_at();

-- `ready` is playable audio. Measured length has to land in the 5-minute window.
create or replace function public.prevent_ready_without_audio()
returns trigger
language plpgsql
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

  return new;
end;
$$;

create trigger meditations_prevent_ready_without_audio
  before insert or update on public.meditations
  for each row execute function public.prevent_ready_without_audio();
