import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { formatReminderTime, reminderTimeFromDate, type ReminderTime } from '@/services/reminderPlan';
import { colors } from '@/theme/tokens';

interface Props {
  time: ReminderTime;
  onChange: (time: ReminderTime) => Promise<void> | void;
  disabled?: boolean;
}

export function ReminderTimePicker({ time, onChange, disabled }: Props) {
  const [draft, setDraft] = useState(time);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const onChangeRef = useRef(onChange);
  draftRef.current = draft;
  onChangeRef.current = onChange;

  useEffect(() => {
    setDraft(time);
  }, [time.hour, time.minute]);

  useEffect(() => {
    return () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      void onChangeRef.current(draftRef.current);
    };
  }, []);

  if (Platform.OS === 'web') {
    return (
      <Text variant="body" color={colors.charcoalMuted}>
        {formatReminderTime(draft)}
      </Text>
    );
  }

  const value = new Date(2026, 0, 1, draft.hour, draft.minute, 0, 0);

  return (
    <View style={styles.picker}>
      <DateTimePicker
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        value={value}
        disabled={disabled}
        themeVariant="light"
        textColor={colors.forest}
        onChange={(event, selected) => {
          if (disabled || event.type === 'dismissed' || !selected) return;
          const next = reminderTimeFromDate(selected);
          setDraft(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            timer.current = null;
            void onChange(next);
          }, 400);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 4,
  },
});
