import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(url, key);

const anon = await supabase.auth.signInAnonymously();
console.log('anonymous:', anon.error ? `ERROR: ${anon.error.message}` : `ok user=${anon.data.user?.id} is_anonymous=${anon.data.user?.is_anonymous}`);

if (anon.data.session) {
  for (const table of ['profiles', 'daily_checkins', 'meditations', 'user_preferences', 'listening_history']) {
    const { error } = await supabase.from(table).select('*').limit(1);
    console.log(`table ${table}:`, error ? `ERROR: ${error.code || ''} ${error.message}` : 'ok');
  }
  await supabase.auth.signOut();
}
