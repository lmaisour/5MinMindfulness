import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { MEDITATION_DURATION } from '@/constants/meditation';
import { useAppState } from '@/context/AppStateContext';
import { colors, radii, spacing } from '@/theme/tokens';

export default function CheckInReviewScreen() {
  const router = useRouter();
  const { draft, createMeditationFromDraft } = useAppState();

  const create = () => {
    const meditation = createMeditationFromDraft();
    router.replace(`/generation/${meditation.id}`);
  };

  return (
    <CheckInShell
      step="review"
      question="Your moment of calm is ready to begin."
      supporting={`We’ll create a ${MEDITATION_DURATION.label} meditation from what you’ve shared.`}
      footer={
        <View style={styles.footer}>
          <Button label="Create My Meditation" onPress={create} />
          <Button label="Edit responses" variant="ghost" onPress={() => router.back()} />
        </View>
      }>
      <View style={styles.summary}>
        <Row label="Name" value={draft.name?.trim() || 'Guest'} />
        <Row label="Moods" value={draft.moods.join(', ') || '—'} />
        <Row label="Energy" value={`${draft.energyLevel} / 10`} />
        <Row label="Support" value={draft.focus ?? '—'} />
        <Row label="Duration" value={MEDITATION_DURATION.label} />
        <Row
          label="Notes"
          value={draft.notes?.trim() ? 'Included privately' : 'None'}
        />
      </View>
      <Text variant="caption" color={colors.charcoalMuted} style={styles.note}>
        Sensitive details stay in your check-in. Analytics never receive journal text.
      </Text>
    </CheckInShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color={colors.charcoalMuted}>
        {label}
      </Text>
      <Text variant="bodyStrong" color={colors.forest}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    padding: spacing.md,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mist,
    gap: 4,
  },
  note: {
    marginTop: spacing.md,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
