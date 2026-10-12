import type { MeditationDurationLabel } from '@/constants/meditation';

export type Mood =
  | 'Happy'
  | 'Anxious'
  | 'Sad'
  | 'Hopeful'
  | 'Tired'
  | 'Excited';

export type Intention =
  | 'Relaxation'
  | 'Stress Relief'
  | 'Gratitude'
  | 'Motivation'
  | 'Sleep'
  | 'Mindfulness';

export type MeditationStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_audio'
  | 'processing_audio'
  | 'ready'
  | 'failed';

export type MeditationDuration = MeditationDurationLabel;

export interface CheckInPayload {
  name?: string;
  moods: Mood[];
  energyLevel: number;
  focus: Intention;
  duration: MeditationDuration;
  notes?: string;
}

export interface Meditation {
  id: string;
  title: string;
  intention: Intention;
  createdAt: string;
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  status: MeditationStatus;
  moods: Mood[];
  energyLevel: number;
  notes?: string;
  downloaded: boolean;
}

export interface ListeningSession {
  id: string;
  meditationId: string;
  startedAt: string;
  completedAt?: string;
  listenedSeconds: number;
}

export interface UserProfile {
  displayName?: string;
  personalizationEnabled: boolean;
  notificationsEnabled: boolean;
  isGuest: boolean;
}

export interface InsightsSummary {
  totalMeditations: number;
  totalMinutesListened: number;
  sessionsThisWeek: number;
  moodCounts: Partial<Record<Mood, number>>;
  averageEnergyByDay: { label: string; value: number }[];
  intentionCounts: Partial<Record<Intention, number>>;
}
