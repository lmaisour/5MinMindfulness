/**
 * Single source of truth for meditation duration and generation targets.
 * All UI labels and mock generation should read from this config.
 */
export const MEDITATION_DURATION = {
  /** User-facing duration label used in check-in payloads and UI copy. */
  label: '5 minutes' as const,
  /** Target finished audio length in seconds. */
  targetSeconds: 300,
  /** Inclusive lower bound for acceptable MVP audio length. */
  minAcceptableSeconds: 285,
  /** Inclusive upper bound for acceptable MVP audio length. */
  maxAcceptableSeconds: 315,
  /** Whole minutes for short labels (e.g. "5 min"). */
  minutes: 5,
} as const;

export type MeditationDurationLabel = typeof MEDITATION_DURATION.label;

/**
 * Approximate section targets for AI script generation (Phase 3+).
 * These guide pacing; they are not rigid narration requirements.
 */
export const MEDITATION_STRUCTURE = [
  {
    id: 'welcome',
    startSeconds: 0,
    endSeconds: 30,
    title: 'Personalized welcome and grounding',
  },
  {
    id: 'breathing',
    startSeconds: 30,
    endSeconds: 90,
    title: 'Gentle breathing and settling',
  },
  {
    id: 'awareness',
    startSeconds: 90,
    endSeconds: 150,
    title: 'Emotional awareness and acknowledgment',
  },
  {
    id: 'practice',
    startSeconds: 150,
    endSeconds: 255,
    title: 'Personalized mindfulness practice based on intention',
  },
  {
    id: 'closing',
    startSeconds: 255,
    endSeconds: 300,
    title: 'Quiet reflection and gentle closing',
  },
] as const;

export function isAcceptableMeditationDuration(seconds: number): boolean {
  return (
    seconds >= MEDITATION_DURATION.minAcceptableSeconds &&
    seconds <= MEDITATION_DURATION.maxAcceptableSeconds
  );
}

/** Random mock duration within the acceptable MVP tolerance window. */
export function mockActualDurationSeconds(): number {
  const span =
    MEDITATION_DURATION.maxAcceptableSeconds -
    MEDITATION_DURATION.minAcceptableSeconds;
  return (
    MEDITATION_DURATION.minAcceptableSeconds +
    Math.floor(Math.random() * (span + 1))
  );
}

export function formatMeditationMinutesLabel(): string {
  return `${MEDITATION_DURATION.minutes} min`;
}
