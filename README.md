# 5MinMindfulness

A meditation made for you, based on how you feel today.

**5MinMindfulness** creates personalized **5-minute** guided meditations from a quick emotional check-in.

## Status

**Phase 1 complete (frontend mock):** Expo React Native app with polished navigation through welcome → check-in → generation → player, plus Home / Library / Insights / Profile.

Phases 2–7 (Supabase, Trigger.dev, OpenAI, real audio, analytics) are intentionally not started.

## Project layout

```
docs/                 Architecture plan, duration specs, env checklist
mobile/               Expo SDK 57 + TypeScript + Expo Router app
```

## Meditation duration

Single source of truth: `mobile/src/constants/meditation.ts`

| Setting | Value |
| --- | --- |
| Target duration | 300 seconds (5 minutes) |
| Acceptable range | 285–315 seconds |
| Structure | See `docs/MEDITATION_GENERATION.md` |

## Launch locally

```bash
cd mobile
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android emulator), or scan the QR code with Expo Go.

Web preview:

```bash
cd mobile
npx expo start --web
```

Typecheck:

```bash
cd mobile
npx tsc --noEmit
```

## Working mock flows

1. Welcome → Create My Meditation / Sign In / Explore
2. Home → Begin Check-In
3. Check-in steps: name → mood → energy → intention → notes → review
4. Generation screen with status-linked breathing UI
5. Immersive player (simulated playback)
6. Library (replay, download toggle, delete)
7. Insights (practice / mood / energy / intentions)
8. Profile (privacy copy, preference toggles, mock account linking)

## Next step

**Phase 2 — Authentication & Database**

- Supabase anonymous / Apple / Google / email auth
- Account linking for guests
- Migrations + RLS for profiles, check-ins, meditations
