/**
 * Pure checks for Phase 3B narration planning and WAV assembly. No network calls.
 * Run: node --experimental-strip-types scripts/validate-audio-assembly.mjs
 */
const moduleUrl = new URL('../../supabase/functions/_shared/audioAssembly.ts', import.meta.url).href;
const audio = await import(moduleUrl);

const {
  DEFAULT_VOICE_ID,
  assembleNarration,
  audioAction,
  durationSeconds,
  encodeWav,
  estimateCostUsd,
  measuredDurationAccepted,
  narrationFingerprint,
  nextSpeechSegment,
  parseWav,
  planNarration,
  resolveVoiceSettings,
  silenceSamples,
} = audio;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const settings = resolveVoiceSettings({});
assert(settings.voiceId === DEFAULT_VOICE_ID, 'default voice');
assert(settings.voiceId === 'KGZeK6FsnWQdrkDHnDNA', 'selected voice id');
assert(settings.modelId === 'eleven_multilingual_v2', 'multilingual model');
assert(settings.outputFormat === 'wav_24000', 'wav format that can be concatenated');
assert(settings.speed <= 1, 'narration is not sped up');
assert(settings.style === 0, 'style exaggeration stays off by default');
assert(resolveVoiceSettings({ ELEVENLABS_SPEED: '1.4' }).speed === 1, 'speed above 1 is clamped');
assert(resolveVoiceSettings({ ELEVENLABS_SPEED: '0.5' }).speed === 0.7, 'speed has a calm floor');
assert(
  resolveVoiceSettings({}, 'KGZeK6FsnWQdrkDHnDNA').voiceId === DEFAULT_VOICE_ID,
  'a saved voice id is accepted',
);
assert(resolveVoiceSettings({}, 'not a voice').voiceId === DEFAULT_VOICE_ID, 'invalid voice falls back');

const script = {
  sections: [
    { id: 'arrival', blocks: [{ type: 'speech', text: 'Welcome & <settle>.', seconds: 0 }] },
    {
      id: 'breathing',
      blocks: [
        { type: 'speech', text: 'Breathe in.', seconds: 0 },
        { type: 'pause', text: '', seconds: 2 },
        { type: 'speech', text: 'Breathe out.', seconds: 0 },
        { type: 'pause', text: '', seconds: 8 },
        { type: 'speech', text: 'Rest.', seconds: 0 },
      ],
    },
    {
      id: 'emotional_awareness',
      blocks: [
        { type: 'speech', text: 'Notice one.', seconds: 0 },
        { type: 'pause', text: '', seconds: 1.5 },
        { type: 'speech', text: 'Notice two.', seconds: 0 },
        { type: 'pause', text: '', seconds: 1.5 },
        { type: 'speech', text: 'Notice three.', seconds: 0 },
        { type: 'pause', text: '', seconds: 1.5 },
        { type: 'speech', text: 'Notice four.', seconds: 0 },
      ],
    },
    { id: 'personalized_practice', blocks: [{ type: 'speech', text: 'Stay with this.', seconds: 0 }] },
    {
      id: 'closing',
      blocks: [
        { type: 'pause', text: '', seconds: 4 },
        { type: 'speech', text: 'Gently return.', seconds: 0 },
      ],
    },
  ],
};

const plan = planNarration(script);
assert(plan[0].kind === 'speech' && plan[0].text === 'Welcome &amp; &lt;settle&gt;.', 'speech is escaped and first');
const breathingSpeech = plan.find((segment) => segment.kind === 'speech' && segment.plainText.includes('Breathe in'));
assert(breathingSpeech.text.includes('<break time="2.0s" />'), 'short pause stays inside the narration');
assert(!breathingSpeech.text.includes('8.0s'), 'long pause is not a break tag');
assert(plan.some((segment) => segment.kind === 'silence' && segment.pauseSeconds === 8), 'eight second pause is exact silence');
assert(plan.some((segment) => segment.kind === 'silence' && segment.pauseSeconds === 4), 'closing pause stays before the last speech');
assert(
  plan.filter((segment) => segment.kind === 'speech').every((segment) => (segment.text.match(/<break /g) ?? []).length <= 2),
  'a request has at most two break tags',
);
assert(
  plan.map((segment) => segment.kind).join(',').startsWith('speech,speech,silence,speech'),
  'arrival, joined breathing, then the long pause, then rest',
);
const closing = plan[plan.length - 1];
assert(closing.kind === 'speech' && closing.plainText === 'Gently return.', 'closing speech is last');
assert(closing.previousText.includes('Stay with this'), 'later speech receives previous text');
assert(plan[0].nextText.includes('Breathe in'), 'early speech receives next text');

let threw = false;
try {
  planNarration({ sections: [{ id: 'closing', blocks: [] }] });
} catch (error) {
  threw = error.message === 'invalid_script';
}
assert(threw, 'wrong section order is rejected');

const fingerprint = narrationFingerprint(settings, plan);
const slower = resolveVoiceSettings({ ELEVENLABS_SPEED: '0.8' });
assert(narrationFingerprint(slower, plan) !== fingerprint, 'pace changes the cache key');

const half = encodeWav({
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
  samples: new Uint8Array(24000 * 2),
});
assert(Math.abs(durationSeconds(parseWav(half)) - 1) < 0.001, 'wav duration is measured from samples');
const assembled = assembleNarration([half, half], [
  { index: 0, kind: 'speech', text: 'a', plainText: 'a', characters: 1, previousText: '', nextText: '' },
  { index: 1, kind: 'silence', pauseSeconds: 1.5 },
  { index: 2, kind: 'speech', text: 'b', plainText: 'b', characters: 1, previousText: '', nextText: '' },
]);
assert(Math.abs(assembled.durationSeconds - 3.5) < 0.001, 'speech and silence add up');
assert(assembled.wav[0] === 82 && assembled.wav[8] === 87, 'assembled file is a wav');
const silent = silenceSamples({ sampleRate: 24000, channels: 1, bitsPerSample: 16 }, 2);
assert(silent.length === 24000 * 2 * 2 && silent.every((value) => value === 0), 'silence is exact zero samples');

assert(measuredDurationAccepted(300) === true, 'target duration is accepted');
assert(measuredDurationAccepted(285) === true, 'lower bound is accepted');
assert(measuredDurationAccepted(315) === true, 'upper bound is accepted');
assert(measuredDurationAccepted(284.4) === false, 'short audio is not ready');
assert(measuredDurationAccepted(315.6) === false, 'long audio is not ready');

const baseRow = {
  status: 'script_ready',
  hasScript: true,
  hasAudioPath: false,
  actualDurationSeconds: null,
  audioAttempts: 0,
  lockUntil: null,
  errorCode: null,
  manifest: null,
};
assert(audioAction(baseRow, 1_000, fingerprint) === 'begin', 'a saved script starts narration');
assert(
  audioAction({ ...baseRow, status: 'ready', hasAudioPath: true, actualDurationSeconds: 300 }, 1_000, fingerprint) ===
    'return_ready',
  'finished audio is reused',
);
assert(
  audioAction(
    { ...baseRow, status: 'generating_audio', lockUntil: new Date(5_000).toISOString() },
    1_000,
    fingerprint,
  ) === 'wait',
  'a live request is not duplicated',
);
const partial = {
  version: 1,
  fingerprint,
  voiceId: settings.voiceId,
  segments: [{ index: 0, kind: 'speech', storagePath: 'user/meditation/segments/0.wav', characters: 20 }],
  segmentFailures: {},
};
assert(
  audioAction(
    { ...baseRow, status: 'failed', audioAttempts: 3, errorCode: 'elevenlabs_timeout', manifest: partial },
    1_000,
    fingerprint,
  ) === 'continue',
  'an interrupted narration resumes stored segments',
);
assert(
  audioAction(
    {
      ...baseRow,
      status: 'failed',
      audioAttempts: 1,
      errorCode: 'duration_out_of_range',
      actualDurationSeconds: 260,
      manifest: partial,
    },
    1_000,
    fingerprint,
  ) === 'cached_failure',
  'out of range audio is not recorded again',
);
assert(audioAction({ ...baseRow, audioAttempts: 3 }, 1_000, fingerprint) === 'blocked', 'attempt cap blocks a new recording');
assert(nextSpeechSegment(plan, partial) !== null && nextSpeechSegment(plan, partial).index !== 0, 'stored speech is not requested again');
assert(estimateCostUsd(3500) === 0.28, 'multilingual cost is 8 cents per thousand characters');
assert(estimateCostUsd(0) === 0, 'cached audio has no cost');

console.log('audio assembly checks: ok');
