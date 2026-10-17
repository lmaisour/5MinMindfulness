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

The function uses `gpt-4.1-mini` for structured scripts. Audio and TTS keys are not part of Phase 3A.

## Trigger.dev (Phase 3–4)

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_ID`
- Worker env for FFmpeg-capable audio jobs

## Analytics & monitoring (Phase 7)

- `EXPO_PUBLIC_POSTHOG_KEY` / host
- `SENTRY_DSN` (mobile + backend)

## Expo / EAS

- EAS project ID
- Apple Developer / Google Play credentials for production builds
- Sign in with Apple capability
- Google OAuth client IDs
