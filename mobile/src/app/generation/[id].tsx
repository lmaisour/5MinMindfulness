import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { GENERATION_MESSAGES } from '@/constants/checkin';
import { useAppState } from '@/context/AppStateContext';
import {
  advanceMeditationAudio,
  readMeditationForCheckIn,
  requestMeditationScript,
  type GenerationResult,
} from '@/services/generation';
import { colors, spacing } from '@/theme/tokens';
import type { MeditationStatus } from '@/types';

const AUDIO_STATUSES = new Set<MeditationStatus | 'safety_support'>([
  'script_ready',
  'generating_audio',
  'processing_audio',
  'failed',
  'ready',
]);

/**
 * Writes the script, then narrates it. The player opens only after measured audio is ready.
 */
export default function GenerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refreshLibrary } = useAppState();
  const [phase, setPhase] = useState<string>('generating_script');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const meditationIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const openPlayer = useCallback(
    async (meditationId: string) => {
      await refreshLibrary();
      if (!cancelledRef.current) router.replace(`/player/${meditationId}`);
    },
    [refreshLibrary, router],
  );

  const narrate = useCallback(
    async (meditationId: string) => {
      meditationIdRef.current = meditationId;
      for (let attempt = 0; attempt < 48; attempt += 1) {
        if (cancelledRef.current) return;
        const audio = await advanceMeditationAudio(meditationId);
        if (audio.status === 'processing_audio' || audio.status === 'generating_audio') {
          setPhase(audio.status);
        }
        if (audio.status === 'ready') {
          await openPlayer(meditationId);
          return;
        }
        if (audio.status === 'failed') {
          throw new Error(audio.message || GENERATION_MESSAGES.failed);
        }
        await wait(1200);
      }
      throw new Error('Narration is still being prepared. You can leave and continue from the Library.');
    },
    [openPlayer],
  );

  const generate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPhase('generating_script');
    try {
      let next = await requestMeditationScript(id);
      if (next.status === 'generating_script') {
        for (let attempt = 0; attempt < 15 && next.status === 'generating_script'; attempt += 1) {
          if (cancelledRef.current) return;
          await wait(2000);
          const saved = await readMeditationForCheckIn(id);
          if (saved && saved.status !== 'generating_script') {
            next = saved;
            break;
          }
        }
      }
      if (cancelledRef.current) return;
      if (next.status === 'generating_script') {
        throw new Error('The script is still being written. Please try again.');
      }
      if (next.status === 'safety_support') {
        setResult(next);
        return;
      }
      if (!next.meditationId || !AUDIO_STATUSES.has(next.status)) {
        throw new Error(next.message || 'The meditation could not be prepared.');
      }
      meditationIdRef.current = next.meditationId;
      if (next.status === 'ready') {
        await openPlayer(next.meditationId);
        return;
      }
      setPhase(next.status === 'script_ready' ? 'generating_audio' : next.status);
      await narrate(next.meditationId);
    } catch (cause) {
      if (cancelledRef.current) return;
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [id, narrate, openPlayer]);

  useEffect(() => {
    cancelledRef.current = false;
    void generate();
    return () => {
      cancelledRef.current = true;
    };
  }, [generate]);

  const safety = result?.status === 'safety_support';
  const message = GENERATION_MESSAGES[phase] ?? GENERATION_MESSAGES.generating_audio;

  return (
    <Screen contentStyle={styles.content}>
      <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
        {APP_NAME}
      </Text>
      <Text variant="display" color={colors.forest} align="center">
        {safety ? 'A note of care' : 'Creating your moment of calm…'}
      </Text>

      <View style={styles.circleWrap}>
        <BreathingCircle label="Calm" size={200} />
      </View>

      {loading && !error && !safety ? (
        <Text variant="subtitle" color={colors.charcoalMuted} align="center">
          {message}
        </Text>
      ) : null}

      {loading && !error && !safety ? (
        <Text variant="caption" color={colors.charcoalMuted} align="center" style={styles.hint}>
          You can leave this screen. The Library will keep your place.
        </Text>
      ) : null}

      {error ? (
        <Text variant="subtitle" color={colors.charcoalMuted} align="center">
          {error}
        </Text>
      ) : null}

      {safety ? (
        <Text variant="body" color={colors.charcoal} align="center" style={styles.preview}>
          {result?.message}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {error ? (
          <Button
            label="Try again"
            onPress={() => void generate()}
            disabled={loading}
          />
        ) : null}
        <Button
          label="Back to Home"
          variant={safety || error ? 'secondary' : 'ghost'}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </Screen>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
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
  preview: {
    width: '100%',
    maxWidth: 420,
    marginTop: spacing.md,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
