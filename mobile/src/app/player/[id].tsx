import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioControls } from '@/components/player/AudioControls';
import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { OrganicBackdrop } from '@/components/ui/OrganicBackdrop';
import { Text } from '@/components/ui/Text';
import {
  formatMeditationMinutesLabel,
  MEDITATION_DURATION,
} from '@/constants/meditation';
import { useAppState } from '@/context/AppStateContext';
import { colors, spacing } from '@/theme/tokens';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { meditations, toggleDownload } = useAppState();
  const meditation = useMemo(
    () => meditations.find((item) => item.id === id),
    [meditations, id],
  );

  const duration =
    meditation?.actualDurationSeconds || MEDITATION_DURATION.targetSeconds;
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPosition((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration, isPlaying]);

  if (!meditation) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <Text variant="title" color={colors.forest}>
            Meditation unavailable
          </Text>
          <Button label="Back" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#263D35', '#3A564B', '#A8B9A3']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <OrganicBackdrop tone="dark" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Close player"
            onPress={() => router.back()}
            style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.ivory} />
          </Pressable>
          <Text variant="caption" color={colors.sand}>
            Now listening
          </Text>
          <Pressable
            accessibilityLabel={meditation.downloaded ? 'Remove download' : 'Download'}
            onPress={() => toggleDownload(meditation.id)}
            style={styles.iconBtn}>
            <Ionicons
              name={meditation.downloaded ? 'cloud-done' : 'download-outline'}
              size={22}
              color={colors.ivory}
            />
          </Pressable>
        </View>

        <View style={styles.center}>
          <BreathingCircle label={isPlaying ? 'Listen' : 'Rest'} size={210} />
          <Text variant="title" color={colors.ivory} align="center" style={styles.title}>
            {meditation.title}
          </Text>
          <Text variant="body" color={colors.sand} align="center">
            {meditation.intention} · {formatMeditationMinutesLabel()}
          </Text>
        </View>

        <View style={styles.controls}>
          <AudioControls
            tone="dark"
            isPlaying={isPlaying}
            positionSeconds={position}
            durationSeconds={duration}
            onTogglePlay={() => setIsPlaying((prev) => !prev)}
            onSeek={(seconds) => setPosition(Math.max(0, Math.min(seconds, duration)))}
            onSkip={(delta) =>
              setPosition((prev) => Math.max(0, Math.min(prev + delta, duration)))
            }
          />
          <Text variant="caption" color={colors.sand} align="center" style={styles.mockNote}>
            Phase 1 uses simulated playback timing. Real audio arrives in Phase 4.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.forest,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    marginTop: spacing.lg,
    maxWidth: 300,
  },
  controls: {
    paddingBottom: spacing.xl,
  },
  mockNote: {
    marginTop: spacing.lg,
    opacity: 0.8,
  },
});
