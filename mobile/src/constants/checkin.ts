import type { Intention, Mood } from '@/types';

export const MOOD_OPTIONS: Mood[] = [
  'Happy',
  'Anxious',
  'Sad',
  'Hopeful',
  'Tired',
  'Excited',
];

export const INTENTION_OPTIONS: Intention[] = [
  'Relaxation',
  'Stress Relief',
  'Gratitude',
  'Motivation',
  'Sleep',
  'Mindfulness',
];

export const INTENTION_COPY: Record<Intention, string> = {
  Relaxation: 'Soften the body and release what you no longer need to hold.',
  'Stress Relief': 'Ground gently and let thoughts move without chasing them.',
  Gratitude: 'Notice what feels meaningful, without forcing positivity.',
  Motivation: 'Find clarity and a kinder next step.',
  Sleep: 'Ease stimulation and give yourself permission to rest.',
  Mindfulness: 'Rest attention in the present, moment by moment.',
};

export const CHECKIN_STEPS = [
  'name',
  'mood',
  'energy',
  'intention',
  'notes',
  'review',
] as const;

export type CheckInStep = (typeof CHECKIN_STEPS)[number];

export const GENERATION_MESSAGES: Record<string, string> = {
  pending: 'Gathering your check-in…',
  generating_script: 'Reflecting on how you’re feeling…',
  generating_audio: 'Preparing your personalized guidance…',
  processing_audio: 'Bringing your meditation to life…',
  ready: 'Your meditation is ready.',
  failed: 'Something interrupted the process.',
};
