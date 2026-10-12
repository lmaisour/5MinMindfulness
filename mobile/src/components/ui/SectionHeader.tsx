import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="title" color={colors.forest}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color={colors.charcoalMuted} style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
