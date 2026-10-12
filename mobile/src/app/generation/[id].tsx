import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { GENERATION_MESSAGES } from '@/constants/checkin';
import { useAppState } from '@/context/AppStateContext';
import type { MeditationStatus } from '@/types';
import { colors, spacing } from '@/theme/tokens';

const FLOW: MeditationStatus[] = [
  'pending',
  'generating_script',
  'generating_audio',
  'processing_audio',
  'ready',
];

export default function GenerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { meditations, updateMeditationStatus, markMeditationReady } = useAppState();
  const meditation = useMemo(
    () => meditations.find((item) => item.id === id),
    [meditations, id],
  );
  const [failed, setFailed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!meditation || failed) return;

    if (meditation.status === 'ready') {
      const timer = setTimeout(() => {
        router.replace(`/player/${meditation.id}`);
      }, 700);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      const next = Math.min(stepIndex + 1, FLOW.length - 1);
      setStepIndex(next);
      const status = FLOW[next];
      if (status === 'ready') {
        markMeditationReady(meditation.id);
      } else {
        updateMeditationStatus(meditation.id, status);
      }
    }, 1600);

    return () => clearTimeout(timer);
  }, [
    failed,
    markMeditationReady,
    meditation,
    router,
    stepIndex,
    updateMeditationStatus,
  ]);

  if (!meditation) {
    return (
      <Screen scroll={false}>
        <Text variant="title" color={colors.forest}>
          Meditation not found
        </Text>
        <Button label="Go Home" onPress={() => router.replace('/(tabs)')} style={styles.cta} />
      </Screen>
    );
  }

  const status = failed ? 'failed' : meditation.status;
  const message = GENERATION_MESSAGES[status] ?? 'Creating your moment of calm…';

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
        Nura
      </Text>
      <Text variant="display" color={colors.forest} align="center">
        Creating your moment of calm…
      </Text>

      <View style={styles.circleWrap}>
        <BreathingCircle label="Calm" size={200} />
      </View>

      <Text variant="subtitle" color={colors.charcoalMuted} align="center">
        {message}
      </Text>
      <Text variant="caption" color={colors.charcoalMuted} align="center" style={styles.hint}>
        You can leave this screen — generation continues in the background (mocked for Phase 1).
      </Text>

      <View style={styles.actions}>
        {failed ? (
          <>
            <Button
              label="Try again"
              onPress={() => {
                setFailed(false);
                setStepIndex(0);
                updateMeditationStatus(meditation.id, 'pending');
              }}
            />
            <Button
              label="Back to Home"
              variant="ghost"
              onPress={() => router.replace('/(tabs)')}
            />
          </>
        ) : (
          <>
            <Button
              label="Continue in Library"
              variant="secondary"
              onPress={() => router.replace('/(tabs)/library')}
            />
            <Button
              label="Simulate failure"
              variant="ghost"
              onPress={() => {
                setFailed(true);
                updateMeditationStatus(meditation.id, 'failed');
              }}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  brand: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  circleWrap: {
    marginVertical: spacing.xxl,
  },
  hint: {
    marginTop: spacing.md,
    maxWidth: 300,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
