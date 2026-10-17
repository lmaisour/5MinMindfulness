import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { GENERATION_MESSAGES } from '@/constants/checkin';
import {
  readMeditationForCheckIn,
  requestMeditationScript,
  type GenerationResult,
} from '@/services/generation';
import { colors, spacing } from '@/theme/tokens';

/**
 * Phase 3A writes a structured script. Audio is intentionally not created.
 */
export default function GenerationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      let next = await requestMeditationScript(id);
      if (next.status === 'generating_script') {
        for (let attempt = 0; attempt < 15 && next.status === 'generating_script'; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const saved = await readMeditationForCheckIn(id);
          if (saved && saved.status !== 'generating_script') {
            next = saved;
            break;
          }
        }
      }
      if (next.status === 'generating_script') {
        throw new Error('The script is still being written. Please try again.');
      }
      if (next.status === 'script_ready' && !next.script) {
        throw new Error('The script could not be read. Please try again.');
      }
      setResult(next);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void generate();
  }, [generate]);

  const scriptReady = result?.status === 'script_ready' && result.script;
  const safety = result?.status === 'safety_support';

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
        {APP_NAME}
      </Text>
      <Text variant="display" color={colors.forest} align="center">
        {scriptReady ? result?.title || 'Your script' : 'Creating your moment of calm…'}
      </Text>

      <View style={styles.circleWrap}>
        <BreathingCircle label="Calm" size={scriptReady ? 140 : 200} />
      </View>

      {loading ? (
        <Text variant="subtitle" color={colors.charcoalMuted} align="center">
          {GENERATION_MESSAGES.generating_script}
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

      {scriptReady ? (
        <View style={styles.preview}>
          <Text variant="body" color={colors.charcoalMuted} align="center">
            {GENERATION_MESSAGES.script_ready} About 5 minutes of narration. This is a script preview. Audio has not been created.
          </Text>
          {result.script?.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text variant="label" color={colors.forestSoft}>
                {sectionLabel(section.id)}
              </Text>
              {section.blocks.map((block, index) =>
                block.type === 'pause' ? (
                  <Text key={`${section.id}-${index}`} variant="caption" color={colors.charcoalMuted}>
                    {`Pause · ${block.seconds} seconds`}
                  </Text>
                ) : (
                  <Text key={`${section.id}-${index}`} variant="body" color={colors.charcoal}>
                    {block.text}
                  </Text>
                ),
              )}
            </View>
          ))}
        </View>
      ) : null}

      {result && !scriptReady && !safety && !loading && !error ? (
        <Text variant="body" color={colors.charcoal} align="center" style={styles.preview}>
          {result.message ?? 'This check-in already has a meditation. Audio playback is not part of this step.'}
        </Text>
      ) : null}

      {!result && !error ? (
        <Text variant="caption" color={colors.charcoalMuted} align="center" style={styles.hint}>
          Your check-in is saved. A written meditation is being prepared. Audio is not part of this step.
        </Text>
      ) : null}

      <View style={styles.actions}>
        {error ? (
          <Button label="Try again" onPress={() => void generate()} disabled={loading} />
        ) : null}
        <Button
          label="Back to Home"
          variant={scriptReady || safety || error ? 'secondary' : 'ghost'}
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </Screen>
  );
}

function sectionLabel(id: string) {
  switch (id) {
    case 'arrival':
      return 'Arrival';
    case 'breathing':
      return 'Breathing';
    case 'emotional_awareness':
      return 'Emotional Awareness';
    case 'personalized_practice':
      return 'Personalized Practice';
    case 'closing':
      return 'Closing';
    default:
      return id;
  }
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
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
