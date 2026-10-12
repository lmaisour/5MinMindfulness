# Environment & credentials checklist (future phases)

Do not commit secrets. Mobile app receives only public anon keys / publishable tokens.

## Supabase (Phase 2+)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Edge Functions / workers only)
- Apple Sign In: Services ID, key, team ID
- Google Sign In: iOS/Android OAuth client IDs
- Storage bucket for private meditation audio

## OpenAI (Phase 3–4)

- `OPENAI_API_KEY` (backend only)
- Model IDs for structured script generation and TTS

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
