/**
 * Phase 3B will implement this interface for one or more providers.
 * Scripts stay plain speech and pause blocks so no provider is assumed.
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
