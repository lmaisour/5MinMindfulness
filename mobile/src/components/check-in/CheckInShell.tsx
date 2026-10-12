import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressDots } from '@/components/ui/ProgressDots';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { CHECKIN_STEPS, type CheckInStep } from '@/constants/checkin';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  step: CheckInStep;
  question: string;
  supporting?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function CheckInShell({
  step,
  question,
  supporting,
  children,
  footer,
}: Props) {
  const index = CHECKIN_STEPS.indexOf(step);

  return (
    <Screen scroll contentStyle={styles.content}>
      <ProgressDots total={CHECKIN_STEPS.length} current={index} />
      <Text variant="caption" color={colors.forestSoft} style={styles.stepLabel}>
        Step {index + 1} of {CHECKIN_STEPS.length}
      </Text>
      <Text variant="title" color={colors.forest} style={styles.question}>
        {question}
      </Text>
      {supporting ? (
        <Text variant="body" color={colors.charcoalMuted} style={styles.supporting}>
          {supporting}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  stepLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  question: {
    marginBottom: spacing.sm,
  },
  supporting: {
    marginBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
});
