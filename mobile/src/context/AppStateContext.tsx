import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  MEDITATION_DURATION,
  mockActualDurationSeconds,
} from '@/constants/meditation';
import { createMockMeditationTitle, MOCK_MEDITATIONS, MOCK_PROFILE } from '@/data/mock';
import type {
  CheckInPayload,
  Intention,
  Meditation,
  MeditationStatus,
  Mood,
  UserProfile,
} from '@/types';

interface CheckInDraft {
  name?: string;
  moods: Mood[];
  energyLevel: number;
  focus?: Intention;
  notes?: string;
}

interface AppStateContextValue {
  profile: UserProfile;
  meditations: Meditation[];
  draft: CheckInDraft;
  activeMeditationId?: string;
  setDisplayName: (name: string) => void;
  updateDraft: (patch: Partial<CheckInDraft>) => void;
  resetDraft: () => void;
  toggleMood: (mood: Mood) => void;
  setFocus: (focus: Intention) => void;
  createMeditationFromDraft: () => Meditation;
  updateMeditationStatus: (id: string, status: MeditationStatus) => void;
  markMeditationReady: (id: string) => void;
  toggleDownload: (id: string) => void;
  deleteMeditation: (id: string) => void;
  setGuestLinked: () => void;
  setActiveMeditationId: (id?: string) => void;
}

const defaultDraft: CheckInDraft = {
  moods: [],
  energyLevel: 5,
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(MOCK_PROFILE);
  const [meditations, setMeditations] = useState<Meditation[]>(MOCK_MEDITATIONS);
  const [draft, setDraft] = useState<CheckInDraft>({
    ...defaultDraft,
    name: MOCK_PROFILE.displayName,
  });
  const [activeMeditationId, setActiveMeditationId] = useState<string | undefined>();

  const value = useMemo<AppStateContextValue>(
    () => ({
      profile,
      meditations,
      draft,
      activeMeditationId,
      setDisplayName: (name) => {
        setProfile((prev) => ({ ...prev, displayName: name.trim() || undefined }));
        setDraft((prev) => ({ ...prev, name: name.trim() || undefined }));
      },
      updateDraft: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      resetDraft: () =>
        setDraft({
          ...defaultDraft,
          name: profile.displayName,
        }),
      toggleMood: (mood) =>
        setDraft((prev) => ({
          ...prev,
          moods: prev.moods.includes(mood)
            ? prev.moods.filter((item) => item !== mood)
            : [...prev.moods, mood],
        })),
      setFocus: (focus) => setDraft((prev) => ({ ...prev, focus })),
      createMeditationFromDraft: () => {
        const focus = draft.focus ?? 'Mindfulness';
        const meditation: Meditation = {
          id: `med-${Date.now()}`,
          title: createMockMeditationTitle(focus, draft.moods),
          intention: focus,
          createdAt: new Date().toISOString(),
          targetDurationSeconds: MEDITATION_DURATION.targetSeconds,
          actualDurationSeconds: 0,
          status: 'pending',
          moods: draft.moods,
          energyLevel: draft.energyLevel,
          notes: draft.notes,
          downloaded: false,
        };
        setMeditations((prev) => [meditation, ...prev]);
        setActiveMeditationId(meditation.id);
        if (draft.name?.trim()) {
          setProfile((prev) => ({ ...prev, displayName: draft.name?.trim() }));
        }
        return meditation;
      },
      updateMeditationStatus: (id, status) =>
        setMeditations((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        ),
      markMeditationReady: (id) =>
        setMeditations((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'ready',
                  actualDurationSeconds: mockActualDurationSeconds(),
                }
              : item,
          ),
        ),
      toggleDownload: (id) =>
        setMeditations((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, downloaded: !item.downloaded } : item,
          ),
        ),
      deleteMeditation: (id) =>
        setMeditations((prev) => prev.filter((item) => item.id !== id)),
      setGuestLinked: () => setProfile((prev) => ({ ...prev, isGuest: false })),
      setActiveMeditationId,
    }),
    [profile, meditations, draft, activeMeditationId],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

export function draftToPayload(draft: CheckInDraft): CheckInPayload {
  return {
    name: draft.name,
    moods: draft.moods,
    energyLevel: draft.energyLevel,
    focus: draft.focus ?? 'Mindfulness',
    duration: MEDITATION_DURATION.label,
    notes: draft.notes,
  };
}
