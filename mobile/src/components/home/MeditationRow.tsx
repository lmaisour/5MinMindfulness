import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { Meditation } from '@/types';
import { colors, radii, spacing } from '@/theme/tokens';

interface Props {
  meditation: Meditation;
  onPress: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export function MeditationRow({ meditation, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.copy}>
        <Text variant="bodyStrong" color={colors.forest} numberOfLines={1}>
          {meditation.title}
        </Text>
        <Text variant="caption" color={colors.charcoalMuted}>
          {formatDate(meditation.createdAt)} · {formatDuration(meditation.actualDurationSeconds || meditation.targetDurationSeconds)} · {meditation.intention}
        </Text>
      </View>
      <View style={styles.play}>
        <Ionicons name="play" size={16} color={colors.ivory} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistStrong,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
});
