import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MeditationRow } from '@/components/home/MeditationRow';
import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { useAppState } from '@/context/AppStateContext';
import { useGreeting } from '@/hooks/useGreeting';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { profile, meditations, resetDraft } = useAppState();
  const greeting = useGreeting(profile.displayName);
  const reduceMotion = useReducedMotion();
  const recent = meditations.filter((item) => item.status === 'ready').slice(0, 3);

  const beginCheckIn = async () => {
    try {
      if (auth.configured) {
        await auth.ensureAnonymous();
      }
      resetDraft();
      router.push('/check-in/name');
    } catch (error) {
      Alert.alert(
        'Unable to start check-in',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <Screen>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(500)}>
        <Text variant="caption" color={colors.forestSoft} style={styles.brand}>
          {APP_NAME}
        </Text>
        <Text variant="display" color={colors.forest} style={styles.greeting}>
          {greeting}
        </Text>
      </Animated.View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text variant="title" color={colors.forest}>
            How are you feeling today?
          </Text>
          <Text variant="body" color={colors.charcoalMuted} style={styles.heroBody}>
            Let’s create a meditation that meets you where you are.
          </Text>
          <Button
            label="Begin Check-In"
            onPress={() => void beginCheckIn()}
            style={styles.heroCta}
          />
        </View>
        <BreathingCircle size={128} label="Begin" />
      </View>

      <View style={styles.recentHeader}>
        <Text variant="title" color={colors.forest}>
          Your Recent Meditations
        </Text>
      </View>

      {recent.length === 0 ? (
        <EmptyState
          title="Your library is waiting"
          body="Your first personalized meditation will appear here after you listen."
          actionLabel="Begin Check-In"
          onAction={() => void beginCheckIn()}
        />
      ) : (
        recent.map((meditation) => (
          <MeditationRow
            key={meditation.id}
            meditation={meditation}
            onPress={() => router.push(`/player/${meditation.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  greeting: {
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
  },
  heroCopy: {
    flex: 1,
  },
  heroBody: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  heroCta: {
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  recentHeader: {
    marginBottom: spacing.sm,
  },
});
