# 5MinMindfulness

A meditation made for you, based on how you feel today.

**5MinMindfulness** creates personalized **5-minute** guided meditations from a quick emotional check-in.

## Status

| Phase | Status |
| --- | --- |
| Phase 1 — Mobile UI | Complete |
| Phase 2 — Auth + Database | Implemented in code (requires your Supabase project config) |
| Phase 3+ — AI audio | Not started |

## Project layout

```
docs/                 Plans, setup guides, generation specs
mobile/               Expo SDK 57 + TypeScript + Expo Router app
supabase/             SQL migrations, Edge Functions, RLS tests
```

## Meditation duration

Single source of truth: `mobile/src/constants/meditation.ts`

| Setting | Value |
| --- | --- |
| Target duration | 300 seconds (5 minutes) |
| Acceptable range | 285–315 seconds |

## Launch locally

1. Configure Supabase — see `docs/PHASE2_SUPABASE_SETUP.md`
2. Create `mobile/.env` from `mobile/.env.example`
3. Apply migrations in `supabase/migrations/`
4. Run:

```bash
cd mobile
npm install
npx expo start
```

Typecheck:

```bash
cd mobile
npx tsc --noEmit
```

## Phase 2 highlights

- Anonymous auth on “Create My Meditation”
- Email OTP, Google OAuth, Apple (iOS) sign-in
- Anonymous → permanent account linking (requires Manual linking in Supabase)
- `daily_checkins` persistence with RLS
- Profile preferences in `user_preferences`
- Library / Insights read real user data (empty until Phase 3 generation)
- Simulated generation UI does **not** insert fake ready meditations
- Account deletion via `supabase/functions/delete-account`

## Next step

**Phase 3 — AI meditation generation** (Trigger.dev + OpenAI structured scripts)
