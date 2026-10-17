import { getSupabase } from '@/lib/supabase';
import type { MeditationStatus } from '@/types';

export interface GeneratedScriptSection {
  id: string;
  blocks: Array<{ type: 'speech' | 'pause'; text: string; seconds: number }>;
}

export interface GenerationResult {
  meditationId: string | null;
  status: MeditationStatus | 'safety_support';
  title?: string | null;
  estimatedDurationSeconds?: number | null;
  message?: string;
  script?: {
    title: string;
    sections: GeneratedScriptSection[];
    timing?: { estimatedDurationSeconds?: number };
  };
}

export async function requestMeditationScript(checkinId: string): Promise<GenerationResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('generate-meditation', {
    body: { checkinId },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const body = await context.json().catch(() => null);
      if (body && typeof body.error === 'string') {
        throw new Error(body.error);
      }
      if (body && typeof body.message === 'string') {
        throw new Error(body.message);
      }
    }
    throw error;
  }

  return data as GenerationResult;
}

export async function readMeditationForCheckIn(checkinId: string): Promise<GenerationResult | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meditations')
    .select('id, status, title, script_json')
    .eq('checkin_id', checkinId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const script = data.script_json as GenerationResult['script'] | null;
  if (data.status === 'failed') {
    throw new Error('Meditation generation failed. Please try again.');
  }
  return {
    meditationId: data.id,
    status: data.status,
    title: data.title,
    estimatedDurationSeconds: script?.timing?.estimatedDurationSeconds ?? null,
    script: script ?? undefined,
  };
}
