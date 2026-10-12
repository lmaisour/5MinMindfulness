import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme/tokens';

interface Props {
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (delta: number) => void;
  tone?: 'light' | 'dark';
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioControls({
  isPlaying,
  positionSeconds,
  durationSeconds,
  onTogglePlay,
  onSeek,
  onSkip,
  tone = 'light',
}: Props) {
  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;
  const isDark = tone === 'dark';
  const accent = isDark ? colors.ivory : colors.forest;
  const muted = isDark ? colors.sand : colors.charcoalMuted;
  const track = isDark ? 'rgba(248, 246, 241, 0.25)' : colors.sandDeep;
  const fill = isDark ? colors.sand : colors.forest;
  const playBg = isDark ? colors.ivory : colors.forest;
  const playIcon = isDark ? colors.forest : colors.ivory;

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: fill }]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(event) => {
            const width = event.nativeEvent.locationX;
            const ratio = Math.max(0, Math.min(1, width / 300));
            onSeek(ratio * durationSeconds);
          }}
          accessibilityLabel="Seek"
        />
      </View>

      <View style={styles.times}>
        <Text variant="caption" color={muted}>
          {formatTime(positionSeconds)}
        </Text>
        <Text variant="caption" color={muted}>
          -{formatTime(Math.max(durationSeconds - positionSeconds, 0))}
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Skip back 15 seconds"
          onPress={() => {
            void Haptics.selectionAsync();
            onSkip(-15);
          }}
          style={styles.sideButton}>
          <Ionicons name="play-back" size={22} color={accent} />
          <Text variant="caption" color={accent}>
            15
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onTogglePlay();
          }}
          style={[styles.playButton, { backgroundColor: playBg }]}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={playIcon}
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="Skip forward 15 seconds"
          onPress={() => {
            void Haptics.selectionAsync();
            onSkip(15);
          }}
          style={styles.sideButton}>
          <Ionicons name="play-forward" size={22} color={accent} />
          <Text variant="caption" color={accent}>
            15
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  sideButton: {
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
