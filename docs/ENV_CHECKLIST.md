# Environment & credentials checklist

Do not commit secrets. Mobile app receives only public publishable/anon keys.

## Mobile (Phase 2+)

| Variable | Where | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `mobile/.env` | Project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `mobile/.env` | Publishable or anon key |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | optional alias | Accepted by client if publishable key unset |

## Supabase Edge Functions (server only)

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Injected by Supabase runtime |
| `SUPABASE_ANON_KEY` | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Set via `supabase secrets set` — never ship to mobile |

## OpenAI (Phase 3A script generation)

| Variable | Where | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Supabase secret for `generate-meditation` | Never put this in the mobile app or in git |

The function uses `gpt-4.1-mini` for structured scripts.

## ElevenLabs (Phase 3B audio)

| Variable | Where | Notes |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | Supabase secret for `generate-audio` | Required. Never put this in the mobile app or in git |
| `ELEVENLABS_VOICE_ID` | Optional secret | Defaults to `KGZeK6FsnWQdrkDHnDNA` |
| `ELEVENLABS_MODEL_ID` | Optional secret | Defaults to `eleven_multilingual_v2` |
| `ELEVENLABS_OUTPUT_FORMAT` | Optional secret | Defaults to `wav_24000` |
| `ELEVENLABS_STABILITY` | Optional secret | Default `0.7` |
| `ELEVENLABS_SIMILARITY_BOOST` | Optional secret | Default `0.75` |
| `ELEVENLABS_STYLE` | Optional secret | Default `0` |
| `ELEVENLABS_SPEED` | Optional secret | Default `0.9`, clamped to `0.7`–`1.0` |
| `ELEVENLABS_SPEAKER_BOOST` | Optional secret | Default on. Set `false` to disable |

Narration is assembled in the Edge Function. FFmpeg is not required.

## Analytics & monitoring (Phase 7)

- `EXPO_PUBLIC_POSTHOG_KEY` / host
- `SENTRY_DSN` (mobile + backend)

## Expo / EAS

- EAS project ID
- Apple Developer / Google Play credentials for production builds
- Sign in with Apple capability
- Google OAuth client IDs
- Daily reminders use a local `expo-notifications` schedule. Adding that native module requires a new iOS development build. No remote push token or notification campaign is used.
