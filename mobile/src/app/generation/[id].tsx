import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
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

/**
 * Phase 2: generation UI is simulated locally.
 * Check-ins are persisted; fake "ready" meditations are NOT written to Supabase.
 */
export default function GenerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    updateMeditationStatus,
    markMeditationReady,
    getLocalGenerationStatus,
    generationMode,
  } = useAppState();
  const [failed, setFailed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const status =
    (id ? getLocalGenerationStatus(id) : undefined) ??
    (failed ? 'failed' : FLOW[stepIndex]);

  useEffect(() => {
    if (!id || failed || generationMode !== 'simulated') return;
    if (status === 'ready') return;

    const timer = setTimeout(() => {
      const next = Math.min(stepIndex + 1, FLOW.length - 1);
      setStepIndex(next);
      const nextStatus = FLOW[next];
      if (nextStatus === 'ready') {
        markMeditationReady(id);
      } else {
        updateMeditationStatus(id, nextStatus);
      }
    }, 1600);

    return () => clearTimeout(timer);
  }, [
    failed,
    generationMode,
    id,
    markMeditationReady,
    status,
    stepIndex,
    updateMeditationStatus,
  ]);

  const message = GENERATION_MESSAGES[status] ?? 'Creating your moment of calm…';

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
        {APP_NAME}
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
      <Text
        variant="caption"
        color={colors.charcoalMuted}
        align="center"
        style={styles.hint}>
        Your check-in is saved. Audio generation is simulated in Phase 2 — real
        meditations arrive in Phase 3.
      </Text>

      <View style={styles.actions}>
        {failed ? (
          <>
            <Button
              label="Try again"
              onPress={() => {
                setFailed(false);
                setStepIndex(0);
                if (id) updateMeditationStatus(id, 'pending');
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
            {status === 'ready' ? (
              <Button
                label="Done — go to Library"
                onPress={() => router.replace('/(tabs)/library')}
              />
            ) : (
              <Button
                label="Continue in Library"
                variant="secondary"
                onPress={() => router.replace('/(tabs)/library')}
              />
            )}
            <Button
              label="Simulate failure"
              variant="ghost"
              onPress={() => {
                setFailed(true);
                if (id) updateMeditationStatus(id, 'failed');
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
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
