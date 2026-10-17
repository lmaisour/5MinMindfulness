/**
 * User-facing narration errors. Keep each string identical to audioFailureMessage
 * in supabase/functions/_shared/audioAssembly.ts.
 */
const NARRATION_FAILURES: Record<string, string> = {
  elevenlabs_credits: 'ElevenLabs is out of credits. Add credits to your ElevenLabs account, then try again.',
  elevenlabs_auth: 'The narration service rejected the API key. Update the ElevenLabs secret, then try again.',
  elevenlabs_rate_limit: 'ElevenLabs is rate limiting requests. Wait a minute and try again.',
  network_failed: 'The narration service could not be reached. Try again.',
  elevenlabs_timeout: 'Narration took too long. You can continue without starting over.',
  storage_failed: 'The audio could not be saved. Try again.',
  save_failed: 'The meditation could not be updated. Try again.',
  audio_format: 'The narration audio could not be read. You can try again.',
  duration_out_of_range: 'The narration is outside the 5-minute window, so it was not marked ready.',
  elevenlabs_failed: 'ElevenLabs rejected the request before any audio was saved. You can try again.',
  hourly_quota: 'You have reached the hourly narration limit. Try again in an hour.',
  daily_quota: 'You have reached today’s narration limit. Try again tomorrow.',
  attempt_quota: 'This meditation has been recorded too many times.',
};

export function narrationFailureMessage(errorCode: string | null | undefined, fallback?: string | null): string {
  if (errorCode && NARRATION_FAILURES[errorCode]) return NARRATION_FAILURES[errorCode];
  if (fallback && fallback.trim()) return fallback;
  return 'Narration failed. You can continue without starting over.';
}
