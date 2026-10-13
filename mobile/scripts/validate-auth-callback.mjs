/**
 * Pure checks for auth redirect parsing and conflict detection.
 * Run: node scripts/validate-auth-callback.mjs
 */
const callbackUrl = new URL('../src/lib/authCallback.ts', import.meta.url).href;
const conflictUrl = new URL('../src/lib/accountConflict.ts', import.meta.url).href;
const { parseAuthCallback } = await import(callbackUrl);
const { isAccountConflict, ACCOUNT_CONFLICT_MESSAGE } = await import(conflictUrl);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const code = parseAuthCallback('fiveminmindfulness://auth?code=abc123');
assert(code?.kind === 'code' && code.code === 'abc123', 'code callback');

const hash = parseAuthCallback(
  'fiveminmindfulness://auth#access_token=access&refresh_token=refresh',
);
assert(
  hash?.kind === 'session' && hash.accessToken === 'access' && hash.refreshToken === 'refresh',
  'session hash callback',
);

const email = parseAuthCallback(
  'fiveminmindfulness://auth?token_hash=hashed&type=email_change',
);
assert(
  email?.kind === 'token_hash' && email.tokenHash === 'hashed' && email.type === 'email_change',
  'email change callback',
);

assert(parseAuthCallback('fiveminmindfulness://check-in/name') === null, 'unrelated url');
assert(parseAuthCallback('not a url') === null, 'invalid url');

assert(isAccountConflict({ code: 'email_exists' }), 'email_exists');
assert(isAccountConflict({ code: 'identity_already_exists' }), 'identity exists');
assert(
  isAccountConflict({ message: 'A user with this email address has already been registered' }),
  'registered message',
);
assert(!isAccountConflict({ code: 'over_email_send_rate_limit', message: 'rate limit' }), 'rate limit');
assert(ACCOUNT_CONFLICT_MESSAGE.includes('not moved'), 'conflict copy keeps accounts separate');

console.log('auth callback checks: ok');
