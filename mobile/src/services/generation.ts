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

export interface AudioAdvance {
  meditationId: string;
  status: MeditationStatus;
  title?: string | null;
  message?: string;
  actualDurationSeconds?: number | null;
  errorCode?: string;
  completedSegments?: number;
  totalSpeechSegments?: number;
}

export async function requestMeditationScript(checkinId: string): Promise<GenerationResult> {
  return invokeFunction<GenerationResult>('generate-meditation', { checkinId });
}

export async function advanceMeditationAudio(meditationId: string): Promise<AudioAdvance> {
  return invokeFunction<AudioAdvance>('generate-audio', { meditationId });
}

async function invokeFunction<T>(name: string, body: Record<string, string>): Promise<T> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.json().catch(() => null);
      if (payload && typeof payload.error === 'string') {
        throw new Error(payload.error);
      }
      if (payload && typeof payload.message === 'string') {
        throw new Error(payload.message);
      }
    }
    throw error;
  }

  return data as T;
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
