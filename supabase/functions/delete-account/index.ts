// Supabase Edge Function: delete-account
// Deploy with: supabase functions deploy delete-account --use-api
// Hosted functions receive SUPABASE_SERVICE_ROLE_KEY. Never ship that key to the mobile app.

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // The caller JWT is the only identity. A user id in the body is ignored.
    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const steps = [
      () => admin.from('listening_history').delete().eq('user_id', userId),
      () => admin.from('meditations').delete().eq('user_id', userId),
      () => admin.from('daily_checkins').delete().eq('user_id', userId),
      () => admin.from('user_preferences').delete().eq('user_id', userId),
      () => admin.from('profiles').delete().eq('id', userId),
    ];
    for (const step of steps) {
      const { error } = await step();
      if (error) return json({ error: error.message }, 500);
    }

    // Optional: remove private storage objects for this user if a bucket exists.
    try {
      const bucket = 'meditation-audio';
      const { data: files } = await admin.storage.from(bucket).list(userId);
      if (files?.length) {
        await admin.storage
          .from(bucket)
          .remove(files.map((file) => `${userId}/${file.name}`));
      }
    } catch {
      // Storage may not exist until Phase 4 — ignore.
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ ok: true, deletedUserId: userId }, 200);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
    );
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
