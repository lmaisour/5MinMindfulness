/**
 * Nura design tokens — warm, organic, editorial wellness.
 * Prefer spacing + typography over decoration.
 */
export const colors = {
  ivory: '#F8F6F1',
  ivoryDeep: '#F1EDE4',
  sage: '#A8B9A3',
  sageMuted: '#C5D1C1',
  forest: '#263D35',
  forestSoft: '#3A564B',
  lavender: '#C9C4DA',
  sand: '#E9DFD0',
  sandDeep: '#DCCFBA',
  charcoal: '#333333',
  charcoalMuted: '#5C5C5C',
  mist: 'rgba(38, 61, 53, 0.06)',
  mistStrong: 'rgba(38, 61, 53, 0.12)',
  white: '#FFFFFF',
  danger: '#8B4A3B',
  overlay: 'rgba(38, 61, 53, 0.45)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  brand: {
    fontFamily: 'Literata_600SemiBold',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  display: {
    fontFamily: 'Literata_500Medium',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'Literata_500Medium',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  button: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
} as const;

export const shadows = {
  soft: {
    shadowColor: '#263D35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
} as const;

export const motion = {
  quick: 180,
  standard: 280,
  slow: 480,
  breatheIn: 4200,
  breatheOut: 5200,
} as const;
