import { MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'System', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'System', fontWeight: '600' as const },
  headlineLarge: { fontFamily: 'System', fontWeight: '700' as const },
  headlineMedium: { fontFamily: 'System', fontWeight: '600' as const },
  headlineSmall: { fontFamily: 'System', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'System', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'System', fontWeight: '500' as const },
  titleSmall: { fontFamily: 'System', fontWeight: '500' as const },
  bodyLarge: { fontFamily: 'System', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'System', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'System', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'System', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'System', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'System', fontWeight: '500' as const },
};

export const colors = {
  background: '#0B1120',
  surface: '#131D33',
  surfaceVariant: '#1A2744',
  card: '#1E2D4A',
  cardElevated: '#243352',
  border: '#2A3A5C',
  borderLight: '#344768',

  primary: '#14B8A6',
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',

  correct: '#22C55E',
  correctBg: 'rgba(34, 197, 94, 0.12)',
  incorrect: '#EF4444',
  incorrectBg: 'rgba(239, 68, 68, 0.12)',

  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  tierLayperson: '#14B8A6',
  tierEmt: '#F97316',
  tierNurse: '#3B82F6',
  tierPharmacist: '#A855F7',
  tierPhysician: '#EF4444',

  gold: '#FBBF24',
  silver: '#9CA3AF',
  bronze: '#D97706',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const theme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.primaryDark,
    onPrimaryContainer: colors.primaryLight,
    secondary: colors.textSecondary,
    onSecondary: '#FFFFFF',
    background: colors.background,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.surfaceVariant,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.borderLight,
    error: colors.incorrect,
    onError: '#FFFFFF',
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceVariant,
      level3: colors.card,
      level4: colors.cardElevated,
      level5: colors.cardElevated,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};
