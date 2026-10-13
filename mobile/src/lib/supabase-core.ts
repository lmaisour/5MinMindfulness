import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { isSupabaseConfigured, requireSupabaseConfig } from '@/lib/env';
import type { Database } from '@/lib/database.types';

/**
 * Session persistence uses `localStorage`:
 * - Native: Expo SQLite-backed localStorage, installed by `supabase.ts`.
 * - Web: the browser's localStorage. The SQLite install is a no-op on web and
 *   its worker cannot be bundled by the static renderer.
 * SecureStore remains installed for future hardening; auth session JSON can
 * exceed SecureStore size limits. See docs/PHASE2_SUPABASE_SETUP.md.
 */

let client: SupabaseClient<Database> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const { url, publishableKey } = requireSupabaseConfig();
  client = createClient<Database>(url, publishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return client;
}

/** @deprecated Prefer getSupabase() for clearer lazy init. */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getSupabase(), prop, receiver);
    return typeof value === 'function' ? value.bind(getSupabase()) : value;
  },
});

export function startAuthAutoRefresh() {
  if (!isSupabaseConfigured() || appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void getSupabase().auth.startAutoRefresh();
    } else {
      void getSupabase().auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === 'active') {
    void getSupabase().auth.startAutoRefresh();
  }
}

export type AuthUser = User;
export type AuthSession = Session;
