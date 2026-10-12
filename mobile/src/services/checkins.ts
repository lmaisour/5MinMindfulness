import { MEDITATION_DURATION } from '@/constants/meditation';
import { getSupabase } from '@/lib/supabase';
import { checkInSchema } from '@/lib/validation';
import type { Intention, Mood } from '@/types';

export interface CreateCheckInInput {
  name?: string;
  moods: Mood[];
  energyLevel: number;
  focus: Intention;
  notes?: string;
}

export async function createCheckIn(input: CreateCheckInInput) {
  const parsed = checkInSchema.parse({
    ...input,
    duration: MEDITATION_DURATION.label,
  });

  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be signed in to save a check-in.');

  if (parsed.name?.trim()) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: parsed.name.trim() }, { onConflict: 'id' });
  }

  const { data, error } = await supabase
    .from('daily_checkins')
    .insert({
      user_id: user.id,
      name: parsed.name ?? null,
      moods: parsed.moods,
      energy_level: parsed.energyLevel,
      focus: parsed.focus,
      notes: parsed.notes ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listCheckInsForUser() {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
