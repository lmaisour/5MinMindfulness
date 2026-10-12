# Phase 1 — Mobile Foundation & Design

## Repository review

The workspace was empty (no prior Next.js prototype). We scaffolded a new Expo SDK 57 + TypeScript + Expo Router app in `mobile/`.

## Confirmed architecture (MVP)

| Layer | Choice |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript + Expo Router |
| Styling | StyleSheet + centralized design tokens (no NativeWind) |
| Motion | React Native Reanimated |
| Audio (UI ready) | expo-audio (mock playback in Phase 1) |
| Auth / DB / AI | Deferred to Phases 2–4 |

## Project structure

```
/agent
  docs/                 Architecture notes & env checklist
  mobile/               Expo application (Phase 1)
    src/app/            Routes (welcome, tabs, check-in, generation, player)
    src/components/     Reusable UI + feature components
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

## Credentials needed later (not required for Phase 1)

See `docs/ENV_CHECKLIST.md`.
