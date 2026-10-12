# 5MinMindfulness (mobile)

Expo React Native client for personalized 5-minute mindfulness meditations.

## Run

```bash
cp .env.example .env   # add Supabase URL + publishable key
npm install
npx expo start
```

## Phase 2 notes

- Auth: `src/providers/AuthProvider.tsx`, `src/services/auth.ts`
- Supabase client: `src/lib/supabase.ts` (SQLite localStorage session persistence)
- Check-ins: `src/services/checkins.ts` → `daily_checkins`
- Duration config: `src/constants/meditation.ts` (300s)
- Setup guide: `../docs/PHASE2_SUPABASE_SETUP.md`

## Scripts

```bash
npm run typecheck
node scripts/validate-checkin.mjs
```
