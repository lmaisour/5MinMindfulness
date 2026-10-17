// Supabase Edge Function: generate-meditation
// Deploy: supabase functions deploy generate-meditation --use-api
// Secret: supabase secrets set OPENAI_API_KEY=...
// The key stays on the server. The mobile app never receives it.

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

import {
  GENERATION_LIMITS,
  SAFETY_MESSAGE,
  SCRIPT_RESPONSE_SCHEMA,
  TARGET_DURATION_SECONDS,
  buildGenerationMessages,
  claimDecision,
  exceedsAttemptLimit,
  exceedsGenerationLimit,
  focusConflicts,
  suggestsSafetyCrisis,
  toStoredScript,
  validateModelScript,
  type StoredScript,
} from '../_shared/meditationScript.ts';

const MODEL = 'gpt-4.1-mini';
const OPENAI_TIMEOUT_MS = 25_000;
const MAX_MODEL_ATTEMPTS = 2;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, 200);
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    if (!supabaseUrl || !anonKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

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
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) return json({ error: 'Server misconfigured' }, 500);

    const body = await req.json().catch(() => null);
    const checkinId = typeof body?.checkinId === 'string' ? body.checkinId : '';
    if (!/^[0-9a-f-]{36}$/i.test(checkinId)) {
      return json({ error: 'A check-in id is required.' }, 400);
    }

    const { data: checkin, error: checkinError } = await supabase
      .from('daily_checkins')
      .select('id, moods, energy_level, focus, notes, created_at')
      .eq('id', checkinId)
      .maybeSingle();
    if (checkinError) return json({ error: 'Could not read the check-in.' }, 500);
    if (!checkin) return json({ error: 'Check-in not found.' }, 404);
    if (typeof checkin.notes === 'string' && checkin.notes.length > GENERATION_LIMITS.notesStoredMax) {
      return json({ error: 'Notes are too long.' }, 400);
    }
    if (suggestsSafetyCrisis(checkin.notes)) {
      return json({ meditationId: null, status: 'safety_support', message: SAFETY_MESSAGE }, 200);
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('personalization_enabled')
      .eq('user_id', user.id)
      .maybeSingle();
    const personalizationEnabled = prefs?.personalization_enabled !== false;

    const existingResult = await supabase
      .from('meditations')
      .select('id, status, script_json, title, created_at, updated_at, generation_attempts')
      .eq('checkin_id', checkinId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingResult.error) return json({ error: 'Could not read meditation status.' }, 500);

    const decision = claimDecision(toExisting(existingResult.data), Date.now());

    if (decision === 'return_script' && existingResult.data) {
      return json(scriptResponse(existingResult.data.id, existingResult.data.title, existingResult.data.script_json), 200);
    }
    if (decision === 'in_progress' && existingResult.data) {
      return json({ meditationId: existingResult.data.id, status: 'generating_script' }, 202);
    }
    if (decision === 'leave_existing' && existingResult.data) {
      return json(
        {
          meditationId: existingResult.data.id,
          status: existingResult.data.status,
          message: 'This check-in already has a meditation. Audio playback is not part of this step.',
        },
        200,
      );
    }
    if (existingResult.data && exceedsAttemptLimit(existingResult.data.generation_attempts ?? 0)) {
      return json({ error: 'This check-in has been generated too many times.' }, 429);
    }

    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [dayCount, hourCount] = await Promise.all([
      supabase
        .from('meditations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('checkin_id', checkinId)
        .gte('created_at', sinceDay),
      supabase
        .from('meditations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('checkin_id', checkinId)
        .gte('created_at', sinceHour),
    ]);
    if (dayCount.error || hourCount.error) return json({ error: 'Could not check generation limits.' }, 500);
    if (
      (decision === 'create' || decision === 'retry') &&
      exceedsGenerationLimit({ hour: hourCount.count ?? 0, day: dayCount.count ?? 0 })
    ) {
      return json({ error: 'Generation limit reached. Please try again later.' }, 429);
    }

    const nextAttempt = (existingResult.data?.generation_attempts ?? 0) + 1;
    const claimed = await claimMeditation(
      supabase,
      user.id,
      checkinId,
      existingResult.data?.id ?? null,
      nextAttempt,
    );
    if ('error' in claimed) return json({ error: claimed.error }, claimed.status);
    if ('response' in claimed) return claimed.response;

    const recent = personalizationEnabled
      ? await loadRecent(supabase, user.id, checkinId)
      : [];
    if (recent === null) {
      await markFailed(supabase, claimed.id, 'context_failed');
      return json({ error: 'Could not read recent check-ins.' }, 500);
    }

    let corrections: string[] | undefined;
    let stored: StoredScript | null = null;
    let lastFailure: { timeout?: boolean; statusCode?: number } | null = null;
    for (let attempt = 1; attempt <= MAX_MODEL_ATTEMPTS; attempt += 1) {
      const draft = await requestScript(openAiKey, {
        moods: checkin.moods ?? [],
        energyLevel: checkin.energy_level,
        focus: checkin.focus,
        notes: checkin.notes,
        recent,
        personalizationEnabled,
      }, corrections);
      if (!draft.ok) {
        lastFailure = draft;
        continue;
      }
      const validated = validateModelScript(draft.value);
      const conflict = validated.ok ? focusConflicts(checkin.focus, validated.script) : null;
      if (!validated.ok || conflict) {
        corrections = validated.ok ? [conflict!] : validated.errors;
        lastFailure = null;
        continue;
      }
      stored = toStoredScript(validated.script, checkin.focus);
      break;
    }

    if (!stored) {
      if (lastFailure) {
        const timedOut = lastFailure.timeout === true;
        await markFailed(supabase, claimed.id, timedOut ? 'openai_timeout' : 'openai_failed');
        if (!timedOut) console.error('generate-meditation openai', lastFailure.statusCode ?? 'unknown');
        return json(
          {
            error: timedOut
              ? 'The meditation took too long to write. Please try again.'
              : 'Meditation generation failed. Please try again.',
          },
          timedOut ? 504 : 502,
        );
      }
      await markFailed(supabase, claimed.id, 'invalid_script');
      return json({ error: 'The script did not pass validation. Please try again.' }, 422);
    }

    const saved = await supabase
      .from('meditations')
      .update({
        title: stored.title,
        script_json: stored,
        status: 'script_ready',
        error_code: null,
        actual_duration_seconds: null,
        audio_storage_path: null,
        completed_at: null,
        target_duration_seconds: TARGET_DURATION_SECONDS,
      })
      .eq('id', claimed.id)
      .select('id, title')
      .single();
    if (saved.error) {
      await markFailed(supabase, claimed.id, 'save_failed');
      return json({ error: 'Could not save the meditation.' }, 500);
    }

    return json(scriptResponse(saved.data.id, saved.data.title, stored), 200);
  } catch (error) {
    console.error('generate-meditation', error instanceof Error ? error.name : 'error');
    return json({ error: 'Unexpected error' }, 500);
  }
});

function scriptResponse(meditationId: string, title: string | null, script: unknown) {
  const timing = (script as StoredScript | null)?.timing;
  return {
    meditationId,
    status: 'script_ready',
    title,
    estimatedDurationSeconds: timing?.estimatedDurationSeconds ?? null,
    script,
  };
}

type MeditationRow = {
  id: string;
  status: string;
  script_json: unknown;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  generation_attempts: number | null;
};

function toExisting(row: MeditationRow | null) {
  if (!row) return null;
  return {
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasScript: row.script_json != null,
  };
}

async function claimMeditation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  checkinId: string,
  existingId: string | null,
  generationAttempts: number,
): Promise<{ id: string } | { error: string; status: number } | { response: Response }> {
  if (!existingId) {
    const inserted = await supabase
      .from('meditations')
      .insert({
        user_id: userId,
        checkin_id: checkinId,
        status: 'generating_script',
        target_duration_seconds: TARGET_DURATION_SECONDS,
        generation_attempts: generationAttempts,
      })
      .select('id')
      .single();
    if (!inserted.error) return { id: inserted.data.id };
    if (inserted.error.code !== '23505') return { error: 'Could not start generation.', status: 500 };
    const raced = await supabase
      .from('meditations')
      .select('id, status, script_json, title, created_at, updated_at, generation_attempts')
      .eq('checkin_id', checkinId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!raced.data) return { error: 'Could not start generation.', status: 500 };
    return resumeOrRespond(supabase, raced.data as MeditationRow, generationAttempts);
  }

  const current = await supabase
    .from('meditations')
    .select('id, status, script_json, title, created_at, updated_at, generation_attempts')
    .eq('id', existingId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!current.data) return { error: 'Could not retry generation.', status: 500 };
  return resumeOrRespond(supabase, current.data as MeditationRow, generationAttempts);
}

async function resumeOrRespond(
  supabase: ReturnType<typeof createClient>,
  row: MeditationRow,
  generationAttempts: number,
): Promise<{ id: string } | { error: string; status: number } | { response: Response }> {
  const decision = claimDecision(toExisting(row), Date.now());
  if (decision === 'return_script') {
    return { response: json(scriptResponse(row.id, row.title, row.script_json), 200) };
  }
  if (decision === 'in_progress') {
    return { response: json({ meditationId: row.id, status: 'generating_script' }, 202) };
  }
  if (decision === 'leave_existing') {
    return {
      response: json(
        {
          meditationId: row.id,
          status: row.status,
          message: 'This check-in already has a meditation. Audio playback is not part of this step.',
        },
        200,
      ),
    };
  }

  const claimedId = await takeOver(supabase, row.id, generationAttempts);
  if (claimedId) return { id: claimedId };

  const again = await supabase
    .from('meditations')
    .select('id, status, script_json, title, created_at, updated_at, generation_attempts')
    .eq('id', row.id)
    .maybeSingle();
  if (!again.data) return { error: 'Could not start generation.', status: 500 };
  const next = again.data as MeditationRow;
  const nextDecision = claimDecision(toExisting(next), Date.now());
  if (nextDecision === 'return_script') {
    return { response: json(scriptResponse(next.id, next.title, next.script_json), 200) };
  }
  if (nextDecision === 'in_progress' || nextDecision === 'leave_existing') {
    return {
      response: json(
        {
          meditationId: next.id,
          status: nextDecision === 'in_progress' ? 'generating_script' : next.status,
          message:
            nextDecision === 'leave_existing'
              ? 'This check-in already has a meditation. Audio playback is not part of this step.'
              : undefined,
        },
        nextDecision === 'in_progress' ? 202 : 200,
      ),
    };
  }
  return { error: 'Could not start generation.', status: 500 };
}

async function takeOver(
  supabase: ReturnType<typeof createClient>,
  meditationId: string,
  generationAttempts: number,
): Promise<string | null> {
  const patch = {
    status: 'generating_script',
    error_code: null,
    script_json: null,
    actual_duration_seconds: null,
    audio_storage_path: null,
    completed_at: null,
    generation_attempts: generationAttempts,
  };
  const failedOrPending = await supabase
    .from('meditations')
    .update(patch)
    .eq('id', meditationId)
    .in('status', ['failed', 'pending'])
    .select('id')
    .maybeSingle();
  if (failedOrPending.data) return failedOrPending.data.id;

  const emptyScript = await supabase
    .from('meditations')
    .update(patch)
    .eq('id', meditationId)
    .eq('status', 'script_ready')
    .is('script_json', null)
    .select('id')
    .maybeSingle();
  if (emptyScript.data) return emptyScript.data.id;

  const staleBefore = new Date(Date.now() - GENERATION_LIMITS.staleGeneratingMs).toISOString();
  const stale = await supabase
    .from('meditations')
    .update(patch)
    .eq('id', meditationId)
    .eq('status', 'generating_script')
    .lt('updated_at', staleBefore)
    .select('id')
    .maybeSingle();
  return stale.data?.id ?? null;
}

async function loadRecent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  checkinId: string,
): Promise<Array<{ moods: string[]; energyLevel: number; focus: string; createdOn: string }> | null> {
  const { data, error } = await supabase
    .from('daily_checkins')
    .select('moods, energy_level, focus, created_at')
    .eq('user_id', userId)
    .neq('id', checkinId)
    .order('created_at', { ascending: false })
    .limit(GENERATION_LIMITS.historyCheckins);
  if (error) return null;
  return (data ?? []).map((row) => ({
    moods: row.moods ?? [],
    energyLevel: row.energy_level,
    focus: row.focus,
    createdOn: String(row.created_at).slice(0, 10),
  }));
}

async function requestScript(
  apiKey: string,
  context: Parameters<typeof buildGenerationMessages>[0],
  correction?: string[],
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; timeout?: boolean; statusCode?: number }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: buildGenerationMessages(context, correction),
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'meditation_script',
            strict: true,
            schema: SCRIPT_RESPONSE_SCHEMA,
          },
        },
      }),
    });
    if (!response.ok) return { ok: false, statusCode: response.status };
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { ok: false, statusCode: response.status };
    return { ok: true, value: JSON.parse(content) };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    return { ok: false, timeout };
  } finally {
    clearTimeout(timer);
  }
}

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  meditationId: string,
  errorCode: string,
) {
  await supabase
    .from('meditations')
    .update({ status: 'failed', error_code: errorCode, script_json: null })
    .eq('id', meditationId);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
