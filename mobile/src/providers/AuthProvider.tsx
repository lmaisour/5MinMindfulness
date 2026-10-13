import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase, startAuthAutoRefresh } from '@/lib/supabase';
import * as authService from '@/services/auth';
import * as profileService from '@/services/profile';

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
  refreshProfile: () => Promise<void>;
  ensureAnonymous: () => Promise<Session>;
  signOut: () => Promise<void>;
  sendEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setPersonalizationEnabled: (value: boolean) => Promise<void>;
  setNotificationsEnabled: (value: boolean) => Promise<void>;
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
    setNotifications(prefs?.notifications_enabled ?? false);
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setInitializing(false);
      return;
    }

    startAuthAutoRefresh();
    const supabase = getSupabase();

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setSession(null);
          return;
        }
        setSession(data.session);
        if (data.session) {
          void refreshProfile();
        }
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setInitializing(false);
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
      refreshProfile,
      ensureAnonymous: async () => {
        const next = await authService.ensureAnonymousSession();
        setSession(next);
        await refreshProfile();
        return next;
      },
      signOut: async () => {
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
      setNotificationsEnabled: async (enabled) => {
        if (!session?.user) throw new Error('Not signed in');
        await profileService.updatePreferences(session.user.id, {
          notifications_enabled: enabled,
        });
        setNotifications(enabled);
      },
      deleteAccount: async () => {
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
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
