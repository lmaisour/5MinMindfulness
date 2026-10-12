import { useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { FormNav } from '@/components/ui/FormNav';
import { Text } from '@/components/ui/Text';
import { useAppState } from '@/context/AppStateContext';
import { colors, radii, spacing } from '@/theme/tokens';

export default function CheckInNameScreen() {
  const router = useRouter();
  const { draft, updateDraft, profile } = useAppState();
  const returning = Boolean(profile.displayName);

  return (
    <CheckInShell
      step="name"
      question="What should we call you?"
      supporting={
        returning
          ? 'We’ve kept the name you shared before. Change it anytime.'
          : 'Optional for guests — skip if you’d rather stay anonymous.'
      }
      footer={
        <FormNav
          hideBack
          nextLabel={draft.name?.trim() ? 'Continue' : 'Skip for now'}
          onNext={() => router.push('/check-in/mood')}
        />
      }>
      <TextInput
        value={draft.name ?? ''}
        onChangeText={(name) => updateDraft({ name })}
        placeholder="First name"
        placeholderTextColor={colors.charcoalMuted}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel="First name"
      />
      <View style={styles.hint}>
        <Text variant="caption" color={colors.charcoalMuted}>
          We’ll only use this to personalize your meditation greeting.
        </Text>
      </View>
    </CheckInShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    color: colors.charcoal,
  },
  hint: {
    marginTop: spacing.md,
  },
});
