import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors } from '@/theme/tokens';

interface Props {
  tone?: 'light' | 'dark';
}

export function OrganicBackdrop({ tone = 'light' }: Props) {
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(
      withTiming(1, {
        duration: 12000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [drift, reduceMotion]);

  const blobA = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value * 12 },
      { translateX: drift.value * -8 },
    ],
  }));

  const blobB = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value * -10 },
      { translateX: drift.value * 14 },
    ],
  }));

  const isDark = tone === 'dark';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.blobA,
          {
            backgroundColor: isDark ? colors.sage : colors.sageMuted,
            opacity: isDark ? 0.22 : 0.55,
          },
          blobA,
        ]}
      />
      <Animated.View
        style={[
          styles.blobB,
          {
            backgroundColor: isDark ? colors.lavender : colors.lavender,
            opacity: isDark ? 0.18 : 0.35,
          },
          blobB,
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(38, 61, 53, 0.15)'
              : 'rgba(248, 246, 241, 0.35)',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blobA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  blobB: {
    position: 'absolute',
    bottom: 80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
});
