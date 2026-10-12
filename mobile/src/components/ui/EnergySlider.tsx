import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme/tokens';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function EnergySlider({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.valueWrap}>
        <Text variant="display" color={colors.forest}>
          {value}
        </Text>
        <Text variant="caption" color={colors.charcoalMuted}>
          of 10
        </Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.forest}
        maximumTrackTintColor={colors.sandDeep}
        thumbTintColor={colors.forest}
        accessibilityLabel="Energy level"
      />

      <View style={styles.labels}>
        <Text variant="caption" color={colors.charcoalMuted}>
          Very Low
        </Text>
        <Text variant="caption" color={colors.charcoalMuted}>
          Very High
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.mistStrong,
  },
  valueWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
