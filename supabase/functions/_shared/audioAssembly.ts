// Pure narration planning and WAV assembly for Phase 3B.
// ElevenLabs is called by the edge function. This file never sees the API key.

import { MIN_DURATION_SECONDS, MAX_DURATION_SECONDS, SECTION_SPECS } from './meditationScript.ts';

export const AUDIO_BUCKET = 'meditation-audio';
export const DEFAULT_VOICE_ID = 'KGZeK6FsnWQdrkDHnDNA';
export const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
export const DEFAULT_OUTPUT_FORMAT = 'wav_24000';
export const ASSEMBLY_VERSION = 1;
export const COST_USD_PER_1K_CHARS = 0.08;

export const AUDIO_LIMITS = {
  attemptsPerMeditation: 3,
  perHour: 4,
  perDay: 10,
  staleMs: 100_000,
  /** Suppresses a second provider call after an unpaid failure. */
  retryCooldownMs: 20_000,
  minDurationSeconds: MIN_DURATION_SECONDS,
  maxDurationSeconds: MAX_DURATION_SECONDS,
} as const;

/** Provider rejections that stored no audio and did not spend a narration. */
const UNBILLED_AUDIO_ERRORS = new Set([
  'elevenlabs_failed',
  'elevenlabs_credits',
  'elevenlabs_auth',
  'elevenlabs_rate_limit',
  'network_failed',
  'save_failed',
]);

/** Account and network failures are not evidence that a segment is bad. */
const NON_COUNTING_SEGMENT_ERRORS = new Set([
  'elevenlabs_credits',
  'elevenlabs_auth',
  'elevenlabs_rate_limit',
  'network_failed',
]);

const MAX_BREAKS_PER_REQUEST = 2;
const BREAK_TAG_MAX_SECONDS = 3;
const MAX_REQUEST_CHARS = 8_000;
const CONTEXT_CHARS = 800;

export interface VoiceSettings {
  voiceId: string;
  modelId: string;
  outputFormat: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  /** Never above 1. Narration is not sped up to hit the duration window. */
  speed: number;
}

export interface ScriptBlockInput {
  type: 'speech' | 'pause';
  text?: string;
  seconds?: number;
}

export interface ScriptSectionInput {
  id: string;
  blocks: ScriptBlockInput[];
}

export interface SpeechPlanSegment {
  index: number;
  kind: 'speech';
  text: string;
  plainText: string;
  characters: number;
  previousText: string;
  nextText: string;
}

export interface SilencePlanSegment {
  index: number;
  kind: 'silence';
  pauseSeconds: number;
}

export type PlanSegment = SpeechPlanSegment | SilencePlanSegment;

export interface StoredSpeechSegment {
  index: number;
  kind: 'speech';
  storagePath: string;
  characters: number;
}

export interface AudioManifest {
  version: 1;
  fingerprint: string;
  voiceId: string;
  segments: StoredSpeechSegment[];
  segmentFailures: Record<string, number>;
}

export interface AudioRow {
  status: string;
  hasScript: boolean;
  hasAudioPath: boolean;
  actualDurationSeconds: number | null;
  audioAttempts: number;
  /** While this timestamp is in the future, another request is already calling ElevenLabs. */
  lockUntil: string | null;
  errorCode: string | null;
  /** When the latest narration attempt was claimed. Used only for the unpaid-failure cooldown. */
  attemptedAt: string | null;
  manifest: AudioManifest | null;
}

export type AudioAction =
  | 'return_ready'
  | 'cached_failure'
  | 'wait'
  | 'continue'
  | 'begin'
  | 'retry_unbilled'
  | 'cooldown'
  | 'blocked';

export type AudioQuotaReason = 'ok' | 'hourly' | 'daily';

export interface PcmWav {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  samples: Uint8Array;
}

interface SpeechPart {
  type: 'speech';
  text: string;
}

interface BreakPart {
  type: 'break';
  seconds: number;
}

type Part = SpeechPart | BreakPart;

interface DraftSpeech {
  kind: 'speech';
  parts: Part[];
}

interface DraftSilence {
  kind: 'silence';
  pauseSeconds: number;
}

type Draft = DraftSpeech | DraftSilence;

export function estimateCostUsd(characters: number): number {
  if (!Number.isFinite(characters) || characters <= 0) return 0;
  return Math.round((characters / 1000) * COST_USD_PER_1K_CHARS * 10000) / 10000;
}

export function measuredDurationAccepted(seconds: number): boolean {
  if (!Number.isFinite(seconds)) return false;
  const rounded = Math.round(seconds);
  return rounded >= AUDIO_LIMITS.minDurationSeconds && rounded <= AUDIO_LIMITS.maxDurationSeconds;
}

export function resolveVoiceSettings(
  env: Record<string, string | undefined>,
  preferredVoice?: string | null,
): VoiceSettings {
  const preferred = typeof preferredVoice === 'string' && /^[A-Za-z0-9]{10,40}$/.test(preferredVoice)
    ? preferredVoice
    : null;
  const outputFormat = env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_OUTPUT_FORMAT;
  if (!/^wav_(8000|16000|22050|24000|32000)$/.test(outputFormat)) {
    throw new Error('unsupported_output_format');
  }
  return {
    voiceId: preferred || env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID,
    modelId: env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
    outputFormat,
    stability: clampUnit(env.ELEVENLABS_STABILITY, 0.7),
    similarityBoost: clampUnit(env.ELEVENLABS_SIMILARITY_BOOST, 0.75),
    style: clampUnit(env.ELEVENLABS_STYLE, 0),
    useSpeakerBoost: env.ELEVENLABS_SPEAKER_BOOST?.trim().toLowerCase() !== 'false',
    speed: clampSpeed(env.ELEVENLABS_SPEED, 0.9),
  };
}

export function planNarration(script: { sections?: ScriptSectionInput[] } | null | undefined): PlanSegment[] {
  const sections = script?.sections;
  if (!Array.isArray(sections) || sections.length !== SECTION_SPECS.length) {
    throw new Error('invalid_script');
  }
  for (let i = 0; i < SECTION_SPECS.length; i += 1) {
    if (sections[i]?.id !== SECTION_SPECS[i].id || !Array.isArray(sections[i].blocks)) {
      throw new Error('invalid_script');
    }
  }

  const drafts: Draft[] = [];
  for (const section of sections) {
    let parts: Part[] = [];
    let breaks = 0;
    const flush = () => {
      if (parts.some((part) => part.type === 'speech')) drafts.push({ kind: 'speech', parts });
      parts = [];
      breaks = 0;
    };
    for (const block of section.blocks) {
      if (block?.type === 'speech') {
        const text = typeof block.text === 'string' ? block.text.trim() : '';
        if (!text) throw new Error('invalid_script');
        const nextLength = renderedLength(parts) + escapeXml(text).length + 1;
        if (parts.length > 0 && nextLength > MAX_REQUEST_CHARS) flush();
        parts.push({ type: 'speech', text });
        continue;
      }
      if (block?.type === 'pause') {
        const seconds = Number(block.seconds);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 30) throw new Error('invalid_script');
        if (seconds === 0) continue;
        const canBreak = seconds <= BREAK_TAG_MAX_SECONDS
          && breaks < MAX_BREAKS_PER_REQUEST
          && parts.some((part) => part.type === 'speech')
          && renderedLength(parts) + 32 <= MAX_REQUEST_CHARS;
        if (canBreak) {
          parts.push({ type: 'break', seconds });
          breaks += 1;
        } else {
          flush();
          drafts.push({ kind: 'silence', pauseSeconds: roundPause(seconds) });
        }
        continue;
      }
      throw new Error('invalid_script');
    }
    flush();
  }

  if (!drafts.some((draft) => draft.kind === 'speech')) throw new Error('invalid_script');

  const speechPlain = drafts.map((draft) => (draft.kind === 'speech' ? plainText(draft.parts) : ''));
  return drafts.map((draft, index) => {
    if (draft.kind === 'silence') {
      return { index, kind: 'silence', pauseSeconds: draft.pauseSeconds };
    }
    const text = renderParts(draft.parts);
    const plain = speechPlain[index];
    return {
      index,
      kind: 'speech',
      text,
      plainText: plain,
      characters: text.length,
      previousText: contextBefore(speechPlain, index),
      nextText: contextAfter(speechPlain, index),
    };
  });
}

export function narrationFingerprint(settings: VoiceSettings, plan: PlanSegment[]): string {
  const body = JSON.stringify({
    v: ASSEMBLY_VERSION,
    voiceId: settings.voiceId,
    modelId: settings.modelId,
    outputFormat: settings.outputFormat,
    stability: settings.stability,
    similarityBoost: settings.similarityBoost,
    style: settings.style,
    useSpeakerBoost: settings.useSpeakerBoost,
    speed: settings.speed,
    segments: plan.map((segment) => (
      segment.kind === 'speech' ? `s:${segment.text}` : `p:${segment.pauseSeconds.toFixed(3)}`
    )),
  });
  return fnv(body);
}

export function emptyManifest(settings: VoiceSettings, fingerprint: string): AudioManifest {
  return {
    version: 1,
    fingerprint,
    voiceId: settings.voiceId,
    segments: [],
    segmentFailures: {},
  };
}

export function parseManifest(value: unknown): AudioManifest | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<AudioManifest>;
  if (record.version !== 1 || typeof record.fingerprint !== 'string' || !Array.isArray(record.segments)) {
    return null;
  }
  const segments: StoredSpeechSegment[] = [];
  for (const segment of record.segments) {
    if (!segment || segment.kind !== 'speech') continue;
    if (typeof segment.index !== 'number' || typeof segment.storagePath !== 'string') continue;
    segments.push({
      index: segment.index,
      kind: 'speech',
      storagePath: segment.storagePath,
      characters: typeof segment.characters === 'number' ? segment.characters : 0,
    });
  }
  const segmentFailures: Record<string, number> = {};
  if (record.segmentFailures && typeof record.segmentFailures === 'object') {
    for (const [key, value] of Object.entries(record.segmentFailures)) {
      if (typeof value === 'number' && value > 0) segmentFailures[key] = value;
    }
  }
  return {
    version: 1,
    fingerprint: record.fingerprint,
    voiceId: typeof record.voiceId === 'string' ? record.voiceId : DEFAULT_VOICE_ID,
    segments,
    segmentFailures,
  };
}

export function nextSpeechSegment(plan: PlanSegment[], manifest: AudioManifest | null): SpeechPlanSegment | null {
  const saved = new Set((manifest?.segments ?? []).map((segment) => segment.index));
  for (const segment of plan) {
    if (segment.kind === 'speech' && !saved.has(segment.index)) return segment;
  }
  return null;
}

export function isUnbilledAudioFailure(errorCode: string | null, storedSegments: number): boolean {
  return storedSegments === 0 && errorCode != null && UNBILLED_AUDIO_ERRORS.has(errorCode);
}

export function recordsSegmentFailure(errorCode: string): boolean {
  return !NON_COUNTING_SEGMENT_ERRORS.has(errorCode);
}

export function audioFailureMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'elevenlabs_credits':
      return 'ElevenLabs is out of credits. Add credits to your ElevenLabs account, then try again.';
    case 'elevenlabs_auth':
      return 'The narration service rejected the API key. Update the ElevenLabs secret, then try again.';
    case 'elevenlabs_rate_limit':
      return 'ElevenLabs is rate limiting requests. Wait a minute and try again.';
    case 'network_failed':
      return 'The narration service could not be reached. Try again.';
    case 'elevenlabs_timeout':
      return 'Narration took too long. You can continue without starting over.';
    case 'storage_failed':
      return 'The audio could not be saved. Try again.';
    case 'save_failed':
      return 'The meditation could not be updated. Try again.';
    case 'audio_format':
      return 'The narration audio could not be read. You can try again.';
    case 'duration_out_of_range':
      return 'The narration is outside the 5-minute window, so it was not marked ready.';
    case 'elevenlabs_failed':
      return 'ElevenLabs rejected the request before any audio was saved. You can try again.';
    default:
      return 'Narration failed. You can continue without starting over.';
  }
}

export function audioQuotaMessage(reason: 'hourly' | 'daily'): string {
  if (reason === 'daily') return 'You have reached today’s narration limit. Try again tomorrow.';
  return 'You have reached the hourly narration limit. Try again in an hour.';
}

export function audioQuotaReason(counts: { hour: number; day: number }): AudioQuotaReason {
  if (counts.day >= AUDIO_LIMITS.perDay) return 'daily';
  if (counts.hour >= AUDIO_LIMITS.perHour) return 'hourly';
  return 'ok';
}

export function audioAction(row: AudioRow, nowMs: number, fingerprint: string): AudioAction {
  if (
    row.status === 'ready'
    && row.hasAudioPath
    && row.actualDurationSeconds != null
    && measuredDurationAccepted(row.actualDurationSeconds)
  ) {
    return 'return_ready';
  }
  if (!row.hasScript) return 'blocked';

  const sameManifest = row.manifest?.fingerprint === fingerprint;
  const lockMs = row.lockUntil ? Date.parse(row.lockUntil) : Number.NaN;
  const locked = Number.isFinite(lockMs) && lockMs > nowMs;
  const inFlight = row.status === 'generating_audio' || row.status === 'processing_audio';
  const storedSegments = row.manifest?.segments.length ?? 0;
  if (inFlight && locked) return 'wait';

  if (
    sameManifest
    && row.errorCode === 'duration_out_of_range'
    && storedSegments > 0
  ) {
    return 'cached_failure';
  }

  // Finishing an attempt reuses stored segments, so it does not spend another attempt.
  if (sameManifest && storedSegments > 0 && (inFlight || row.status === 'failed')) {
    return 'continue';
  }

  if (inFlight) return 'continue';

  if (row.status === 'failed' && isUnbilledAudioFailure(row.errorCode, storedSegments)) {
    return withinRetryCooldown(row.attemptedAt, nowMs) ? 'cooldown' : 'retry_unbilled';
  }

  if (row.status === 'script_ready' || row.status === 'failed') {
    if (row.audioAttempts >= AUDIO_LIMITS.attemptsPerMeditation) return 'blocked';
    return 'begin';
  }

  return 'blocked';
}

function withinRetryCooldown(attemptedAt: string | null, nowMs: number): boolean {
  if (!attemptedAt) return false;
  const stamp = Date.parse(attemptedAt);
  if (!Number.isFinite(stamp)) return false;
  const age = nowMs - stamp;
  return age >= 0 && age < AUDIO_LIMITS.retryCooldownMs;
}

export function finalAudioPath(userId: string, meditationId: string): string {
  return `${userId}/${meditationId}.wav`;
}

export function segmentAudioPath(userId: string, meditationId: string, index: number): string {
  return `${userId}/${meditationId}/segments/${index}.wav`;
}

export function exceedsAudioRateLimit(counts: { hour: number; day: number }): boolean {
  return audioQuotaReason(counts) !== 'ok';
}

export function parseWav(bytes: Uint8Array): PcmWav {
  if (bytes.length < 44) throw new Error('audio_format');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') throw new Error('audio_format');

  let format: { channels: number; sampleRate: number; bitsPerSample: number } | null = null;
  let samples: Uint8Array | null = null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error('audio_format');
    if (id === 'fmt ') {
      const audioFormat = view.getUint16(start, true);
      const channels = view.getUint16(start + 2, true);
      const sampleRate = view.getUint32(start + 4, true);
      const bitsPerSample = view.getUint16(start + 14, true);
      if (audioFormat !== 1 || channels < 1 || channels > 2 || bitsPerSample !== 16 || sampleRate < 8000) {
        throw new Error('audio_format');
      }
      format = { channels, sampleRate, bitsPerSample };
    } else if (id === 'data') {
      samples = bytes.slice(start, start + size);
    }
    offset = start + size + (size % 2);
  }

  if (!format || !samples || samples.length === 0) throw new Error('audio_format');
  return { ...format, samples };
}

export function encodeWav(pcm: PcmWav): Uint8Array {
  const data = pcm.samples;
  const out = new Uint8Array(44 + data.length);
  const view = new DataView(out.buffer);
  writeAscii(out, 0, 'RIFF');
  view.setUint32(4, 36 + data.length, true);
  writeAscii(out, 8, 'WAVE');
  writeAscii(out, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, pcm.channels, true);
  view.setUint32(24, pcm.sampleRate, true);
  const blockAlign = pcm.channels * (pcm.bitsPerSample / 8);
  view.setUint32(28, pcm.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, pcm.bitsPerSample, true);
  writeAscii(out, 36, 'data');
  view.setUint32(40, data.length, true);
  out.set(data, 44);
  return out;
}

export function silenceSamples(format: Pick<PcmWav, 'sampleRate' | 'channels' | 'bitsPerSample'>, seconds: number): Uint8Array {
  const frames = Math.round(seconds * format.sampleRate);
  const bytes = frames * format.channels * (format.bitsPerSample / 8);
  return new Uint8Array(Math.max(0, bytes));
}

export function durationSeconds(pcm: PcmWav): number {
  const bytesPerFrame = pcm.channels * (pcm.bitsPerSample / 8);
  if (bytesPerFrame <= 0 || pcm.sampleRate <= 0) return 0;
  return pcm.samples.length / bytesPerFrame / pcm.sampleRate;
}

export function assembleNarration(
  speechWavs: Uint8Array[],
  plan: PlanSegment[],
): { wav: Uint8Array; durationSeconds: number } {
  if (speechWavs.length !== plan.filter((segment) => segment.kind === 'speech').length) {
    throw new Error('audio_format');
  }
  let speechCursor = 0;
  let format: PcmWav | null = null;
  const parts: Uint8Array[] = [];
  const leadingSilence: number[] = [];
  for (const segment of plan) {
    if (segment.kind === 'silence') {
      if (!format) leadingSilence.push(segment.pauseSeconds);
      else parts.push(silenceSamples(format, segment.pauseSeconds));
      continue;
    }
    const parsed = parseWav(speechWavs[speechCursor]);
    speechCursor += 1;
    if (!format) {
      format = parsed;
      for (const seconds of leadingSilence) parts.push(silenceSamples(format, seconds));
    } else if (
      parsed.sampleRate !== format.sampleRate
      || parsed.channels !== format.channels
      || parsed.bitsPerSample !== format.bitsPerSample
    ) {
      throw new Error('audio_format');
    }
    parts.push(parsed.samples);
  }
  if (!format) throw new Error('audio_format');
  const samples = concatBytes(parts);
  const pcm = { ...format, samples };
  return { wav: encodeWav(pcm), durationSeconds: durationSeconds(pcm) };
}

function clampUnit(value: string | undefined, fallback: number): number {
  const parsed = value == null || value.trim() === '' ? fallback : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function clampSpeed(value: string | undefined, fallback: number): number {
  const parsed = value == null || value.trim() === '' ? fallback : Number(value);
  const speed = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(1, Math.max(0.7, speed));
}

function roundPause(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderParts(parts: Part[]): string {
  return parts
    .map((part) => (part.type === 'speech' ? escapeXml(part.text) : breakTag(part.seconds)))
    .join(' ');
}

function renderedLength(parts: Part[]): number {
  if (parts.length === 0) return 0;
  return renderParts(parts).length;
}

function plainText(parts: Part[]): string {
  return parts.filter((part): part is SpeechPart => part.type === 'speech').map((part) => part.text).join(' ');
}

function breakTag(seconds: number): string {
  const clamped = Math.min(BREAK_TAG_MAX_SECONDS, Math.max(0.1, seconds));
  return `<break time="${clamped.toFixed(1)}s" />`;
}

function contextBefore(plains: string[], index: number): string {
  const text = plains.slice(0, index).filter(Boolean).join(' ');
  return text.length <= CONTEXT_CHARS ? text : text.slice(-CONTEXT_CHARS);
}

function contextAfter(plains: string[], index: number): string {
  const text = plains.slice(index + 1).filter(Boolean).join(' ');
  return text.length <= CONTEXT_CHARS ? text : text.slice(0, CONTEXT_CHARS);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = '';
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(bytes[offset + i] ?? 0);
  return text;
}

function writeAscii(bytes: Uint8Array, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function fnv(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x01000193 ^ (code << 1));
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}
