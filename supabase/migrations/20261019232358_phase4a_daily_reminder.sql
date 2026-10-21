-- Local clock time for one daily meditation reminder.
-- No time zone is stored. The device schedules this hour and minute in its current zone.
-- Existing rows keep notifications_enabled false, so reminders are not turned on by this change.

alter table public.user_preferences
  add column reminder_local_time time not null default '08:00:00';

alter table public.user_preferences
  add constraint user_preferences_reminder_local_time_whole_minute
  check (extract(second from reminder_local_time) = 0);

comment on column public.user_preferences.reminder_local_time is
  'Clock time for the daily reminder. The device applies this hour and minute in its current local time zone.';
