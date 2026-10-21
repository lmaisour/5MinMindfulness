import * as SecureStore from 'expo-secure-store';

import {
  parseStoredReminderPreference,
  serializeReminderPreference,
  type ReminderPreference,
} from '@/services/reminderPlan';

const STORAGE_KEY = 'daily-reminder-preference';

export async function readLocalReminderPreference(): Promise<ReminderPreference | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return parseStoredReminderPreference(raw);
  } catch {
    return null;
  }
}

export async function writeLocalReminderPreference(preference: ReminderPreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, serializeReminderPreference(preference));
  } catch {
    // The account row remains the source of truth when secure storage is unavailable.
  }
}

export async function clearLocalReminderPreference(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Signing out still cancels the scheduled notification.
  }
}
