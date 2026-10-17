import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/providers/AuthProvider';
import { formatDurationMinutes, formatLongDate } from '@/utils/format';
import { colors, radii, spacing } from '@/theme/tokens';

export default function LibraryScreen() {
  const router = useRouter();
  const auth = useAuth();
  const {
    meditations,
    loadingLibrary,
    toggleDownload,
    deleteMeditation,
    resetDraft,
  } = useAppState();

  return (
    <Screen>
      <SectionHeader
        title="Library"
        subtitle="Your personalized meditations, ready whenever you need them."
      />

      {!auth.configured ? (
        <EmptyState
          title="Connect Supabase"
          body="Configure environment variables to load your personal library."
        />
      ) : loadingLibrary ? (
        <Text variant="body" color={colors.charcoalMuted}>
          Loading your library…
        </Text>
      ) : meditations.length === 0 ? (
        <EmptyState
          title="No meditations yet"
          body="Your check-ins are saved. Audio meditations will appear here after narration is produced."
          actionLabel="Begin Check-In"
          onAction={() => {
            resetDraft();
            router.push('/check-in/name');
          }}
        />
      ) : (
        meditations.map((meditation) => (
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
                    'This permanently removes it from your account.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => void deleteMeditation(meditation.id),
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
