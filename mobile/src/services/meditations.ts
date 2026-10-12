import { getSupabase } from '@/lib/supabase';
import type { Intention, Meditation, Mood } from '@/types';

export async function listReadyMeditations(): Promise<Meditation[]> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('meditations')
    .select(
      'id, title, status, created_at, target_duration_seconds, actual_duration_seconds, checkin_id',
    )
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const checkinIds = rows.map((row) => row.checkin_id);
  const { data: checkins, error: checkinError } = await supabase
    .from('daily_checkins')
    .select('id, focus, moods, energy_level')
    .in('id', checkinIds);

  if (checkinError) throw checkinError;

  const byId = new Map((checkins ?? []).map((item) => [item.id, item]));

  return rows.map((row) => {
    const checkin = byId.get(row.checkin_id);
    return {
      id: row.id,
      title: row.title ?? 'Untitled meditation',
      intention: (checkin?.focus as Intention) ?? 'Mindfulness',
      createdAt: row.created_at,
      targetDurationSeconds: row.target_duration_seconds,
      actualDurationSeconds: row.actual_duration_seconds ?? 0,
      status: row.status,
      moods: (checkin?.moods as Mood[]) ?? [],
      energyLevel: checkin?.energy_level ?? 5,
      downloaded: false,
    };
  });
}

export async function deleteMeditation(id: string) {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('meditations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
