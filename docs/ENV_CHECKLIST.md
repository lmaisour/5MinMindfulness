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

## OpenAI (Phase 3–4)

- `OPENAI_API_KEY` (backend only)
- Model IDs for structured script generation and TTS
- Target meditation audio: 300 seconds (acceptable 285–315); see `docs/MEDITATION_GENERATION.md`

## Trigger.dev (Phase 3–4)

- `TRIGGER_SECRET_KEY`
- `TRIGGER_PROJECT_ID`
- Worker env for FFmpeg-capable audio jobs

## Analytics & monitoring (Phase 7)

- `EXPO_PUBLIC_POSTHOG_KEY` / host
- `SENTRY_DSN` (mobile + backend)

## Expo / EAS

- EAS project ID in `mobile/app.config.ts` (`extra.eas.projectId`)
- The `development` build profile in `mobile/eas.json` uses the EAS `development` environment
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set on that environment as plain text, using the same public values as `mobile/.env`
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in EAS environments used by the mobile app
- Apple Developer / Google Play credentials for production builds
- Sign in with Apple capability
- Google OAuth client IDs
