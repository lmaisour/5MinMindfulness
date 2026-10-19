/**
 * Pure checks for the daily reminder. No notification permission prompts and no native scheduling.
 * Run: node --experimental-strip-types scripts/validate-reminders.mjs
 */
const plan = await import('../src/services/reminderPlan.ts');

const {
  DAILY_REMINDER_ID,
  DEFAULT_REMINDER_PREFERENCE,
  SETTINGS_INSTRUCTIONS,
  dailyReminderTrigger,
  enabledAfterUserRequest,
  formatReminderTime,
  homeRouteFromNotification,
  parseReminderTime,
  parseStoredReminderPreference,
  reminderIdentifiersToCancel,
  reminderRequest,
  reminderSyncAction,
  reminderTimeToSql,
  resolveReminderPreference,
  serializeReminderPreference,
} = plan;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(DEFAULT_REMINDER_PREFERENCE.enabled === false, 'reminders start off');
assert(DEFAULT_REMINDER_PREFERENCE.time.hour === 8 && DEFAULT_REMINDER_PREFERENCE.time.minute === 0, 'default time is 8:00');
assert(reminderTimeToSql(parseReminderTime(null)) === '08:00:00', 'a missing time is 8:00 AM');
assert(formatReminderTime({ hour: 8, minute: 0 }, 'en-US') === '8:00 AM', '8:00 AM is shown in the profile');
assert(formatReminderTime({ hour: 19, minute: 5 }, 'en-US') === '7:05 PM', 'evening times stay on a 12-hour clock');

const eight = dailyReminderTrigger({ hour: 8, minute: 0 });
assert(JSON.stringify(Object.keys(eight)) === JSON.stringify(['type', 'hour', 'minute']), 'the trigger has no time zone');
assert(eight.type === 'daily' && eight.hour === 8 && eight.minute === 0, 'the trigger repeats daily at the local clock time');

const first = reminderRequest({ hour: 8, minute: 0 });
const second = reminderRequest({ hour: 7, minute: 30 });
assert(first.identifier === DAILY_REMINDER_ID && second.identifier === DAILY_REMINDER_ID, 'a time change keeps the same notification id');
assert(first.content.title === 'A quiet moment', 'the notification title is calm');
assert(!first.content.body.includes('!'), 'the notification body stays quiet');
assert(homeRouteFromNotification(first.content.data) === '/(tabs)', 'tapping the reminder opens Home');
assert(homeRouteFromNotification({ url: '/player/secret' }) === null, 'other notification data does not navigate');

assert(
  reminderSyncAction({ enabled: true, permission: 'granted', userRequestedEnable: true }) === 'schedule',
  'granted permission schedules the reminder',
);
assert(
  reminderSyncAction({ enabled: true, permission: 'denied', userRequestedEnable: true }) === 'show-settings',
  'denied permission explains iOS Settings',
);
assert(enabledAfterUserRequest('show-settings') === false, 'a denial is not stored as enabled');
assert(enabledAfterUserRequest('schedule') === true, 'a granted reminder is stored as enabled');
assert(
  reminderSyncAction({ enabled: true, permission: 'undetermined', userRequestedEnable: false }) === 'needs-permission',
  'opening the app does not request permission by itself',
);
assert(
  reminderSyncAction({ enabled: true, permission: 'undetermined', userRequestedEnable: true }) === 'prompt',
  'turning the reminder on is what asks for permission',
);
assert(
  reminderSyncAction({ enabled: false, permission: 'granted', userRequestedEnable: false }) === 'cancel',
  'turning the reminder off cancels it',
);

const scheduled = [
  { identifier: 'daily-meditation-reminder', data: { kind: 'daily-reminder' } },
  { identifier: 'stale-copy', data: { kind: 'daily-reminder' } },
  { identifier: 'other', data: { kind: 'something-else' } },
];
const cancelled = reminderIdentifiersToCancel(scheduled);
assert(
  cancelled.includes('daily-meditation-reminder') && cancelled.includes('stale-copy') && !cancelled.includes('other'),
  'only reminder notifications are cancelled',
);
assert(new Set(cancelled).size === cancelled.length, 'cancellation does not list the same id twice');

const changed = reminderRequest({ hour: 18, minute: 15 });
assert(changed.trigger.hour === 18 && changed.trigger.minute === 15, 'a new time replaces the previous clock time');
assert(!('timezone' in changed.trigger), 'a time zone change still uses the device clock');

const stored = serializeReminderPreference({ enabled: true, time: { hour: 6, minute: 45 } });
const restored = parseStoredReminderPreference(stored);
assert(restored?.enabled === true && restored.time.hour === 6 && restored.time.minute === 45, 'the preference survives an app restart');
assert(
  resolveReminderPreference(
    { enabled: false, time: { hour: 9, minute: 0 } },
    restored,
  ).enabled === false,
  'the account preference wins after a restart',
);
assert(
  resolveReminderPreference(null, restored)?.time.hour === 6,
  'a local preference is used when the account cannot be read',
);
assert(resolveReminderPreference(null, null).enabled === false, 'a new install does not enable reminders');
assert(SETTINGS_INSTRUCTIONS.includes('Settings') && SETTINGS_INSTRUCTIONS.includes('Notifications'), 'denied permission tells the user where to turn notifications on');

console.log('daily reminder checks: ok');
