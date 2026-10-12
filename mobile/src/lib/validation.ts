import { z } from 'zod';

import { INTENTION_OPTIONS, MOOD_OPTIONS } from '@/constants/checkin';
import { MEDITATION_DURATION } from '@/constants/meditation';

export const checkInSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  moods: z
    .array(z.enum(MOOD_OPTIONS as [string, ...string[]]))
    .min(1, 'Choose at least one mood'),
  energyLevel: z.number().int().min(1).max(10),
  focus: z.enum(INTENTION_OPTIONS as [string, ...string[]]),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  duration: z.literal(MEDITATION_DURATION.label).default(MEDITATION_DURATION.label),
});

export type ValidatedCheckIn = z.infer<typeof checkInSchema>;
