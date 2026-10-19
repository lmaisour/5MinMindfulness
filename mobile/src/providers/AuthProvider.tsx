import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase, startAuthAutoRefresh } from '@/lib/supabase';
import * as authService from '@/services/auth';
import * as profileService from '@/services/profile';
import { cancelDailyReminder, syncDailyReminder } from '@/services/reminderNotifications';
import {
  DEFAULT_REMINDER_PREFERENCE,
  DEFAULT_REMINDER_TIME,
  enabledAfterUserRequest,
  parseReminderTime,
  reminderTimeToSql,
  resolveReminderPreference,
  type ReminderSyncAction,
  type ReminderTime,
} from '@/services/reminderPlan';
import {
  clearLocalReminderPreference,
  readLocalReminderPreference,
  writeLocalReminderPreference,
} from '@/services/reminderStorage';

interface AuthContextValue {
  configured: boolean;
  initializing: boolean;
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
  displayName?: string;
  email?: string;
  personalizationEnabled: boolean;
  notificationsEnabled: boolean;
  reminderTime: ReminderTime;
  reminderNotice: 'show-settings' | 'needs-permission' | null;
  refreshProfile: () => Promise<void>;
  ensureAnonymous: () => Promise<Session>;
  signOut: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setPersonalizationEnabled: (value: boolean) => Promise<void>;
  setDailyReminderEnabled: (value: boolean) => Promise<void>;
  setDailyReminderTime: (time: ReminderTime) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [personalizationEnabled, setPersonalization] = useState(true);
  const [notificationsEnabled, setNotifications] = useState(false);
  const [reminderTime, setReminderTime] = useState<ReminderTime>(DEFAULT_REMINDER_TIME);
  const [reminderNotice, setReminderNotice] = useState<'show-settings' | 'needs-permission' | null>(null);
  const preferenceRef = useRef(DEFAULT_REMINDER_PREFERENCE);
  preferenceRef.current = { enabled: notificationsEnabled, time: reminderTime };

  const applyReminder = useCallback(
    async (
      preference: { enabled: boolean; time: ReminderTime },
      userRequestedEnable: boolean,
    ) => {
      const result = await syncDailyReminder(preference, { userRequestedEnable });
      setReminderNotice(noticeFor(preference.enabled, result.action));
      return result;
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (!configured) return;
    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    if (!user) {
      setDisplayName(undefined);
      return;
    }
    const [profile, prefs] = await Promise.all([
      profileService.getProfile(user.id),
      profileService.getPreferences(user.id),
    ]);
    setDisplayName(profile?.display_name ?? undefined);
    setPersonalization(prefs?.personalization_enabled ?? true);
    const localReminder = await readLocalReminderPreference();
    const remoteReminder = prefs
      ? {
          enabled: prefs.notifications_enabled,
          time: parseReminderTime(prefs.reminder_local_time),
        }
      : null;
    const reminder = resolveReminderPreference(remoteReminder, localReminder);
    setNotifications(reminder.enabled);
    setReminderTime(reminder.time);
    preferenceRef.current = reminder;
    if (remoteReminder) await writeLocalReminderPreference(remoteReminder);
    try {
      await applyReminder(reminder, false);
    } catch {
      // The saved preference stays visible. The next time the app is active, scheduling is tried again.
    }
  }, [configured, applyReminder]);

  useEffect(() => {
    if (!configured) {
      setInitializing(false);
      return;
    }

    startAuthAutoRefresh();
    const supabase = getSupabase();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
      if (data.session) {
        void refreshProfile();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        void refreshProfile();
      } else {
        setDisplayName(undefined);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [configured, refreshProfile]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !preferenceRef.current.enabled) return;
      void applyReminder(preferenceRef.current, false).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [applyReminder]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      initializing,
      session,
      user: session?.user ?? null,
      isAnonymous: Boolean(session?.user?.is_anonymous),
      displayName,
      email: session?.user?.email ?? undefined,
      personalizationEnabled,
      notificationsEnabled,
      reminderTime,
      reminderNotice,
      refreshProfile,
      ensureAnonymous: async () => {
        const next = await authService.ensureAnonymousSession();
        setSession(next);
        await refreshProfile();
        return next;
      },
      signOut: async () => {
        await cancelDailyReminder();
        await clearLocalReminderPreference();
        setNotifications(false);
        setReminderTime(DEFAULT_REMINDER_TIME);
        setReminderNotice(null);
        preferenceRef.current = DEFAULT_REMINDER_PREFERENCE;
        await authService.signOut();
        setSession(null);
      },
      sendEmailOtp: async (email) => {
        await authService.sendEmailOtp(email);
      },
      verifyEmailOtp: async (email, token) => {
        await authService.verifyEmailOtp(email, token);
        await refreshProfile();
      },
      signInWithGoogle: async () => {
        await authService.signInWithGoogle();
        await refreshProfile();
      },
      signInWithApple: async () => {
        await authService.signInWithApple();
        await refreshProfile();
      },
      updateDisplayName: async (name) => {
        if (!session?.user) throw new Error('Not signed in');
        await profileService.updateDisplayName(session.user.id, name);
        setDisplayName(name.trim() || undefined);
      },
      setPersonalizationEnabled: async (enabled) => {
        if (!session?.user) throw new Error('Not signed in');
        await profileService.updatePreferences(session.user.id, {
          personalization_enabled: enabled,
        });
        setPersonalization(enabled);
      },
      setDailyReminderEnabled: async (enabled) => {
        if (!session?.user) throw new Error('Not signed in');
        const time = preferenceRef.current.time;
        const next = { enabled, time };
        if (enabled) {
          const result = await applyReminder(next, true);
          if (!enabledAfterUserRequest(result.action)) {
            setNotifications(false);
            preferenceRef.current = { enabled: false, time };
            return;
          }
        }
        try {
          await profileService.updatePreferences(session.user.id, {
            notifications_enabled: enabled,
            reminder_local_time: reminderTimeToSql(time),
          });
          await writeLocalReminderPreference(next);
        } catch (error) {
          if (enabled) await cancelDailyReminder();
          throw error;
        }
        setNotifications(enabled);
        preferenceRef.current = next;
        if (!enabled) await applyReminder(next, false);
      },
      setDailyReminderTime: async (time) => {
        if (!session?.user) throw new Error('Not signed in');
        const enabled = preferenceRef.current.enabled;
        const next = { enabled, time };
        await profileService.updatePreferences(session.user.id, {
          notifications_enabled: enabled,
          reminder_local_time: reminderTimeToSql(time),
        });
        await writeLocalReminderPreference(next);
        setReminderTime(time);
        preferenceRef.current = next;
        if (enabled) await applyReminder(next, false);
      },
      deleteAccount: async () => {
        await cancelDailyReminder();
        await clearLocalReminderPreference();
        await authService.requestAccountDeletion();
        setSession(null);
      },
    }),
    [
      configured,
      initializing,
      session,
      displayName,
      personalizationEnabled,
      notificationsEnabled,
      reminderTime,
      reminderNotice,
      refreshProfile,
      applyReminder,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function noticeFor(
  enabled: boolean,
  action: ReminderSyncAction,
): 'show-settings' | 'needs-permission' | null {
  if (!enabled) return null;
  if (action === 'show-settings') return 'show-settings';
  if (action === 'needs-permission') return 'needs-permission';
  return null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
