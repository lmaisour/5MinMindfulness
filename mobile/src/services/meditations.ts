import { getSupabase } from '@/lib/supabase';
import type { Intention, Meditation, MeditationStatus, Mood } from '@/types';

const AUDIO_BUCKET = 'meditation-audio';

interface MeditationListRow {
  id: string;
  checkin_id: string;
  title: string | null;
  status: MeditationStatus;
  created_at: string;
  target_duration_seconds: number;
  actual_duration_seconds: number | null;
  audio_storage_path: string | null;
}

export async function listLibraryMeditations(): Promise<Meditation[]> {
  const supabase = getSupabase();
  const user = await currentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('meditations')
    .select(
      'id, title, status, created_at, target_duration_seconds, actual_duration_seconds, checkin_id, audio_storage_path',
    )
    .eq('user_id', user.id)
    .in('status', ['script_ready', 'generating_audio', 'processing_audio', 'ready', 'failed'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return hydrate(data ?? []);
}

export async function getMeditationPlayback(id: string): Promise<{
  meditation: Meditation;
  signedUrl: string | null;
} | null> {
  const supabase = getSupabase();
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('meditations')
    .select(
      'id, title, status, created_at, target_duration_seconds, actual_duration_seconds, checkin_id, audio_storage_path',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [meditation] = await hydrate([data]);
  if (data.status !== 'ready' || !data.audio_storage_path) {
    return { meditation, signedUrl: null };
  }

  const signed = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(data.audio_storage_path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error('Could not open this meditation.');
  }
  return { meditation, signedUrl: signed.data.signedUrl };
}

export async function deleteMeditation(id: string) {
  const supabase = getSupabase();
  const user = await currentUser();
  if (!user) throw new Error('Not signed in');

  const folder = `${user.id}/${id}/segments`;
  const listed = await supabase.storage.from(AUDIO_BUCKET).list(folder);
  const paths = [
    `${user.id}/${id}.wav`,
    ...(listed.data ?? []).map((file) => `${folder}/${file.name}`),
  ];
  const removed = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
  if (removed.error) throw removed.error;

  const { error } = await supabase.from('meditations').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function startListening(meditationId: string): Promise<string> {
  const supabase = getSupabase();
  const user = await currentUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('listening_history')
    .insert({ user_id: user.id, meditation_id: meditationId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateListening(id: string, listenedSeconds: number, completed: boolean) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('listening_history')
    .update({
      listened_seconds: Math.max(0, Math.round(listenedSeconds)),
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

async function currentUser() {
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

async function hydrate(rows: MeditationListRow[]): Promise<Meditation[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabase();
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select('id, focus, moods, energy_level')
    .in('id', rows.map((row) => row.checkin_id));
  if (error) throw error;
  const byId = new Map((checkins ?? []).map((item) => [item.id, item]));

  return rows.map((row) => {
    const checkin = byId.get(row.checkin_id);
    return {
      id: row.id,
      checkinId: row.checkin_id,
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
