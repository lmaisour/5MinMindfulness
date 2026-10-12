import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, radii, spacing } from '@/theme/tokens';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MoodPill({ label, selected, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  progress.value = withTiming(selected ? 1 : 0, {
    duration: reduceMotion ? 0 : motion.standard,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? colors.forest : colors.white,
    borderColor: progress.value > 0.5 ? colors.forest : colors.mistStrong,
    transform: [{ scale: 1 + progress.value * 0.02 }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[styles.pill, animatedStyle]}>
      <Text
        variant="label"
        color={selected ? colors.ivory : colors.forestSoft}
        style={styles.label}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    letterSpacing: 0.2,
  },
});
