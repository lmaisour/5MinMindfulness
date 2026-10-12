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

## Structured output

Generate a validated structured script (narration segments + `pauseAfterSeconds`), not a single unstructured text block.
