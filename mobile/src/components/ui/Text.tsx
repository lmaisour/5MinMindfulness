import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'body',
  color = colors.charcoal,
  align,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      style={[typography[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
