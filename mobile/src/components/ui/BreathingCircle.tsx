import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, spacing } from '@/theme/tokens';

interface Props {
  label?: string;
  size?: number;
}

export function BreathingCircle({ label = 'Breathe', size = 180 }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.86);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 0.75;
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, {
          duration: motion.breatheIn,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0.86, {
          duration: motion.breatheOut,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: motion.breatheIn }),
        withTiming(0.45, { duration: motion.breatheOut }),
      ),
      -1,
      false,
    );
  }, [opacity, reduceMotion, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          ringStyle,
        ]}
      />
      <View style={styles.core}>
        <Text variant="label" color={colors.forest}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: colors.sage,
  },
  core: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.mistStrong,
    paddingHorizontal: spacing.xs,
  },
});
