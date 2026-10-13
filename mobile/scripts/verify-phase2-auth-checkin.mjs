/**
 * Live check of anonymous auth and check-in persistence.
 * Requires mobile/.env. Creates anonymous users; it does not delete them.
 * Run: node scripts/verify-phase2-auth-checkin.mjs
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
if (!url || !key) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in mobile/.env');
}

function client() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const owner = client();
const anon = await owner.auth.signInAnonymously();
if (anon.error) throw anon.error;
const userId = anon.data.user.id;
assert(anon.data.user.is_anonymous === true, 'sign-in was not anonymous');
assert(anon.data.session, 'anonymous sign-in returned no session');
console.log('anonymous auth ok', userId);

const profile = await owner.from('profiles').select('id').eq('id', userId).maybeSingle();
if (profile.error) throw profile.error;
assert(profile.data?.id === userId, 'profile trigger did not create a row');

const prefs = await owner
  .from('user_preferences')
  .select('user_id, personalization_enabled, notifications_enabled')
  .eq('user_id', userId)
  .maybeSingle();
if (prefs.error) throw prefs.error;
assert(prefs.data?.user_id === userId, 'preferences trigger did not create a row');
assert(prefs.data.personalization_enabled === true, 'personalization default mismatch');
assert(prefs.data.notifications_enabled === false, 'notifications default mismatch');
console.log('profile and preferences ok');

const saved = await owner
  .from('daily_checkins')
  .insert({
    user_id: userId,
    name: 'Phase2',
    moods: ['Anxious', 'Tired'],
    energy_level: 3,
    focus: 'Stress Relief',
    notes: 'private note',
  })
  .select('id, user_id, moods, energy_level, focus, notes')
  .single();
if (saved.error) throw saved.error;
assert(saved.data.user_id === userId, 'check-in saved for a different user');
assert(saved.data.notes === 'private note', 'check-in notes were not persisted');
console.log('check-in persisted', saved.data.id);

const reread = await owner.from('daily_checkins').select('id').eq('id', saved.data.id);
if (reread.error) throw reread.error;
assert(reread.data.length === 1, 'owner could not read the saved check-in');

const restored = client();
const session = await restored.auth.setSession({
  access_token: anon.data.session.access_token,
  refresh_token: anon.data.session.refresh_token,
});
if (session.error) throw session.error;
assert(session.data.user?.id === userId, 'restored session changed user id');
const restoredRead = await restored.from('daily_checkins').select('id').eq('id', saved.data.id);
if (restoredRead.error) throw restoredRead.error;
assert(restoredRead.data.length === 1, 'restored anonymous session could not read the check-in');
console.log('session restore ok');

const other = client();
const otherAuth = await other.auth.signInAnonymously();
if (otherAuth.error) throw otherAuth.error;
const otherId = otherAuth.data.user.id;
assert(otherId !== userId, 'second anonymous sign-in reused the same user');

const leaked = await other.from('daily_checkins').select('id').eq('id', saved.data.id);
if (leaked.error) throw leaked.error;
assert(leaked.data.length === 0, 'another user could read the check-in');

const crossed = await other
  .from('daily_checkins')
  .insert({
    user_id: userId,
    moods: ['Sad'],
    energy_level: 2,
    focus: 'Sleep',
  })
  .select('id');
assert(crossed.error, 'inserting a check-in for another user should fail');
console.log('cross-user write blocked', crossed.error.code || crossed.error.message);

const tamper = await other
  .from('daily_checkins')
  .update({ notes: 'tampered' })
  .eq('id', saved.data.id)
  .select('id');
if (tamper.error) throw tamper.error;
assert((tamper.data ?? []).length === 0, 'another user updated the check-in');

const stillPrivate = await owner.from('daily_checkins').select('notes').eq('id', saved.data.id).single();
if (stillPrivate.error) throw stillPrivate.error;
assert(stillPrivate.data.notes === 'private note', 'check-in notes changed');
console.log('cross-user read and update blocked');

const anonymousKey = client();
const publicRead = await anonymousKey.from('daily_checkins').select('id').eq('id', saved.data.id);
if (publicRead.error) throw publicRead.error;
assert(publicRead.data.length === 0, 'unauthenticated client read a check-in');
console.log('unauthenticated read blocked');

for (const [label, row] of [
  ['empty moods', { user_id: userId, moods: [], energy_level: 5, focus: 'Mindfulness' }],
  ['energy too high', { user_id: userId, moods: ['Hopeful'], energy_level: 11, focus: 'Gratitude' }],
  ['invalid focus', { user_id: userId, moods: ['Happy'], energy_level: 5, focus: 'Therapy' }],
]) {
  const rejected = await owner.from('daily_checkins').insert(row).select('id');
  assert(rejected.error, `${label} was accepted`);
  console.log('constraint rejected', label);
}

const rpc = await owner.rpc('handle_new_user');
assert(rpc.error, 'anonymous user could execute handle_new_user');
console.log('handle_new_user rpc blocked', rpc.error.code || rpc.error.message);

await owner.auth.signOut();
await other.auth.signOut();
console.log('phase2 auth and check-ins: ok');
