// Supabase Edge Function: generate-audio
// Deploy: supabase functions deploy generate-audio --use-api
// Secret: supabase secrets set ELEVENLABS_API_KEY=...
// The key stays on the server. The mobile app never receives it.
//
// One invocation narrates the next speech segment or assembles the finished file.
// The phone calls again until the meditation is ready or failed. Stored segments
// are reused, so a retry does not pay ElevenLabs for audio that already exists.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

import {
  AUDIO_BUCKET,
  AUDIO_LIMITS,
  assembleNarration,
  audioAction,
  audioFailureMessage,
  audioQuotaMessage,
  audioQuotaReason,
  emptyManifest,
  estimateCostUsd,
  finalAudioPath,
  measuredDurationAccepted,
  narrationFingerprint,
  nextSpeechSegment,
  parseManifest,
  parseWav,
  planNarration,
  recordsSegmentFailure,
  resolveVoiceSettings,
  segmentAudioPath,
  type AudioManifest,
  type PlanSegment,
  type SpeechPlanSegment,
  type VoiceSettings,
} from '../_shared/audioAssembly.ts';

const TTS_TIMEOUT_MS = 35_000;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Db = SupabaseClient;

interface MeditationAudioRow {
  id: string;
  status: string;
  script_json: unknown;
  title: string | null;
  audio_storage_path: string | null;
  actual_duration_seconds: number | null;
  audio_attempts: number | null;
  audio_attempted_at: string | null;
  audio_lock_until: string | null;
  audio_manifest: unknown;
  error_code: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!supabaseUrl || !anonKey) return json({ error: 'Server misconfigured' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const meditationId = typeof body?.meditationId === 'string' ? body.meditationId : '';
    if (!/^[0-9a-f-]{36}$/i.test(meditationId)) {
      return json({ error: 'A meditation id is required.' }, 400);
    }

    const { data: row, error: rowError } = await supabase
      .from('meditations')
      .select(
        'id, status, script_json, title, audio_storage_path, actual_duration_seconds, audio_attempts, audio_attempted_at, audio_lock_until, audio_manifest, error_code',
      )
      .eq('id', meditationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (rowError) return json({ error: 'Could not read the meditation.' }, 500);
    if (!row) return json({ error: 'Meditation not found.' }, 404);

    const meditation = row as MeditationAudioRow;
    let settings: VoiceSettings;
    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_voice')
        .eq('user_id', user.id)
        .maybeSingle();
      settings = resolveVoiceSettings(
        {
          ELEVENLABS_VOICE_ID: Deno.env.get('ELEVENLABS_VOICE_ID'),
          ELEVENLABS_MODEL_ID: Deno.env.get('ELEVENLABS_MODEL_ID'),
          ELEVENLABS_OUTPUT_FORMAT: Deno.env.get('ELEVENLABS_OUTPUT_FORMAT'),
          ELEVENLABS_STABILITY: Deno.env.get('ELEVENLABS_STABILITY'),
          ELEVENLABS_SIMILARITY_BOOST: Deno.env.get('ELEVENLABS_SIMILARITY_BOOST'),
          ELEVENLABS_STYLE: Deno.env.get('ELEVENLABS_STYLE'),
          ELEVENLABS_SPEED: Deno.env.get('ELEVENLABS_SPEED'),
          ELEVENLABS_SPEAKER_BOOST: Deno.env.get('ELEVENLABS_SPEAKER_BOOST'),
        },
        prefs?.preferred_voice,
      );
    } catch {
      return json({ error: 'Server misconfigured' }, 500);
    }

    let plan: PlanSegment[];
    try {
      plan = planNarration(meditation.script_json as { sections?: [] } | null);
    } catch {
      if (meditation.status !== 'ready') {
        await supabase
          .from('meditations')
          .update({ status: 'failed', error_code: 'invalid_script', audio_lock_until: null })
          .eq('id', meditation.id)
          .eq('user_id', user.id);
      }
      return json({ error: 'The saved script cannot be narrated.' }, 422);
    }

    const fingerprint = narrationFingerprint(settings, plan);
    const manifest = parseManifest(meditation.audio_manifest);
    const action = audioAction(
      {
        status: meditation.status,
        hasScript: meditation.script_json != null,
        hasAudioPath: Boolean(meditation.audio_storage_path),
        actualDurationSeconds: meditation.actual_duration_seconds,
        audioAttempts: meditation.audio_attempts ?? 0,
        lockUntil: meditation.audio_lock_until,
        errorCode: meditation.error_code,
        attemptedAt: meditation.audio_attempted_at,
        manifest,
      },
      Date.now(),
      fingerprint,
    );

    if (action === 'return_ready') {
      return json({
        meditationId,
        status: 'ready',
        title: meditation.title,
        actualDurationSeconds: meditation.actual_duration_seconds,
      }, 200);
    }
    if (action === 'cached_failure') {
      return json(durationFailure(meditationId, meditation.actual_duration_seconds), 200);
    }
    if (action === 'wait') {
      return json({
        meditationId,
        status: meditation.status,
        message: 'Narration is already in progress.',
        completedSegments: manifest?.segments.length ?? 0,
        totalSpeechSegments: speechCount(plan),
      }, 202);
    }
    if (action === 'cooldown') {
      const code = meditation.error_code ?? 'elevenlabs_failed';
      console.error('generate-audio', 'cooldown', code);
      return json({
        meditationId,
        status: 'failed',
        errorCode: code,
        message: audioFailureMessage(code),
      }, 200);
    }
    if (action === 'blocked') {
      const limited = (meditation.audio_attempts ?? 0) >= AUDIO_LIMITS.attemptsPerMeditation;
      return json(
        {
          error: limited
            ? 'This meditation has been recorded too many times.'
            : 'Narration cannot start until the script is ready.',
          errorCode: limited ? 'attempt_quota' : 'not_ready',
        },
        limited ? 429 : 409,
      );
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return json({ error: 'Server misconfigured' }, 500);

    if (action === 'begin') {
      const quota = await narrationQuota(supabase, user.id);
      if (quota !== 'ok') {
        console.error('generate-audio', quota === 'daily' ? 'daily_quota' : 'hourly_quota');
        return json({ error: audioQuotaMessage(quota), errorCode: quota === 'daily' ? 'daily_quota' : 'hourly_quota' }, 429);
      }
    }

    const claimed = action === 'begin'
      ? await claimBegin(supabase, user.id, meditation, settings, fingerprint)
      : action === 'retry_unbilled'
        ? await claimUnbilledRetry(supabase, user.id, meditation.id)
        : await claimContinue(supabase, user.id, meditation.id);
    if (!claimed) {
      return json({
        meditationId,
        status: 'generating_audio',
        message: 'Narration is already in progress.',
        completedSegments: manifest?.segments.length ?? 0,
        totalSpeechSegments: speechCount(plan),
      }, 202);
    }

    if (action === 'begin') {
      await removeAudio(supabase, user.id, meditation.id);
      await logEvent(supabase, user.id, meditation.id, { event_type: 'started' });
    }

    const replaceManifest = action === 'begin' || (action === 'retry_unbilled' && manifest?.fingerprint !== fingerprint);
    const workingManifest = replaceManifest
      ? emptyManifest(settings, fingerprint)
      : manifest ?? emptyManifest(settings, fingerprint);
    if (replaceManifest && action === 'retry_unbilled') {
      await supabase
        .from('meditations')
        .update({ audio_manifest: workingManifest })
        .eq('id', meditation.id)
        .eq('user_id', user.id);
    }

    try {
      const next = nextSpeechSegment(plan, workingManifest);
      if (next) {
        return await narrateSegment(supabase, apiKey, settings, user.id, meditation.id, plan, workingManifest, next);
      }
      return await assemble(supabase, user.id, meditation.id, plan, workingManifest);
    } catch (error) {
      const code = classifyError(error);
      await supabase
        .from('meditations')
        .update({ status: 'failed', error_code: code, audio_lock_until: null })
        .eq('id', meditation.id)
        .eq('user_id', user.id);
      await logEvent(supabase, user.id, meditation.id, { event_type: 'failed', error_code: code });
      console.error('generate-audio', code);
      return json({ error: audioFailureMessage(code), errorCode: code }, statusFor(code));
    }
  } catch (error) {
    console.error('generate-audio', error instanceof Error ? error.name : 'error');
    return json({ error: 'Unexpected error' }, 500);
  }
});

async function narrateSegment(
  supabase: Db,
  apiKey: string,
  settings: VoiceSettings,
  userId: string,
  meditationId: string,
  plan: PlanSegment[],
  manifest: AudioManifest,
  segment: SpeechPlanSegment,
) {
  const failures = manifest.segmentFailures[String(segment.index)] ?? 0;
  const path = segmentAudioPath(userId, meditationId, segment.index);
  const downloaded = await supabase.storage.from(AUDIO_BUCKET).download(path);
  let bytes = downloaded.data ? new Uint8Array(await downloaded.data.arrayBuffer()) : null;
  if (bytes && bytes.length >= 44) {
    try {
      parseWav(bytes);
    } catch {
      bytes = null;
    }
  } else {
    bytes = null;
  }
  let charged = false;
  if (!bytes && failures >= 2) {
    await supabase
      .from('meditations')
      .update({ status: 'failed', error_code: 'elevenlabs_failed', audio_lock_until: null, audio_manifest: manifest })
      .eq('id', meditationId)
      .eq('user_id', userId);
    console.error('generate-audio', 'segment_stopped');
    return json({
      error: 'Narration stopped after repeated failures, so another request was not sent.',
      errorCode: 'elevenlabs_failed',
    }, 502);
  }
  if (!bytes) {
    try {
      bytes = await synthesize(apiKey, settings, segment);
      parseWav(bytes);
    } catch (error) {
      const code = classifyError(error);
      const counted = recordsSegmentFailure(code);
      const nextFailures = counted ? failures + 1 : failures;
      const nextManifest: AudioManifest = {
        ...manifest,
        segmentFailures: counted
          ? { ...manifest.segmentFailures, [String(segment.index)]: nextFailures }
          : manifest.segmentFailures,
      };
      await supabase
        .from('meditations')
        .update({
          status: 'failed',
          error_code: code,
          audio_lock_until: null,
          audio_manifest: nextManifest,
        })
        .eq('id', meditationId)
        .eq('user_id', userId);
      await logEvent(supabase, userId, meditationId, { event_type: 'failed', error_code: code });
      console.error('generate-audio', code);
      const stopped = counted && nextFailures >= 2;
      return json({
        error: stopped
          ? 'Narration stopped after repeated failures, so another request was not sent.'
          : audioFailureMessage(code),
        errorCode: code,
      }, statusFor(code));
    }
    const uploaded = await supabase.storage.from(AUDIO_BUCKET).upload(path, wavBlob(bytes), {
      contentType: 'audio/wav',
      upsert: true,
    });
    if (uploaded.error) throw new Error('storage_failed');
    charged = true;
  }

  const nextManifest: AudioManifest = {
    ...manifest,
    segments: [
      ...manifest.segments.filter((item) => item.index !== segment.index),
      { index: segment.index, kind: 'speech', storagePath: path, characters: segment.characters },
    ].sort((a, b) => a.index - b.index),
  };
  const saved = await supabase
    .from('meditations')
    .update({
      status: 'generating_audio',
      audio_manifest: nextManifest,
      audio_lock_until: null,
      error_code: null,
    })
    .eq('id', meditationId)
    .eq('user_id', userId);
  if (saved.error) throw new Error('save_failed');

  if (charged) {
    await logEvent(supabase, userId, meditationId, {
      event_type: 'segment',
      characters: segment.characters,
      estimated_cost_usd: estimateCostUsd(segment.characters),
    });
  }

  return json({
    meditationId,
    status: 'generating_audio',
    completedSegments: nextManifest.segments.length,
    totalSpeechSegments: speechCount(plan),
  }, 202);
}

async function assemble(
  supabase: Db,
  userId: string,
  meditationId: string,
  plan: PlanSegment[],
  manifest: AudioManifest,
) {
  await supabase
    .from('meditations')
    .update({ status: 'processing_audio', audio_manifest: manifest })
    .eq('id', meditationId)
    .eq('user_id', userId);

  const wavs: Uint8Array[] = [];
  for (const segment of plan) {
    if (segment.kind !== 'speech') continue;
    const saved = manifest.segments.find((item) => item.index === segment.index);
    if (!saved) throw new Error('audio_format');
    const downloaded = await supabase.storage.from(AUDIO_BUCKET).download(saved.storagePath);
    if (!downloaded.data) throw new Error('storage_failed');
    wavs.push(new Uint8Array(await downloaded.data.arrayBuffer()));
  }

  const assembled = assembleNarration(wavs, plan);
  const measured = Math.round(assembled.durationSeconds);
  if (!measuredDurationAccepted(assembled.durationSeconds)) {
    await supabase
      .from('meditations')
      .update({
        status: 'failed',
        error_code: 'duration_out_of_range',
        actual_duration_seconds: measured,
        audio_storage_path: null,
        completed_at: null,
        audio_lock_until: null,
        audio_manifest: manifest,
      })
      .eq('id', meditationId)
      .eq('user_id', userId);
    await logEvent(supabase, userId, meditationId, {
      event_type: 'failed',
      error_code: 'duration_out_of_range',
      duration_seconds: measured,
    });
    return json(durationFailure(meditationId, measured), 200);
  }

  const path = finalAudioPath(userId, meditationId);
  const uploaded = await supabase.storage.from(AUDIO_BUCKET).upload(path, wavBlob(assembled.wav), {
    contentType: 'audio/wav',
    upsert: true,
  });
  if (uploaded.error) throw new Error('storage_failed');

  const ready = await supabase
    .from('meditations')
    .update({
      status: 'ready',
      audio_storage_path: path,
      actual_duration_seconds: measured,
      completed_at: new Date().toISOString(),
      error_code: null,
      audio_lock_until: null,
      audio_manifest: manifest,
    })
    .eq('id', meditationId)
    .eq('user_id', userId);
  if (ready.error) {
    await supabase.storage.from(AUDIO_BUCKET).remove([path]);
    throw new Error('save_failed');
  }

  const segmentPaths = manifest.segments.map((segment) => segment.storagePath);
  if (segmentPaths.length > 0) {
    await supabase.storage.from(AUDIO_BUCKET).remove(segmentPaths);
  }
  await logEvent(supabase, userId, meditationId, {
    event_type: 'assembled',
    duration_seconds: measured,
    characters: manifest.segments.reduce((sum, segment) => sum + segment.characters, 0),
  });

  return json({
    meditationId,
    status: 'ready',
    actualDurationSeconds: measured,
  }, 200);
}

async function synthesize(apiKey: string, settings: VoiceSettings, segment: SpeechPlanSegment): Promise<Uint8Array> {
  try {
    return await requestSpeech(apiKey, settings, segment);
  } catch (error) {
    const reason = error instanceof Error ? error : new Error('elevenlabs_failed');
    if (reason.message !== 'elevenlabs_rejected') throw reason;
    await delay(1500);
    return await requestSpeech(apiKey, settings, segment);
  }
}

async function requestSpeech(apiKey: string, settings: VoiceSettings, segment: SpeechPlanSegment): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(settings.voiceId)}`);
    url.searchParams.set('output_format', settings.outputFormat);
    const payload: Record<string, unknown> = {
      text: segment.text,
      model_id: settings.modelId,
      apply_text_normalization: 'auto',
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarityBoost,
        style: settings.style,
        use_speaker_boost: settings.useSpeakerBoost,
        speed: settings.speed,
      },
    };
    if (segment.previousText) payload.previous_text = segment.previousText;
    if (segment.nextText) payload.next_text = segment.nextText;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/wav',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error('generate-audio elevenlabs', response.status);
      throw new Error(providerErrorCode(response.status));
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 44) throw new Error('audio_format');
    return bytes;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || KNOWN_AUDIO_ERRORS.has(error.message))) {
      throw error;
    }
    console.error('generate-audio', 'network_failed');
    throw new Error('network_failed');
  } finally {
    clearTimeout(timer);
  }
}

function providerErrorCode(status: number): string {
  if (status === 401 || status === 403) return 'elevenlabs_auth';
  if (status === 402) return 'elevenlabs_credits';
  if (status === 429) return 'elevenlabs_rate_limit';
  if (status >= 500) return 'elevenlabs_rejected';
  return 'elevenlabs_failed';
}

async function claimBegin(
  supabase: Db,
  userId: string,
  row: MeditationAudioRow,
  settings: VoiceSettings,
  fingerprint: string,
) {
  const { data, error } = await supabase
    .from('meditations')
    .update({
      status: 'generating_audio',
      audio_attempts: (row.audio_attempts ?? 0) + 1,
      audio_attempted_at: new Date().toISOString(),
      audio_lock_until: lockUntil(),
      audio_manifest: emptyManifest(settings, fingerprint),
      error_code: null,
      actual_duration_seconds: null,
      audio_storage_path: null,
      completed_at: null,
    })
    .eq('id', row.id)
    .eq('user_id', userId)
    .in('status', ['script_ready', 'failed'])
    .select('id')
    .maybeSingle();
  if (error) throw new Error('save_failed');
  return Boolean(data);
}

async function claimUnbilledRetry(supabase: Db, userId: string, meditationId: string) {
  const { data, error } = await supabase
    .from('meditations')
    .update({
      status: 'generating_audio',
      audio_lock_until: lockUntil(),
      audio_attempted_at: new Date().toISOString(),
    })
    .eq('id', meditationId)
    .eq('user_id', userId)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();
  if (error) throw new Error('save_failed');
  return Boolean(data);
}

async function claimContinue(supabase: Db, userId: string, meditationId: string) {
  const failed = await supabase
    .from('meditations')
    .update({ status: 'generating_audio', audio_lock_until: lockUntil(), error_code: null })
    .eq('id', meditationId)
    .eq('user_id', userId)
    .eq('status', 'failed')
    .select('id')
    .maybeSingle();
  if (failed.error) throw new Error('save_failed');
  if (failed.data) return true;

  const now = new Date().toISOString();
  const unlocked = await supabase
    .from('meditations')
    .update({ status: 'generating_audio', audio_lock_until: lockUntil() })
    .eq('id', meditationId)
    .eq('user_id', userId)
    .in('status', ['generating_audio', 'processing_audio'])
    .is('audio_lock_until', null)
    .select('id')
    .maybeSingle();
  if (unlocked.error) throw new Error('save_failed');
  if (unlocked.data) return true;

  const expired = await supabase
    .from('meditations')
    .update({ status: 'generating_audio', audio_lock_until: lockUntil() })
    .eq('id', meditationId)
    .eq('user_id', userId)
    .in('status', ['generating_audio', 'processing_audio'])
    .lt('audio_lock_until', now)
    .select('id')
    .maybeSingle();
  if (expired.error) throw new Error('save_failed');
  return Boolean(expired.data);
}

async function narrationQuota(supabase: Db, userId: string) {
  const now = Date.now();
  const [hour, day] = await Promise.all([
    countBilledMeditations(supabase, userId, new Date(now - 60 * 60 * 1000).toISOString()),
    countBilledMeditations(supabase, userId, new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  return audioQuotaReason({ hour, day });
}

async function countBilledMeditations(supabase: Db, userId: string, since: string) {
  const { data, error } = await supabase
    .from('audio_generation_events')
    .select('meditation_id')
    .eq('user_id', userId)
    .eq('event_type', 'segment')
    .gte('created_at', since);
  if (error) throw new Error('save_failed');
  return new Set((data ?? []).map((row) => row.meditation_id).filter((id): id is string => typeof id === 'string')).size;
}

async function logEvent(
  supabase: Db,
  userId: string,
  meditationId: string,
  event: {
    event_type: 'started' | 'segment' | 'assembled' | 'failed';
    characters?: number;
    duration_seconds?: number;
    estimated_cost_usd?: number;
    error_code?: string;
  },
) {
  const { error } = await supabase.from('audio_generation_events').insert({
    user_id: userId,
    meditation_id: meditationId,
    ...event,
  });
  if (error) console.error('generate-audio log', error.code);
}

async function removeAudio(supabase: Db, userId: string, meditationId: string) {
  const folder = `${userId}/${meditationId}/segments`;
  const listed = await supabase.storage.from(AUDIO_BUCKET).list(folder);
  const paths = [
    finalAudioPath(userId, meditationId),
    ...(listed.data ?? []).map((file) => `${folder}/${file.name}`),
  ];
  await supabase.storage.from(AUDIO_BUCKET).remove(paths);
}

function durationFailure(meditationId: string, seconds: number | null) {
  const measured = seconds == null ? 'outside the 5-minute window' : `${seconds} seconds`;
  return {
    meditationId,
    status: 'failed',
    errorCode: 'duration_out_of_range',
    actualDurationSeconds: seconds,
    message: `The narration is ${measured}, outside the 5-minute window, so it was not marked ready.`,
  };
}

function speechCount(plan: PlanSegment[]) {
  return plan.filter((segment) => segment.kind === 'speech').length;
}

function lockUntil() {
  return new Date(Date.now() + AUDIO_LIMITS.staleMs).toISOString();
}

const KNOWN_AUDIO_ERRORS = new Set([
  'audio_format',
  'storage_failed',
  'save_failed',
  'invalid_script',
  'elevenlabs_failed',
  'elevenlabs_rejected',
  'elevenlabs_auth',
  'elevenlabs_credits',
  'elevenlabs_rate_limit',
  'network_failed',
]);

function classifyError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') return 'elevenlabs_timeout';
  const message = error instanceof Error ? error.message : '';
  if (message === 'elevenlabs_rejected') return 'elevenlabs_failed';
  if (KNOWN_AUDIO_ERRORS.has(message)) return message;
  return 'audio_failed';
}

function statusFor(code: string) {
  if (code === 'elevenlabs_timeout') return 504;
  if (code === 'elevenlabs_rate_limit') return 429;
  return 502;
}

function wavBlob(bytes: Uint8Array) {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([copy], { type: 'audio/wav' });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
