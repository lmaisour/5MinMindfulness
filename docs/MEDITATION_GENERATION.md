# Meditation generation specifications

Used for upcoming AI + audio pipeline work (Phases 3–4). Duration values are defined in code at `mobile/src/constants/meditation.ts`.

## Duration requirements

| Requirement | Value |
| --- | --- |
| Target duration | **300 seconds** |
| Acceptable duration | **285–315 seconds** |
| User-facing label | **5 minutes** |

Audio generation must:

- Produce structured narration with intentional pauses
- Insert actual silence between segments (not one long trailing pause)
- Verify measured audio duration against the acceptable range
- Adjust script or pacing and regenerate as needed when out of range

## Approximate meditation structure

These are pacing targets, not rigid narration requirements.

| Time | Section |
| --- | --- |
| 0:00–0:30 | Personalized welcome and grounding |
| 0:30–1:30 | Gentle breathing and settling |
| 1:30–2:30 | Emotional awareness and acknowledgment |
| 2:30–4:15 | Personalized mindfulness practice based on the user’s selected intention |
| 4:15–5:00 | Quiet reflection and gentle closing |

## Personalization requirements (unchanged)

Scripts must reflect the user’s emotional state, energy level, intention, and optional notes.

Do not:

- Diagnose mental health conditions
- Claim to provide therapy
- Promise medical or psychological outcomes
- Invent personal experiences or facts about the user
- Force positive thinking
- Encourage unsafe breathing practices
- Assume the user is comfortable closing their eyes

Offer accessible alternatives (softening the gaze, noticing the breath).

If input suggests an immediate safety crisis, route to an appropriate supportive safety response rather than generating an ordinary meditation.

## Phase 3A — structured script

`generate-meditation` writes a provider-neutral script into `meditations.script_json` and sets status to `script_ready`. Status `ready` is reserved for a later phase that has measured audio. `actual_duration_seconds` stays empty until then.

Speech timing uses a 2.15 words-per-second estimate. That is not a measured audio duration. Acceptable estimated length remains 285–315 seconds, with a 300-second target.

Sections, in order:

| Section | Target |
| --- | --- |
| Arrival | 30 seconds |
| Breathing | 60 seconds |
| Emotional Awareness | 60 seconds |
| Personalized Practice | 105 seconds |
| Closing | 45 seconds |

Each section is ordered speech and pause blocks. Pauses are plain seconds of silence, not SSML or a provider parameter.

Today’s check-in outweighs up to five recent check-ins. Recent rows contribute mood, energy, and focus only. Notes are untrusted data. Historical notes are not sent. Personalization can be turned off in preferences, which drops the recent check-ins. Each focus gets a distinct practice instruction, and low or high energy changes the pace.

Limits: 3 new check-ins per hour and 8 per day. Retrying the same check-in does not count as another check-in. Each check-in can be claimed at most 4 times. One meditation row exists per check-in. A second request while a script is in progress, judged from `updated_at`, does not start another model call. Rows already in `generating_audio`, `processing_audio`, or `ready` are left unchanged.

Apply the Phase 3A migration before deploying the function. The migration stops if any check-in already has more than one meditation row. A database trigger rejects `ready` unless measured audio is stored and its duration is inside 285–315 seconds.

Deploy:

```bash
supabase db push
supabase secrets set OPENAI_API_KEY=YOUR_KEY
supabase functions deploy generate-meditation --use-api
```

`OPENAI_API_KEY` is read only inside the Edge Function. Do not put it in the mobile app.

Model: `gpt-4.1-mini`. A typical script is about 1,500 input tokens and 1,200 output tokens. At $0.40 per million input tokens and $1.60 per million output tokens, one accepted script is about $0.0025. One validation retry is about $0.005.

## Phase 3B — audio, not started

No text-to-speech provider is selected. `mobile/src/services/tts/types.ts` is the seam for a later provider. Phase 3B should render the same saved scripts through more than one provider and compare warmth, pacing, pronunciation, and cost before choosing one. Do not mark a meditation `ready` until that audio exists and its measured length is inside 285–315 seconds.

## Structured output

Generate a validated structured script (narration segments + pause seconds), not a single unstructured text block.
