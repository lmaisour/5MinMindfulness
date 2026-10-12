import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  edges = ['top', 'left', 'right'],
}: Props) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        padded && styles.padded,
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, padded && styles.padded, contentStyle, { flex: 1 }]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[colors.ivory, colors.ivoryDeep, colors.sand]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={edges}>
        {body}
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
  },
  content: {
    flexGrow: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
