import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme/tokens';

interface Props {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, body, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.orb} />
      <Text variant="title" color={colors.forest} style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={colors.charcoalMuted} align="center">
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.sageMuted,
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
