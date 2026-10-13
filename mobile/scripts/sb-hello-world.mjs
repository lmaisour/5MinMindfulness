import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

const { data: auth, error: authError } = await supabase.auth.signInAnonymously();
if (authError) throw authError;
const userId = auth.user.id;
console.log('auth ok', userId);

const { data: checkin, error: checkinError } = await supabase
  .from('daily_checkins')
  .insert({
    user_id: userId,
    name: 'Test',
    moods: ['Hopeful'],
    energy_level: 6,
    focus: 'Mindfulness',
    notes: null,
  })
  .select('*')
  .single();
if (checkinError) throw checkinError;
console.log('checkin ok', checkin.id);

const { data: prefs, error: prefsError } = await supabase
  .from('user_preferences')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
if (prefsError) throw prefsError;
console.log('preferences', prefs ? 'ok' : 'missing (trigger may not have fired)');

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
if (profileError) throw profileError;
console.log('profile', profile ? 'ok' : 'missing');

// RLS isolation smoke: unauthenticated should not see rows
const anon = createClient(url, key);
const { data: leaked, error: leakError } = await anon
  .from('daily_checkins')
  .select('id')
  .eq('id', checkin.id);
console.log(
  'unauthenticated read',
  leakError ? `blocked/error: ${leakError.message}` : `rows=${(leaked || []).length}`,
);

await supabase.auth.signOut();
console.log('hello-world: ok');
