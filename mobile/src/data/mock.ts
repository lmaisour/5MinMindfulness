import type { InsightsSummary, Meditation, UserProfile } from '@/types';

export const MOCK_PROFILE: UserProfile = {
  displayName: undefined,
  personalizationEnabled: true,
  notificationsEnabled: false,
  isGuest: true,
};

export const MOCK_MEDITATIONS: Meditation[] = [
  {
    id: 'med-001',
    title: 'Softening After a Long Day',
    intention: 'Stress Relief',
    createdAt: '2026-10-11T19:20:00.000Z',
    targetDurationSeconds: 600,
    actualDurationSeconds: 598,
    status: 'ready',
    moods: ['Anxious', 'Tired'],
    energyLevel: 3,
    notes: 'A demanding week at work.',
    downloaded: true,
  },
  {
    id: 'med-002',
    title: 'Quiet Gratitude at Dusk',
    intention: 'Gratitude',
    createdAt: '2026-10-09T18:05:00.000Z',
    targetDurationSeconds: 600,
    actualDurationSeconds: 605,
    status: 'ready',
    moods: ['Hopeful', 'Happy'],
    energyLevel: 6,
    downloaded: false,
  },
  {
    id: 'med-003',
    title: 'Settling Toward Sleep',
    intention: 'Sleep',
    createdAt: '2026-10-07T22:40:00.000Z',
    targetDurationSeconds: 600,
    actualDurationSeconds: 612,
    status: 'ready',
    moods: ['Tired'],
    energyLevel: 2,
    downloaded: false,
  },
];

export const MOCK_INSIGHTS: InsightsSummary = {
  totalMeditations: 12,
  totalMinutesListened: 118,
  sessionsThisWeek: 3,
  moodCounts: {
    Anxious: 5,
    Tired: 7,
    Hopeful: 4,
    Happy: 3,
    Sad: 2,
    Excited: 1,
  },
  averageEnergyByDay: [
    { label: 'Mon', value: 4 },
    { label: 'Tue', value: 5 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 6 },
    { label: 'Fri', value: 4 },
    { label: 'Sat', value: 7 },
    { label: 'Sun', value: 5 },
  ],
  intentionCounts: {
    'Stress Relief': 5,
    Sleep: 3,
    Relaxation: 2,
    Gratitude: 1,
    Mindfulness: 1,
  },
};

export function createMockMeditationTitle(focus: string, moods: string[]): string {
  if (focus === 'Sleep') return 'A Gentle Descent Into Rest';
  if (focus === 'Gratitude') return 'Noticing What Remains Warm';
  if (focus === 'Motivation') return 'Clarity for the Next Small Step';
  if (moods.includes('Anxious')) return 'Finding Ground in a Busy Mind';
  if (moods.includes('Tired')) return 'Rest Without Needing to Earn It';
  return 'A Moment Made for This Day';
}
