import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, spacing } from '@/theme/tokens';

interface Props {
  total: number;
  current: number;
}

function Dot({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const width = useSharedValue(active ? 22 : 8);
  width.value = withTiming(active ? 22 : 8, {
    duration: reduceMotion ? 0 : motion.standard,
  });

  const style = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? colors.forest : colors.sandDeep,
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function ProgressDots({ total, current }: Props) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }).map((_, index) => (
        <Dot key={index} active={index === current} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
