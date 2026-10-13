const CONFLICT_CODES = new Set([
  'email_exists',
  'user_already_exists',
  'identity_already_exists',
  'email_conflict_identity_not_deletable',
]);

export const ACCOUNT_CONFLICT_MESSAGE =
  'This sign-in already belongs to another account. Sign out of this guest session and sign in with that account. Guest check-ins are not moved automatically.';

export function isAccountConflict(error: { code?: string; message?: string }) {
  if (error.code && CONFLICT_CODES.has(error.code)) return true;
  const message = error.message?.toLowerCase() ?? '';
  return (
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists') ||
    message.includes('identity is already') ||
    message.includes('email address is already')
  );
}
