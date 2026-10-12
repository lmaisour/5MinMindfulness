import Constants from 'expo-constants';

function readEnv(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess && fromProcess.length > 0) return fromProcess;

  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const fromExtra = extra?.[name];
  if (fromExtra && fromExtra.length > 0) return fromExtra;

  return undefined;
}

export const supabaseUrl = readEnv('EXPO_PUBLIC_SUPABASE_URL');
/** Publishable (anon) key — safe for client use with RLS. */
export const supabasePublishableKey =
  readEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
  readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function requireSupabaseConfig(): {
  url: string;
  publishableKey: string;
} {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}
