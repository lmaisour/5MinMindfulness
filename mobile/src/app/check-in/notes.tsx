import { useRouter } from 'expo-router';
import { StyleSheet, TextInput } from 'react-native';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { FormNav } from '@/components/ui/FormNav';
import { useAppState } from '@/context/AppStateContext';
import { colors, radii, spacing } from '@/theme/tokens';

export default function CheckInNotesScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useAppState();

  return (
    <CheckInShell
      step="notes"
      question="What’s on your mind?"
      supporting="Share anything you’d like your meditation to acknowledge. Completely optional."
      footer={
        <FormNav
          onBack={() => router.back()}
          nextLabel={draft.notes?.trim() ? 'Continue' : 'Skip'}
          onNext={() => router.push('/check-in/review')}
        />
      }>
      <TextInput
        value={draft.notes ?? ''}
        onChangeText={(notes) => updateDraft({ notes })}
        placeholder="A few words are enough…"
        placeholderTextColor={colors.charcoalMuted}
        multiline
        textAlignVertical="top"
        style={styles.input}
        accessibilityLabel="Optional notes"
      />
    </CheckInShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 160,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.charcoal,
  },
});
