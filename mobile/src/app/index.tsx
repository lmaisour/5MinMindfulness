import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrganicBackdrop } from '@/components/ui/OrganicBackdrop';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { APP_NAME, APP_TAGLINE } from '@/constants/brand';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E9DFD0', '#F8F6F1', '#C5D1C1']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <OrganicBackdrop />

      <SafeAreaView style={styles.safe}>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(700)}
          style={styles.brandBlock}>
          <Text variant="brand" color={colors.forest} style={styles.brand}>
            {APP_NAME}
          </Text>
          <Text variant="caption" color={colors.forestSoft} style={styles.tagline}>
            {APP_TAGLINE}
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.delay(120).duration(700)}
          style={styles.copyBlock}>
          <Text variant="display" color={colors.forest} style={styles.headline}>
            A moment of calm, made just for you.
          </Text>
          <Text variant="subtitle" color={colors.charcoalMuted}>
            Tell us how you’re feeling, and we’ll create a personalized meditation to
            meet you where you are.
          </Text>
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.delay(220).duration(700)}
          style={styles.actions}>
          <Button
            label="Create My Meditation"
            onPress={() => router.push('/check-in/name')}
          />
          <Button
            label="Sign In"
            variant="ghost"
            onPress={() => router.push('/sign-in')}
            style={styles.secondary}
          />
          <Button
            label="Explore the app"
            variant="secondary"
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  brandBlock: {
    marginTop: spacing.xl,
  },
  brand: {
    fontSize: 34,
    lineHeight: 40,
  },
  tagline: {
    marginTop: spacing.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  spacer: {
    flex: 1,
  },
  copyBlock: {
    marginBottom: spacing.xl,
    gap: spacing.md,
    maxWidth: 360,
  },
  headline: {
    maxWidth: 320,
  },
  actions: {
    gap: spacing.sm,
  },
  secondary: {
    marginTop: 0,
  },
});
