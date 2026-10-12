import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { FormNav } from '@/components/ui/FormNav';
import { MoodPill } from '@/components/ui/MoodPill';
import { Text } from '@/components/ui/Text';
import { MOOD_OPTIONS } from '@/constants/checkin';
import { useAppState } from '@/context/AppStateContext';
import { colors, spacing } from '@/theme/tokens';

export default function CheckInMoodScreen() {
  const router = useRouter();
  const { draft, toggleMood } = useAppState();

  return (
    <CheckInShell
      step="mood"
      question="How are you feeling today?"
      supporting="Select everything that fits. More than one is welcome."
      footer={
        <FormNav
          onBack={() => router.back()}
          onNext={() => router.push('/check-in/energy')}
          nextDisabled={draft.moods.length === 0}
        />
      }>
      <View style={styles.pills}>
        {MOOD_OPTIONS.map((mood) => (
          <MoodPill
            key={mood}
            label={mood}
            selected={draft.moods.includes(mood)}
            onPress={() => toggleMood(mood)}
          />
        ))}
      </View>
      <Text variant="caption" color={colors.charcoalMuted} style={styles.hint}>
        {draft.moods.length === 0
          ? 'Choose at least one mood to continue.'
          : `${draft.moods.length} selected`}
      </Text>
    </CheckInShell>
  );
}

const styles = StyleSheet.create({
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hint: {
    marginTop: spacing.md,
  },
});
