import { useRouter } from 'expo-router';
import { Switch, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useAppState } from '@/context/AppStateContext';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setGuestLinked } = useAppState();
  const [personalization, setPersonalization] = useState(profile.personalizationEnabled);
  const [notifications, setNotifications] = useState(profile.notificationsEnabled);

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
          {profile.displayName || (profile.isGuest ? 'Guest' : 'Member')}
        </Text>
        <Text variant="body" color={colors.charcoalMuted}>
          {profile.isGuest
            ? 'You’re exploring as a guest. Create an account to keep your meditations across devices.'
            : 'Your meditation history is linked to your account.'}
        </Text>
        {profile.isGuest ? (
          <Button
            label="Create Account / Sign In"
            onPress={() => router.push('/sign-in')}
            style={styles.cta}
          />
        ) : null}
      </View>

      <View style={styles.panel}>
        <Row
          title="Historical personalization"
          body="Use past preferences to gently inform future meditations. Private notes stay excluded unless you choose otherwise later."
          value={personalization}
          onChange={setPersonalization}
        />
        <Row
          title="Reminders"
          body="Occasional gentle reminders. Off by default in this mock build."
          value={notifications}
          onChange={setNotifications}
        />
      </View>

      <View style={styles.panel}>
        <Text variant="bodyStrong" color={colors.forest}>
          Privacy & trust
        </Text>
        <Text variant="body" color={colors.charcoalMuted} style={styles.privacy}>
          Nura is not a substitute for therapy or medical care. Emotional check-ins stay
          private to your account. Analytics never include journal text or raw mood
          disclosures.
        </Text>
        <Button
          label="Simulate account linking"
          variant="secondary"
          onPress={setGuestLinked}
          style={styles.cta}
        />
        <Button label="Request data deletion" variant="danger" onPress={() => {}} />
      </View>
    </Screen>
  );
}

function Row({
  title,
  body,
  value,
  onChange,
}: {
  title: string;
  body: string;
  value: boolean;
  onChange: (value: boolean) => void;
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
  },
});
