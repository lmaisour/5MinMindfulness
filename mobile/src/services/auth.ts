import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ACCOUNT_CONFLICT_MESSAGE, isAccountConflict } from '@/lib/accountConflict';
import { parseAuthCallback } from '@/lib/authCallback';
import { getSupabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type EmailLinkType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

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

export type EmailAuthMode = 'link' | 'signin';

export type SendEmailResult =
  | { status: 'code_sent'; mode: EmailAuthMode }
  | { status: 'linked' };

async function currentSession() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function restoreSession(session: Session | null) {
  if (!session) return;
  const { error } = await getSupabase().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
}

function rejectIfUserChanged(previous: Session | null, nextUserId: string | undefined) {
  if (previous?.user.id && nextUserId && nextUserId !== previous.user.id) {
    throw new Error(ACCOUNT_CONFLICT_MESSAGE);
  }
}

export async function sendEmailOtp(email: string): Promise<SendEmailResult> {
  const supabase = getSupabase();
  const trimmed = email.trim();
  const redirectTo = getRedirectTo();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError && !isDeadSession(userError)) throw userError;

  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.updateUser(
      { email: trimmed },
      { emailRedirectTo: redirectTo },
    );
    if (error) {
      if (isAccountConflict(error)) throw new Error(ACCOUNT_CONFLICT_MESSAGE);
      throw error;
    }
    if (
      data.user &&
      data.user.id === user.id &&
      !data.user.is_anonymous &&
      data.user.email?.toLowerCase() === trimmed.toLowerCase()
    ) {
      return { status: 'linked' };
    }
    return { status: 'code_sent', mode: 'link' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) {
    if (isAccountConflict(error)) throw new Error(ACCOUNT_CONFLICT_MESSAGE);
    throw error;
  }
  return { status: 'code_sent', mode: 'signin' };
}

export async function verifyEmailOtp(email: string, token: string, mode: EmailAuthMode) {
  const supabase = getSupabase();
  const previous = await currentSession();
  const type = mode === 'link' ? 'email_change' : 'email';
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type,
  });
  if (error) throw error;

  try {
    rejectIfUserChanged(previous, data.user?.id);
  } catch (conflict) {
    await restoreSession(previous);
    throw conflict;
  }

  return data;
}

export async function completeAuthRedirect(url: string) {
  const callback = parseAuthCallback(url);
  if (!callback) return false;

  const supabase = getSupabase();
  const previous = await currentSession();

  if (callback.kind === 'code') {
    const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);
    if (error) throw error;
    try {
      rejectIfUserChanged(previous, data.session?.user.id);
    } catch (conflict) {
      await restoreSession(previous);
      throw conflict;
    }
    return true;
  }

  if (callback.kind === 'token_hash') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: callback.tokenHash,
      type: callback.type as EmailLinkType,
    });
    if (error) throw error;
    try {
      rejectIfUserChanged(previous, data.user?.id);
    } catch (conflict) {
      await restoreSession(previous);
      throw conflict;
    }
    return true;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: callback.accessToken,
    refresh_token: callback.refreshToken,
  });
  if (error) throw error;
  try {
    rejectIfUserChanged(previous, data.user?.id);
  } catch (conflict) {
    await restoreSession(previous);
    throw conflict;
  }
  return true;
}

async function finishBrowserAuth(url: string, redirectTo: string) {
  const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in was cancelled.');
  }
  const completed = await completeAuthRedirect(result.url);
  if (!completed) {
    throw new Error('Sign-in did not return a session.');
  }
}

async function appleCredentials() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token.');
  }
  return { identityToken: credential.identityToken, rawNonce };
}

export async function signInWithGoogle() {
  const supabase = getSupabase();
  const redirectTo = getRedirectTo();
  const previous = await currentSession();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError && !isDeadSession(userError)) throw userError;

  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      if (isAccountConflict(error)) throw new Error(ACCOUNT_CONFLICT_MESSAGE);
      throw error;
    }
    if (!data.url) throw new Error('Google link did not return a URL.');
    await finishBrowserAuth(data.url, redirectTo);
    const { data: linked, error: linkedError } = await supabase.auth.getUser();
    if (linkedError) throw linkedError;
    if (!linked.user || linked.user.id !== user.id) {
      await restoreSession(previous);
      throw new Error(ACCOUNT_CONFLICT_MESSAGE);
    }
    if (linked.user.is_anonymous) {
      throw new Error('Google sign-in did not attach to this guest session.');
    }
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in did not return a URL.');
  await finishBrowserAuth(data.url, redirectTo);
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is available on iOS devices.');
  }

  const supabase = getSupabase();
  const previous = await currentSession();
  const { identityToken, rawNonce } = await appleCredentials();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError && !isDeadSession(userError)) throw userError;

  if (user?.is_anonymous) {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce,
    });
    if (error) {
      if (isAccountConflict(error)) throw new Error(ACCOUNT_CONFLICT_MESSAGE);
      throw error;
    }
    const { data: linked, error: linkedError } = await supabase.auth.getUser();
    if (linkedError) throw linkedError;
    if (!linked.user || linked.user.id !== user.id) {
      await restoreSession(previous);
      throw new Error(ACCOUNT_CONFLICT_MESSAGE);
    }
    if (linked.user.is_anonymous) {
      await restoreSession(previous);
      throw new Error('Apple sign-in did not attach to this guest session.');
    }
    return data;
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
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
