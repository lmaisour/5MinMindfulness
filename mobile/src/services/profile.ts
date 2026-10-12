import { getSupabase } from '@/lib/supabase';

export async function getProfile(userId: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDisplayName(userId: string, displayName: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName.trim() || null,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getPreferences(userId: string) {
  const { data, error } = await getSupabase()
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePreferences(
  userId: string,
  patch: {
    personalization_enabled?: boolean;
    notifications_enabled?: boolean;
    preferred_voice?: string | null;
  },
) {
  const { data, error } = await getSupabase()
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        ...patch,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
