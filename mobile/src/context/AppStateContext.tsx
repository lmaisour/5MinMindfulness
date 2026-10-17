import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { MEDITATION_DURATION } from '@/constants/meditation';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/providers/AuthProvider';
import { createCheckIn } from '@/services/checkins';
import { getInsightsSummary } from '@/services/insights';
import {
  deleteMeditation as deleteMeditationRemote,
  listLibraryMeditations,
} from '@/services/meditations';
import type {
  CheckInPayload,
  InsightsSummary,
  Intention,
  Meditation,
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
  insights: InsightsSummary;
  draft: CheckInDraft;
  activeMeditationId?: string;
  activeCheckInId?: string;
  loadingLibrary: boolean;
  loadingInsights: boolean;
  submittingCheckIn: boolean;
  refreshLibrary: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  setDisplayName: (name: string) => void;
  updateDraft: (patch: Partial<CheckInDraft>) => void;
  resetDraft: () => void;
  toggleMood: (mood: Mood) => void;
  setFocus: (focus: Intention) => void;
  /** Persist the check-in. Script generation runs on the generation screen. */
  submitCheckInAndStartGeneration: () => Promise<{ checkInId: string }>;
  toggleDownload: (id: string) => void;
  deleteMeditation: (id: string) => Promise<void>;
  setActiveMeditationId: (id?: string) => void;
}

const emptyInsights: InsightsSummary = {
  totalMeditations: 0,
  totalMinutesListened: 0,
  sessionsThisWeek: 0,
  moodCounts: {},
  averageEnergyByDay: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
    (label) => ({ label, value: 0 }),
  ),
  intentionCounts: {},
};

const defaultDraft: CheckInDraft = {
  moods: [],
  energyLevel: 5,
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [insights, setInsights] = useState<InsightsSummary>(emptyInsights);
  const [draft, setDraft] = useState<CheckInDraft>(defaultDraft);
  const [activeMeditationId, setActiveMeditationId] = useState<string | undefined>();
  const [activeCheckInId, setActiveCheckInId] = useState<string | undefined>();
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const submitLock = useRef(false);

  const refreshLibrary = useCallback(async () => {
    if (!isSupabaseConfigured() || !auth.user) {
      setMeditations([]);
      return;
    }
    setLoadingLibrary(true);
    try {
      const rows = await listLibraryMeditations();
      setMeditations(rows);
    } finally {
      setLoadingLibrary(false);
    }
  }, [auth.user]);

  const refreshInsights = useCallback(async () => {
    if (!isSupabaseConfigured() || !auth.user) {
      setInsights(emptyInsights);
      return;
    }
    setLoadingInsights(true);
    try {
      setInsights(await getInsightsSummary());
    } finally {
      setLoadingInsights(false);
    }
  }, [auth.user]);

  useEffect(() => {
    if (auth.displayName) {
      setDraft((prev) => ({ ...prev, name: auth.displayName }));
    }
  }, [auth.displayName]);

  useEffect(() => {
    void refreshLibrary();
    void refreshInsights();
  }, [refreshLibrary, refreshInsights]);

  const profile: UserProfile = {
    displayName: auth.displayName,
    personalizationEnabled: auth.personalizationEnabled,
    notificationsEnabled: auth.notificationsEnabled,
    isGuest: !auth.user || auth.isAnonymous,
  };

  const value = useMemo<AppStateContextValue>(
    () => ({
      profile,
      meditations,
      insights,
      draft,
      activeMeditationId,
      activeCheckInId,
      loadingLibrary,
      loadingInsights,
      submittingCheckIn,
      refreshLibrary,
      refreshInsights,
      setDisplayName: (name) => {
        setDraft((prev) => ({ ...prev, name: name.trim() || undefined }));
        if (auth.user) {
          void auth.updateDisplayName(name);
        }
      },
      updateDraft: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      resetDraft: () =>
        setDraft({
          ...defaultDraft,
          name: auth.displayName,
        }),
      toggleMood: (mood) =>
        setDraft((prev) => ({
          ...prev,
          moods: prev.moods.includes(mood)
            ? prev.moods.filter((item) => item !== mood)
            : [...prev.moods, mood],
        })),
      setFocus: (focus) => setDraft((prev) => ({ ...prev, focus })),
      submitCheckInAndStartGeneration: async () => {
        if (submitLock.current) {
          throw new Error('Check-in already submitting');
        }
        if (!draft.focus || draft.moods.length === 0) {
          throw new Error('Complete mood and intention before continuing.');
        }

        submitLock.current = true;
        setSubmittingCheckIn(true);
        try {
          await auth.ensureAnonymous();
          const saved = await createCheckIn({
            name: draft.name,
            moods: draft.moods,
            energyLevel: draft.energyLevel,
            focus: draft.focus,
            notes: draft.notes,
          });

          setActiveCheckInId(saved.id);
          setActiveMeditationId(undefined);
          void refreshInsights();
          return { checkInId: saved.id };
        } finally {
          submitLock.current = false;
          setSubmittingCheckIn(false);
        }
      },
      toggleDownload: (id) => {
        setMeditations((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, downloaded: !item.downloaded } : item,
          ),
        );
      },
      deleteMeditation: async (id) => {
        await deleteMeditationRemote(id);
        setMeditations((prev) => prev.filter((item) => item.id !== id));
      },
      setActiveMeditationId,
    }),
    [
      profile,
      meditations,
      insights,
      draft,
      activeMeditationId,
      activeCheckInId,
      loadingLibrary,
      loadingInsights,
      submittingCheckIn,
      refreshLibrary,
      refreshInsights,
      auth,
    ],
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
