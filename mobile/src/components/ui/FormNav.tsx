import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme/tokens';

interface Props {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
}

export function FormNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  hideBack,
}: Props) {
  return (
    <View style={styles.row}>
      {!hideBack ? (
        <Button
          label="Back"
          variant="ghost"
          onPress={onBack}
          style={styles.back}
        />
      ) : (
        <View style={styles.back} />
      )}
      <Button
        label={nextLabel}
        onPress={onNext}
        disabled={nextDisabled}
        style={styles.next}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  back: {
    flex: 1,
  },
  next: {
    flex: 2,
  },
});
