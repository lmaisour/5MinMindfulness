import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      if (successMessage) {
        Alert.alert('Success', successMessage);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(
        'Authentication error',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
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
        {auth.isAnonymous
          ? 'Save this guest session to a permanent account without losing your check-ins.'
          : 'Sign in to access your meditation history across devices.'}
      </Text>

      <View style={styles.actions}>
        {Platform.OS === 'ios' ? (
          <Button
            label="Continue with Apple"
            onPress={() => void run(() => auth.signInWithApple())}
            disabled={busy}
          />
        ) : null}
        <Button
          label="Continue with Google"
          variant="secondary"
          onPress={() => void run(() => auth.signInWithGoogle())}
          disabled={busy}
        />

        <Text variant="label" color={colors.forestSoft} style={styles.section}>
          Email code
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.charcoalMuted}
          style={styles.input}
        />
        {!otpSent ? (
          <Button
            label="Send email code"
            variant="ghost"
            disabled={busy || !email.trim()}
            onPress={() =>
              void run(async () => {
                await auth.sendEmailOtp(email);
                setOtpSent(true);
              }, 'Check your email for a one-time code.')
            }
          />
        ) : (
          <>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="6-digit code"
              placeholderTextColor={colors.charcoalMuted}
              style={styles.input}
            />
            <Button
              label="Verify code"
              disabled={busy || otp.trim().length < 6}
              onPress={() => void run(() => auth.verifyEmailOtp(email, otp))}
            />
          </>
        )}

        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </View>
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
  section: {
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: colors.charcoal,
  },
});
