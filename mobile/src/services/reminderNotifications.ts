import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  reminderIdentifiersToCancel,
  reminderRequest,
  reminderSyncAction,
  type NotificationPermission,
  type ReminderPreference,
  type ReminderSyncAction,
} from '@/services/reminderPlan';

let handlerInstalled = false;

export function installNotificationHandler() {
  if (handlerInstalled || Platform.OS === 'web') return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function asPermission(status: string): NotificationPermission {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function readNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return 'undetermined';
  const settings = await Notifications.getPermissionsAsync();
  return asPermission(settings.status);
}

export async function cancelDailyReminder() {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = reminderIdentifiersToCancel(
    scheduled.map((item) => ({
      identifier: item.identifier,
      data: item.content.data,
    })),
  );
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleDailyReminder(preference: ReminderPreference) {
  if (Platform.OS === 'web') return;
  await cancelDailyReminder();
  const request = reminderRequest(preference.time);
  await Notifications.scheduleNotificationAsync({
    identifier: request.identifier,
    content: request.content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: request.trigger.hour,
      minute: request.trigger.minute,
    },
  });
}

/**
 * Applies the saved preference to the local notification center.
 * Permission is requested only when the user has just turned reminders on.
 */
export async function syncDailyReminder(
  preference: ReminderPreference,
  options: { userRequestedEnable: boolean },
): Promise<{ permission: NotificationPermission; action: ReminderSyncAction }> {
  if (Platform.OS === 'web') {
    return {
      permission: 'undetermined',
      action: preference.enabled ? 'needs-permission' : 'cancel',
    };
  }

  let permission = await readNotificationPermission();
  let action = reminderSyncAction({
    enabled: preference.enabled,
    permission,
    userRequestedEnable: options.userRequestedEnable,
  });

  if (action === 'prompt') {
    const asked = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    permission = asPermission(asked.status);
    action = reminderSyncAction({
      enabled: true,
      permission,
      userRequestedEnable: false,
    });
  }

  if (action === 'schedule') {
    await scheduleDailyReminder(preference);
  } else if (action !== 'needs-permission') {
    await cancelDailyReminder();
  }

  return { permission, action };
}
