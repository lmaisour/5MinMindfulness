import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { MOCK_INSIGHTS } from '@/data/mock';
import { colors, radii, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const insights = MOCK_INSIGHTS;
  const maxEnergy = Math.max(...insights.averageEnergyByDay.map((d) => d.value), 1);
  const moodEntries = Object.entries(insights.moodCounts).sort((a, b) => b[1] - a[1]);
  const intentionEntries = Object.entries(insights.intentionCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <Screen>
      <SectionHeader
        title="Insights"
        subtitle="A gentle reflection on your practice — not a clinical assessment."
      />

      <Text variant="label" color={colors.forestSoft} style={styles.sectionLabel}>
        Your Practice
      </Text>
      <View style={styles.statsRow}>
        <Stat label="Sessions" value={String(insights.totalMeditations)} />
        <Stat label="Minutes" value={String(insights.totalMinutesListened)} />
        <Stat label="This week" value={String(insights.sessionsThisWeek)} />
      </View>

      <Text variant="label" color={colors.forestSoft} style={styles.sectionLabel}>
        Mood Check-Ins
      </Text>
      <View style={styles.panel}>
        {moodEntries.map(([mood, count]) => (
          <View key={mood} style={styles.moodRow}>
            <Text variant="body" color={colors.charcoal}>
              {mood}
            </Text>
            <Text variant="bodyStrong" color={colors.forest}>
              {count}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="label" color={colors.forestSoft} style={styles.sectionLabel}>
        Energy Trends
      </Text>
      <View style={styles.panel}>
        <View style={styles.bars}>
          {insights.averageEnergyByDay.map((day) => (
            <View key={day.label} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${(day.value / maxEnergy) * 100}%` },
                  ]}
                />
              </View>
              <Text variant="caption" color={colors.charcoalMuted}>
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text variant="label" color={colors.forestSoft} style={styles.sectionLabel}>
        Most Common Intentions
      </Text>
      <View style={styles.panel}>
        {intentionEntries.map(([intention, count]) => (
          <View key={intention} style={styles.moodRow}>
            <Text variant="body" color={colors.charcoal}>
              {intention}
            </Text>
            <Text variant="bodyStrong" color={colors.forest}>
              {count}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title" color={colors.forest}>
        {value}
      </Text>
      <Text variant="caption" color={colors.charcoalMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.mistStrong,
  },
  panel: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.mistStrong,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mist,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    backgroundColor: colors.sand,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.sage,
    borderRadius: radii.sm,
  },
});
