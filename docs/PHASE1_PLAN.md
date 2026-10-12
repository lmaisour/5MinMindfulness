# Phase 1 — Mobile Foundation & Design

## Product

**5MinMindfulness** — personalized **5-minute** meditations from a quick emotional check-in.

## Repository review

Scaffolded as an Expo SDK 57 + TypeScript + Expo Router app in `mobile/`.

## Confirmed architecture (MVP)

| Layer | Choice |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript + Expo Router |
| Styling | StyleSheet + centralized design tokens (no NativeWind) |
| Motion | React Native Reanimated |
| Audio (UI ready) | expo-audio (mock playback in Phase 1) |
| Duration config | `mobile/src/constants/meditation.ts` (300s target) |
| Auth / DB / AI | Deferred to Phases 2–4 |

## Project structure

```
/
  docs/                 Architecture notes, generation specs, env checklist
  mobile/               Expo application (Phase 1)
    src/app/            Routes (welcome, tabs, check-in, generation, player)
    src/components/     Reusable UI + feature components
    src/constants/      Brand + meditation duration config
    src/theme/          Design tokens, typography
    src/data/           Mock data
    src/context/        In-memory app state for the mock journey
    src/types/          Shared TypeScript types
```

## Phase 1 scope

Polished frontend with realistic mock data for:

1. Welcome
2. Home
3. Multi-step check-in
4. Generation
5. Meditation player
6. Library
7. Insights
8. Profile / Sign-in placeholder

No live AI, Supabase, Trigger.dev, PostHog, or Sentry in this phase.

## Duration

- Target: **300 seconds**
- Acceptable: **285–315 seconds**
- Structure and AI generation notes: `docs/MEDITATION_GENERATION.md`

## Credentials needed later (not required for Phase 1)

See `docs/ENV_CHECKLIST.md`.
