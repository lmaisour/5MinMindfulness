import { useRouter } from 'expo-router';
import { Alert, Switch, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const auth = useAuth();

  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, check-ins, and related data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void auth
              .deleteAccount()
              .then(() => router.replace('/'))
              .catch((error: unknown) =>
                Alert.alert(
                  'Deletion failed',
                  error instanceof Error ? error.message : 'Please try again.',
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <SectionHeader
        title="Profile"
        subtitle="Your space for preferences, privacy, and account care."
      />

      <View style={styles.panel}>
        <Text variant="caption" color={colors.charcoalMuted}>
          Signed in as
        </Text>
        <Text variant="title" color={colors.forest} style={styles.name}>
          {auth.displayName ||
            (auth.isAnonymous ? 'Guest' : auth.email || 'Member')}
        </Text>
        <Text variant="body" color={colors.charcoalMuted}>
          {auth.isAnonymous
            ? 'You’re exploring as a guest. Create an account to keep your meditations across devices.'
            : auth.email
              ? `Signed in with ${auth.email}`
              : 'Your meditation history is linked to your account.'}
        </Text>
        {auth.isAnonymous || !auth.user ? (
          <Button
            label="Create Account / Sign In"
            onPress={() => router.push('/sign-in')}
            style={styles.cta}
          />
        ) : (
          <Button
            label="Sign out"
            variant="secondary"
            onPress={() =>
              void auth.signOut().then(() => router.replace('/')).catch((error) =>
                Alert.alert(
                  'Sign out failed',
                  error instanceof Error ? error.message : 'Please try again.',
                ),
              )
            }
            style={styles.cta}
          />
        )}
      </View>

      <View style={styles.panel}>
        <Row
          title="Historical personalization"
          body="Use past preferences to gently inform future meditations. Private notes stay excluded unless you choose otherwise later."
          value={auth.personalizationEnabled}
          onChange={(value) => void auth.setPersonalizationEnabled(value)}
          disabled={!auth.user}
        />
        <Row
          title="Reminders"
          body="Occasional gentle reminders."
          value={auth.notificationsEnabled}
          onChange={(value) => void auth.setNotificationsEnabled(value)}
          disabled={!auth.user}
        />
      </View>

      <View style={styles.panel}>
        <Text variant="bodyStrong" color={colors.forest}>
          Privacy & trust
        </Text>
        <Text variant="body" color={colors.charcoalMuted} style={styles.privacy}>
          {APP_NAME} is not a substitute for therapy or medical care. Emotional check-ins
          stay private to your account. Analytics never include journal text or raw mood
          disclosures.
        </Text>
        {auth.user ? (
          <Button label="Delete my account" variant="danger" onPress={onDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

function Row({
  title,
  body,
  value,
  onChange,
  disabled,
}: {
  title: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text variant="bodyStrong" color={colors.forest}>
          {title}
        </Text>
        <Text variant="caption" color={colors.charcoalMuted}>
          {body}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.sandDeep, true: colors.sage }}
        thumbColor={colors.ivory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    marginBottom: spacing.md,
  },
  name: {
    marginVertical: spacing.xs,
  },
  cta: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  privacy: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
