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
- Leave the meditation unready when the measured file is outside that window. Do not pad it with extra silence or speed the narration up.

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

Speech timing uses a 2.15 words-per-second estimate. That is not a measured audio duration. Acceptable estimated length remains 285–315 seconds, with a 300-second target. Speech blocks always store `seconds: 0`. If a valid draft is only a little short or long, pause lengths are adjusted between 2 and 12 seconds, with at most 75 seconds of silence in total.

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

## Phase 3B — ElevenLabs narration

`generate-audio` turns a saved `script_ready` script into one continuous WAV. It does not call the script model again. The provider is ElevenLabs, model `eleven_multilingual_v2`, default voice `KGZeK6FsnWQdrkDHnDNA`. Output is `wav_24000` so pauses can be exact silence and the duration is the sample count divided by the sample rate. PCM or WAV at 44.1 kHz needs an ElevenLabs Pro plan, so that format is not the default.

Speech stays in section order. Pauses of 3 seconds or less, and at most two of them, are `<break>` tags inside a section-sized request. Longer pauses are inserted as silent samples between those requests. `previous_text` and `next_text` keep the voice continuous across a split. Voice settings default to stability 0.7, similarity 0.75, style 0, speaker boost on, and speed 0.9. Speed is clamped to 0.7–1.0. Override them with Edge Function secrets if a listen shows the pace or tone should change:

- `ELEVENLABS_API_KEY` (required)
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL_ID`
- `ELEVENLABS_OUTPUT_FORMAT` (`wav_8000`, `wav_16000`, `wav_22050`, `wav_24000`, or `wav_32000`)
- `ELEVENLABS_STABILITY`
- `ELEVENLABS_SIMILARITY_BOOST`
- `ELEVENLABS_STYLE`
- `ELEVENLABS_SPEED`
- `ELEVENLABS_SPEAKER_BOOST`

A user’s `preferred_voice`, when it is a voice id, replaces the default voice.

Each invocation narrates one missing speech segment or, when every segment is stored, assembles the file. The phone calls again until the status is `ready` or `failed`. A lock column stops a second request from starting another ElevenLabs call. Completed segments are kept, so a retry does not pay for audio that already exists. A measured duration outside 285–315 seconds sets `failed` / `duration_out_of_range` and does not upload the final file or set `ready`. The same settings do not record that script again.

Limits: 3 audio attempts per meditation, 4 new attempts per hour, and 10 per day. Resuming an interrupted attempt does not count as a new one. Costs and failures are written to `audio_generation_events` with character counts only. Journal notes are not stored there.

Audio is uploaded to the private `meditation-audio` bucket at `{user_id}/{meditation_id}.wav`. Storage policies allow an authenticated user to read, write, and delete only that user’s folder. The player uses a one-hour signed URL. Deleting a meditation or the account removes the file.

The generation screen starts narration after the script is ready and opens the player only when the file is ready. Library replays `ready` rows and resumes an interrupted narration. Playback uses expo-audio with silent-mode and background playback, plus lock-screen controls. The expo-audio config plugin already enables the iOS audio background mode.

Multilingual v2 is $0.08 per 1,000 characters on the ElevenLabs API price list. A five-minute script is about 3,500–5,000 characters of narration, so one new recording is about $0.28–$0.40. Replaying a stored file costs nothing. Flash or Turbo is about half that price and was not selected, because narration quality matters more here.

Deploy:

```bash
supabase db push
supabase secrets set ELEVENLABS_API_KEY=YOUR_KEY
supabase functions deploy generate-audio --use-api
```

Do not put `ELEVENLABS_API_KEY` in the mobile app. Changing a voice secret does not affect a meditation that is already `ready`.

## Structured output

Generate a validated structured script (narration segments + pause seconds), not a single unstructured text block.
