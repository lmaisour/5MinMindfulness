/**
 * Narration is produced on the server. Scripts stay plain speech and pause blocks.
 * ElevenLabs settings live in the generate-audio Edge Function, not in the app.
 */

export interface TtsVoiceOptions {
  /** Provider-specific id, chosen when a provider is added. */
  voiceId?: string;
  /** 1 is the provider's normal rate. */
  speed?: number;
  tone?: 'calm' | 'warm' | 'steady';
}

export interface TtsSpeechBlock {
  type: 'speech';
  text: string;
}

export interface TtsPauseBlock {
  type: 'pause';
  seconds: number;
}

export interface TtsSynthesisRequest {
  blocks: Array<TtsSpeechBlock | TtsPauseBlock>;
  voice?: TtsVoiceOptions;
}

export interface TtsSynthesisResult {
  audioUri: string;
  durationSeconds: number;
}

export interface TtsProvider {
  readonly id: string;
  synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult>;
}
