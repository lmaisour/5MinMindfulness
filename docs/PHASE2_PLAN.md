# Phase 2 — Implementation plan

## Audit summary (Phase 1)

| Area | Current state | Phase 2 approach |
| --- | --- | --- |
| Navigation | Expo Router: welcome → tabs / check-in / generation / player / sign-in | Keep routes; gate “Create My Meditation” with anonymous auth |
| Auth | Mock `setGuestLinked()` in `AppStateContext` | Replace with Supabase Auth (anonymous, email OTP, Apple, Google, linking) |
| Check-in | In-memory `draft` in `AppStateContext` | Keep draft UX; persist to `daily_checkins` on review submit |
| Library | `MOCK_MEDITATIONS` in context | Fetch user `meditations` only; empty until Phase 3 |
| Insights | `MOCK_INSIGHTS` | Compute from real check-ins / listening_history |
| Profile | Local switches + mock linking | Real profile + `user_preferences` |
| Generation | Simulated status machine writing mock meditations | Keep UI simulation; **do not** insert fake `ready` rows |
| Duration | `constants/meditation.ts` (300s) | Unchanged |

## Risks

- Session restore race before first navigation
- Duplicate check-in submits
- Mixing mock library data with real empty state
- Account linking conflicts when email already exists

## Order

1. Client + env  
2. Migrations + RLS  
3. Anonymous auth + session  
4. Check-in persistence  
5. Profile / Library / Insights  
6. Email / Apple / Google + upgrades  
7. Account deletion Edge Function  
8. Tests + docs  
