import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { useAppState } from '@/context/AppStateContext';
import { colors, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const router = useRouter();
  const { setGuestLinked } = useAppState();

  const complete = () => {
    setGuestLinked();
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
        {APP_NAME}
      </Text>
      <Text variant="display" color={colors.forest} style={styles.title}>
        Keep your calm with you.
      </Text>
      <Text variant="body" color={colors.charcoalMuted} style={styles.body}>
        Sign in to preserve your meditation history across devices. Guest sessions can be
        linked without losing what you’ve already created.
      </Text>

      <View style={styles.actions}>
        <Button label="Continue with Apple" onPress={complete} />
        <Button label="Continue with Google" variant="secondary" onPress={complete} />
        <Button label="Continue with Email" variant="ghost" onPress={complete} />
        <Button
          label="Not now"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <Text variant="caption" color={colors.charcoalMuted} style={styles.note}>
        Phase 1 mock — real Supabase Auth arrives in Phase 2.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.md,
  },
  body: {
    marginBottom: spacing.xl,
  },
  actions: {
    gap: spacing.sm,
  },
  note: {
    marginTop: spacing.xl,
  },
});
