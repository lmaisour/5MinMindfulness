export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string; type: string }
  | { kind: 'session'; accessToken: string; refreshToken: string };

/** Reads an OAuth or email redirect without contacting Supabase. */
export function parseAuthCallback(url: string): AuthCallback | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash);
  const read = (name: string) => query.get(name) ?? hash.get(name);

  const code = read('code');
  if (code) return { kind: 'code', code };

  const tokenHash = read('token_hash');
  const type = read('type');
  if (tokenHash && type) return { kind: 'token_hash', tokenHash, type };

  const accessToken = read('access_token');
  const refreshToken = read('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'session', accessToken, refreshToken };
  }

  return null;
}
