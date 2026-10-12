import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, motion, radii, spacing } from '@/theme/tokens';

interface Props {
  title: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SelectableOption({ title, description, selected, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  progress.value = withTiming(selected ? 1 : 0, {
    duration: reduceMotion ? 0 : motion.standard,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: progress.value > 0.5 ? colors.forest : colors.mistStrong,
    backgroundColor: progress.value > 0.5 ? 'rgba(38, 61, 53, 0.06)' : colors.white,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[styles.option, animatedStyle]}>
      <View style={styles.row}>
        <View style={[styles.dot, selected && styles.dotSelected]} />
        <View style={styles.copy}>
          <Text variant="bodyStrong" color={colors.forest}>
            {title}
          </Text>
          {description ? (
            <Text variant="caption" color={colors.charcoalMuted} style={styles.description}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.sage,
    marginTop: 2,
  },
  dotSelected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  copy: {
    flex: 1,
  },
  description: {
    marginTop: spacing.xxs,
  },
});
