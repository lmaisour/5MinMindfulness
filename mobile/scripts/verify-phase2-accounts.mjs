/**
 * Live Phase 2 account checks: session restore, email upgrade, conflict, deletion, RLS.
 * Requires mobile/.env. Deletes the accounts it creates when the Edge Function is deployed.
 * Run: node scripts/verify-phase2-accounts.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('mobile/.env is missing Supabase client values');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function client(storage) {
  return createClient(url, key, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  };
}

async function deleteAccount(accessToken) {
  const response = await fetch(`${url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000' }),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const cleanupTokens = [];

async function cleanup() {
  while (cleanupTokens.length) {
    const token = cleanupTokens.pop();
    const removed = await deleteAccount(token);
    console.log('cleanup', removed.status, removed.body?.deletedUserId ?? removed.body?.error ?? '');
  }
}

try {
const storage = memoryStorage();
const firstLaunch = client(storage);
const started = await firstLaunch.auth.signInAnonymously();
if (started.error) throw started.error;
cleanupTokens.push(started.data.session.access_token);
const restoredClient = client(storage);
const restored = await restoredClient.auth.getSession();
if (restored.error) throw restored.error;
assert(restored.data.session?.user.id === started.data.user.id, 'restart created a different user');
assert(restored.data.session.user.is_anonymous === true, 'restored session was not anonymous');
console.log('session restore ok', started.data.user.id);
const restartDeleted = await deleteAccount(started.data.session.access_token);
assert(restartDeleted.status === 200, `restart user delete returned ${restartDeleted.status}`);
cleanupTokens.pop();

const owner = client(memoryStorage());
const ownerAuth = await owner.auth.signInAnonymously();
if (ownerAuth.error) throw ownerAuth.error;
const userId = ownerAuth.data.user.id;
const accessToken = ownerAuth.data.session.access_token;
cleanupTokens.push(accessToken);

const named = await owner.from('profiles').update({ display_name: 'Avery' }).eq('id', userId).select('display_name').single();
if (named.error) throw named.error;
assert(named.data.display_name === 'Avery', 'display name was not saved');

const prefs = await owner
  .from('user_preferences')
  .update({ personalization_enabled: false, notifications_enabled: true })
  .eq('user_id', userId)
  .select('personalization_enabled, notifications_enabled')
  .single();
if (prefs.error) throw prefs.error;
assert(prefs.data.personalization_enabled === false, 'personalization was not saved');
assert(prefs.data.notifications_enabled === true, 'notifications were not saved');

const checkin = await owner
  .from('daily_checkins')
  .insert({
    user_id: userId,
    name: 'Avery',
    moods: ['Hopeful'],
    energy_level: 7,
    focus: 'Gratitude',
    notes: 'keep this',
  })
  .select('id')
  .single();
if (checkin.error) throw checkin.error;

const pending = await owner
  .from('meditations')
  .insert({
    user_id: userId,
    checkin_id: checkin.data.id,
    title: 'Not ready',
    status: 'pending',
    target_duration_seconds: 300,
  })
  .select('id, status')
  .single();
if (pending.error) throw pending.error;

const library = await owner.from('meditations').select('id').eq('user_id', userId).eq('status', 'ready');
if (library.error) throw library.error;
assert(library.data.length === 0, 'a simulated or pending meditation appeared as ready');
console.log('library excludes pending meditations');

const email = `phase2-upgrade-${userId.slice(0, 8)}@mailinator.com`;
let emailSendLimited = false;
let linked;
try {
  linked = await owner.auth.updateUser({ email }, { emailRedirectTo: 'fiveminmindfulness://auth' });
} catch (error) {
  const code = error?.code ?? '';
  const message = error?.message ?? String(error);
  if (code === 'over_email_send_rate_limit' || message.toLowerCase().includes('rate limit')) {
    emailSendLimited = true;
    console.log('email upgrade skipped: over_email_send_rate_limit');
  } else {
    throw error;
  }
}
if (!emailSendLimited && linked?.error) {
  const code = linked.error.code ?? '';
  const message = linked.error.message ?? '';
  if (code === 'over_email_send_rate_limit' || message.toLowerCase().includes('rate limit')) {
    emailSendLimited = true;
    console.log('email upgrade skipped: over_email_send_rate_limit');
  } else {
    throw linked.error;
  }
}

if (!emailSendLimited) {
  assert(linked.data.user?.id === userId, 'updateUser changed the user id');
  console.log('email link requested', email);

  let token = null;
  for (let attempt = 0; attempt < 8 && !token; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const inbox = await fetch(`https://mailinator.com/api/v2/domains/public/inboxes/${email.split('@')[0]}`);
    const listing = await inbox.json();
    const message = listing.msgs?.[0];
    if (!message) continue;
    const detail = await fetch(`https://mailinator.com/api/v2/domains/public/messages/${message.id}`);
    const mail = await detail.json();
    const html = (mail.parts ?? []).map((part) => part.body ?? '').join('\n');
    const href = html.match(/href="([^"]*supabase\.co\/auth\/v1\/verify[^"]*)"/)?.[1];
    if (!href) continue;
    const parsed = new URL(href.replaceAll('&amp;', '&'));
    token = parsed.searchParams.get('token');
  }

  assert(token, 'confirmation email did not arrive');
  let verified = await owner.auth.verifyOtp({ token_hash: token, type: 'email_change' });
  if (verified.error) {
    verified = await owner.auth.verifyOtp({ email, token, type: 'email_change' });
  }
  if (verified.error) throw verified.error;
  assert(verified.data.user?.id === userId, 'email verification changed the user id');
  assert(verified.data.user.is_anonymous === false, 'upgraded user is still anonymous');

  const kept = await owner.from('daily_checkins').select('id, notes').eq('id', checkin.data.id).single();
  if (kept.error) throw kept.error;
  assert(kept.data.notes === 'keep this', 'check-in was lost during upgrade');
  const keptPrefs = await owner
    .from('user_preferences')
    .select('personalization_enabled')
    .eq('user_id', userId)
    .single();
  if (keptPrefs.error) throw keptPrefs.error;
  assert(keptPrefs.data.personalization_enabled === false, 'preferences were lost during upgrade');
  const keptMeditation = await owner.from('meditations').select('id').eq('id', pending.data.id).single();
  if (keptMeditation.error) throw keptMeditation.error;
  console.log('upgrade preserved user, check-in, preferences, and meditation');

  const guest = client(memoryStorage());
  const guestAuth = await guest.auth.signInAnonymously();
  if (guestAuth.error) throw guestAuth.error;
  const guestId = guestAuth.data.user.id;
  cleanupTokens.push(guestAuth.data.session.access_token);
  const guestCheckin = await guest
    .from('daily_checkins')
    .insert({
      user_id: guestId,
      moods: ['Tired'],
      energy_level: 4,
      focus: 'Sleep',
    })
    .select('id')
    .single();
  if (guestCheckin.error) throw guestCheckin.error;

  let conflict;
  try {
    conflict = await guest.auth.updateUser({ email });
  } catch (error) {
    conflict = { error };
  }
  assert(conflict.error, 'linking an existing email should fail');
  const guestStill = await guest.auth.getUser();
  if (guestStill.error) throw guestStill.error;
  assert(guestStill.data.user.id === guestId, 'conflict handling switched the guest user');
  assert(guestStill.data.user.is_anonymous === true, 'conflict handling upgraded the guest');
  const guestRow = await guest.from('daily_checkins').select('id').eq('id', guestCheckin.data.id);
  if (guestRow.error) throw guestRow.error;
  assert(guestRow.data.length === 1, 'guest check-in disappeared during the conflict');
  const ownerRow = await owner.from('daily_checkins').select('id').eq('id', checkin.data.id);
  if (ownerRow.error) throw ownerRow.error;
  assert(ownerRow.data.length === 1, 'permanent account check-in disappeared during the conflict');
  const hidden = await guest.from('daily_checkins').select('id').eq('id', checkin.data.id);
  if (hidden.error) throw hidden.error;
  assert(hidden.data.length === 0, 'guest could read the other account check-in');
  console.log('existing-account conflict kept the accounts separate', conflict.error.code || conflict.error.message);
}

const unauthenticated = await deleteAccount('not-a-jwt');
assert(unauthenticated.status === 401, `delete without a session returned ${unauthenticated.status}`);

const removed = await deleteAccount(accessToken);
assert(removed.status === 200, `delete account returned ${removed.status} ${JSON.stringify(removed.body)}`);
assert(removed.body.deletedUserId === userId, 'delete account removed a different user');
assert(removed.body.deletedUserId !== '00000000-0000-0000-0000-000000000000', 'delete honored a body user id');
const afterDelete = await owner.auth.getUser();
assert(afterDelete.error || !afterDelete.data.user, 'deleted user session was still accepted');
console.log('account deletion ok', userId);
const ownerIndex = cleanupTokens.indexOf(accessToken);
if (ownerIndex >= 0) cleanupTokens.splice(ownerIndex, 1);

console.log(emailSendLimited ? 'phase2 accounts: ok (email inbox upgrade not run)' : 'phase2 accounts: ok');
} finally {
  await cleanup();
}
