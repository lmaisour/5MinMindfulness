import { listCheckInsForUser } from '@/services/checkins';
import { getSupabase } from '@/lib/supabase';
import type { InsightsSummary, Intention, Mood } from '@/types';

export async function getInsightsSummary(): Promise<InsightsSummary> {
  const checkins = await listCheckInsForUser();
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let totalMinutesListened = 0;
  let sessionsThisWeek = 0;
  let totalMeditations = 0;

  if (user) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: history } = await supabase
      .from('listening_history')
      .select('listened_seconds, started_at, completed_at')
      .eq('user_id', user.id);

    for (const row of history ?? []) {
      totalMinutesListened += Math.round((row.listened_seconds ?? 0) / 60);
      if (row.completed_at) totalMeditations += 1;
      if (row.started_at && new Date(row.started_at) >= weekAgo) {
        sessionsThisWeek += 1;
      }
    }
  }

  const moodCounts: Partial<Record<Mood, number>> = {};
  const intentionCounts: Partial<Record<Intention, number>> = {};
  const energyByDay = new Map<string, { total: number; count: number }>();

  for (const checkin of checkins) {
    for (const mood of checkin.moods) {
      const key = mood as Mood;
      moodCounts[key] = (moodCounts[key] ?? 0) + 1;
    }
    const focus = checkin.focus as Intention;
    intentionCounts[focus] = (intentionCounts[focus] ?? 0) + 1;

    const day = new Date(checkin.created_at).toLocaleDateString(undefined, {
      weekday: 'short',
    });
    const bucket = energyByDay.get(day) ?? { total: 0, count: 0 };
    bucket.total += checkin.energy_level;
    bucket.count += 1;
    energyByDay.set(day, bucket);
  }

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const averageEnergyByDay = dayOrder.map((label) => {
    const bucket = energyByDay.get(label);
    return {
      label,
      value: bucket ? Math.round((bucket.total / bucket.count) * 10) / 10 : 0,
    };
  });

  return {
    totalMeditations,
    totalMinutesListened,
    sessionsThisWeek,
    moodCounts,
    averageEnergyByDay,
    intentionCounts,
  };
}
