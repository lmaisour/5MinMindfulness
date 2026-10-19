// Pure daily-reminder rules. This file does not import Expo or schedule anything.

export const DAILY_REMINDER_ID = 'daily-meditation-reminder';
export const DAILY_REMINDER_KIND = 'daily-reminder';
export const HOME_ROUTE = '/(tabs)';
export const REMINDER_TITLE = 'A quiet moment';
export const REMINDER_BODY = 'Your five minutes are here, whenever you are ready.';
export const SETTINGS_INSTRUCTIONS =
  'Notifications are off for 5MinMindfulness. Open Settings, tap Notifications, choose 5MinMindfulness, and turn Allow Notifications on.';

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface ReminderPreference {
  enabled: boolean;
  time: ReminderTime;
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 8, minute: 0 };

export const DEFAULT_REMINDER_PREFERENCE: ReminderPreference = {
  enabled: false,
  time: DEFAULT_REMINDER_TIME,
};

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export type ReminderSyncAction = 'schedule' | 'cancel' | 'prompt' | 'needs-permission' | 'show-settings';

export function parseReminderTime(value: string | null | undefined): ReminderTime {
  if (!value) return DEFAULT_REMINDER_TIME;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) return DEFAULT_REMINDER_TIME;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] == null ? 0 : Number(match[3]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) {
    return DEFAULT_REMINDER_TIME;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second !== 0) {
    return DEFAULT_REMINDER_TIME;
  }
  return { hour, minute };
}

export function reminderTimeToSql(time: ReminderTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`;
}

export function formatReminderTime(time: ReminderTime, locales: Intl.LocalesArgument = undefined): string {
  const date = new Date(2026, 0, 1, time.hour, time.minute, 0, 0);
  return new Intl.DateTimeFormat(locales, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function reminderTimeFromDate(date: Date): ReminderTime {
  return parseReminderTime(`${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`);
}

/** Daily trigger in the device's current local zone. A time zone is intentionally omitted. */
export function dailyReminderTrigger(time: ReminderTime): { type: 'daily'; hour: number; minute: number } {
  return { type: 'daily', hour: time.hour, minute: time.minute };
}

export function reminderContent(): {
  title: string;
  body: string;
  sound: boolean;
  data: { kind: typeof DAILY_REMINDER_KIND; url: typeof HOME_ROUTE };
} {
  return {
    title: REMINDER_TITLE,
    body: REMINDER_BODY,
    sound: true,
    data: { kind: DAILY_REMINDER_KIND, url: HOME_ROUTE },
  };
}

export function reminderRequest(time: ReminderTime) {
  return {
    identifier: DAILY_REMINDER_ID,
    content: reminderContent(),
    trigger: dailyReminderTrigger(time),
  };
}

export function homeRouteFromNotification(data: unknown): typeof HOME_ROUTE | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.kind === DAILY_REMINDER_KIND) return HOME_ROUTE;
  return null;
}

export function reminderIdentifiersToCancel(
  scheduled: Array<{ identifier: string; data?: unknown }>,
): string[] {
  const ids = scheduled
    .filter(
      (item) => item.identifier === DAILY_REMINDER_ID || homeRouteFromNotification(item.data) != null,
    )
    .map((item) => item.identifier);
  return [...new Set(ids)];
}

export function reminderSyncAction(input: {
  enabled: boolean;
  permission: NotificationPermission;
  userRequestedEnable: boolean;
}): ReminderSyncAction {
  if (!input.enabled) return 'cancel';
  if (input.permission === 'granted') return 'schedule';
  if (input.permission === 'denied') return 'show-settings';
  if (input.userRequestedEnable) return 'prompt';
  return 'needs-permission';
}

/** A denied or dismissed prompt must not be stored as an enabled reminder. */
export function enabledAfterUserRequest(action: ReminderSyncAction): boolean {
  return action === 'schedule';
}

export function resolveReminderPreference(
  remote: ReminderPreference | null,
  local: ReminderPreference | null,
): ReminderPreference {
  return remote ?? local ?? DEFAULT_REMINDER_PREFERENCE;
}

export function serializeReminderPreference(preference: ReminderPreference): string {
  return JSON.stringify({
    enabled: preference.enabled,
    hour: preference.time.hour,
    minute: preference.time.minute,
  });
}

export function parseStoredReminderPreference(raw: string | null | undefined): ReminderPreference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { enabled?: unknown; hour?: unknown; minute?: unknown };
    if (typeof parsed.enabled !== 'boolean') return null;
    if (typeof parsed.hour !== 'number' || typeof parsed.minute !== 'number') return null;
    return {
      enabled: parsed.enabled,
      time: parseReminderTime(`${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`),
    };
  } catch {
    return null;
  }
}
