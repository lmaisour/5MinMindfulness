import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useAppState } from '@/context/AppStateContext';
import { formatDurationMinutes, formatLongDate } from '@/utils/format';
import { colors, radii, spacing } from '@/theme/tokens';

export default function LibraryScreen() {
  const router = useRouter();
  const { meditations, toggleDownload, deleteMeditation, resetDraft } = useAppState();
  const items = meditations.filter((item) => item.status === 'ready');

  return (
    <Screen>
      <SectionHeader
        title="Library"
        subtitle="Your personalized meditations, ready whenever you need them."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No meditations yet"
          body="Begin a check-in to create your first personalized session."
          actionLabel="Begin Check-In"
          onAction={() => {
            resetDraft();
            router.push('/check-in/name');
          }}
        />
      ) : (
        items.map((meditation) => (
          <View key={meditation.id} style={styles.item}>
            <Pressable
              onPress={() => router.push(`/player/${meditation.id}`)}
              style={styles.main}>
              <Text variant="bodyStrong" color={colors.forest}>
                {meditation.title}
              </Text>
              <Text variant="caption" color={colors.charcoalMuted} style={styles.meta}>
                {formatLongDate(meditation.createdAt)} ·{' '}
                {formatDurationMinutes(
                  meditation.actualDurationSeconds || meditation.targetDurationSeconds,
                )}{' '}
                · {meditation.intention}
              </Text>
              <Text variant="caption" color={colors.sage}>
                {meditation.downloaded ? 'Downloaded' : 'Stream ready'}
              </Text>
            </Pressable>

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={
                  meditation.downloaded ? 'Remove download' : 'Download'
                }
                onPress={() => toggleDownload(meditation.id)}
                style={styles.iconButton}>
                <Ionicons
                  name={meditation.downloaded ? 'cloud-done' : 'cloud-download-outline'}
                  size={20}
                  color={colors.forest}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete meditation"
                onPress={() =>
                  Alert.alert(
                    'Delete meditation?',
                    'This removes it from your library in this mock experience.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteMeditation(meditation.id),
                      },
                    ],
                  )
                }
                style={styles.iconButton}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mistStrong,
  },
  main: {
    flex: 1,
  },
  meta: {
    marginTop: 4,
    marginBottom: 6,
  },
  actions: {
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mistStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
