import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityHint,
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPressIn={() => {
        if (!reduceMotion) {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 220 });
        }
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 220 });
      }}
      onPress={() => {
        if (!disabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }
      }}
      style={[
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}>
      <Text
        style={[
          typography.button,
          {
            color:
              variant === 'primary'
                ? colors.ivory
                : variant === 'danger'
                  ? colors.danger
                  : colors.forest,
          },
        ]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.forest,
  },
  secondary: {
    backgroundColor: colors.sand,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.mistStrong,
  },
  danger: {
    backgroundColor: 'rgba(139, 74, 59, 0.08)',
  },
  disabled: {
    opacity: 0.45,
  },
});
