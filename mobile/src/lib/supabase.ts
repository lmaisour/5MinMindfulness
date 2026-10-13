import 'expo-sqlite/localStorage/install';

export {
  getSupabase,
  supabase,
  startAuthAutoRefresh,
  type AuthUser,
  type AuthSession,
} from '@/lib/supabase-core';
