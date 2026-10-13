import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const DEAD_SESSION_CODES = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
]);

function isDeadSession(error: { status?: number; code?: string }) {
  return error.status === 401 || (error.code != null && DEAD_SESSION_CODES.has(error.code));
}

let anonymousSignIn: Promise<Awaited<ReturnType<typeof signInAnonymously>>> | null = null;

async function signInAnonymously() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session?.user?.is_anonymous) {
    throw new Error('Anonymous sign-in did not return an anonymous session.');
  }
  return data.session;
}

/**
 * Reuse a valid session, including an anonymous one.
 * Concurrent callers share one sign-in so a double tap cannot create two users.
 */
export function ensureAnonymousSession() {
  if (!anonymousSignIn) {
    anonymousSignIn = resolveAnonymousSession().finally(() => {
      anonymousSignIn = null;
    });
  }
  return anonymousSignIn;
}

async function resolveAnonymousSession() {
  const supabase = getSupabase();
  const { data: existing, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (existing.session?.user) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userData.user) return existing.session;
    if (userError && !isDeadSession(userError)) throw userError;
    await supabase.auth.signOut();
  }

  return signInAnonymously();
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

function getRedirectTo() {
  return AuthSession.makeRedirectUri({ scheme: 'fiveminmindfulness' });
}

export async function sendEmailOtp(email: string) {
  const redirectTo = getRedirectTo();
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
  return { redirectTo };
}

export async function verifyEmailOtp(email: string, token: string) {
  const supabase = getSupabase();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;

  if (
    currentUser?.is_anonymous &&
    data.user &&
    data.user.id !== currentUser.id
  ) {
    throw new Error(
      'This email belongs to a different account. Sign out of the guest session and sign in with that email, or use a different email to preserve this guest history. Enable Manual identity linking in Supabase Auth for seamless upgrades.',
    );
  }

  return data;
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTo = getRedirectTo();

  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Google link did not return a URL.');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled.');
    }
    await supabase.auth.getSession();
    return result;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in did not return a URL.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }
  await supabase.auth.getSession();
  return result;
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is available on iOS devices.');
  }

  const supabase = getSupabase();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  if (user?.is_anonymous && data.user && data.user.id !== user.id) {
    throw new Error(
      'Apple identity resolved to a different account. Enable Manual linking in Supabase Auth so guest data can be preserved, or continue with the existing Apple account separately.',
    );
  }

  return data;
}

export async function requestAccountDeletion() {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error('You must be signed in to delete your account.');
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) throw error;

  await supabase.auth.signOut();
  return data;
}
