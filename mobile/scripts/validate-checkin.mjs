/**
 * Lightweight validation smoke test (no Supabase required).
 * Run: node scripts/validate-checkin.mjs
 */
import { z } from 'zod';

const INTENTION_OPTIONS = [
  'Relaxation',
  'Stress Relief',
  'Gratitude',
  'Motivation',
  'Sleep',
  'Mindfulness',
];
const MOOD_OPTIONS = ['Happy', 'Anxious', 'Sad', 'Hopeful', 'Tired', 'Excited'];

const checkInSchema = z.object({
  name: z.string().trim().max(80).optional(),
  moods: z.array(z.enum(MOOD_OPTIONS)).min(1),
  energyLevel: z.number().int().min(1).max(10),
  focus: z.enum(INTENTION_OPTIONS),
  notes: z.string().trim().max(2000).optional(),
  duration: z.literal('5 minutes'),
});

const valid = checkInSchema.safeParse({
  moods: ['Anxious', 'Tired'],
  energyLevel: 3,
  focus: 'Stress Relief',
  duration: '5 minutes',
});

const invalidEnergy = checkInSchema.safeParse({
  moods: ['Happy'],
  energyLevel: 11,
  focus: 'Relaxation',
  duration: '5 minutes',
});

const invalidDuration = checkInSchema.safeParse({
  moods: ['Happy'],
  energyLevel: 5,
  focus: 'Relaxation',
  duration: '10 minutes',
});

if (!valid.success) {
  console.error('Expected valid check-in to pass');
  process.exit(1);
}
if (invalidEnergy.success) {
  console.error('Expected invalid energy to fail');
  process.exit(1);
}
if (invalidDuration.success) {
  console.error('Expected obsolete 10-minute duration to fail');
  process.exit(1);
}

console.log('validate-checkin: ok');
