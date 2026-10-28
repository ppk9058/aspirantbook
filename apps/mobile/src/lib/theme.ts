/**
 * Backward compatibility bridge for apps/mobile/src/lib/theme.ts
 * Integrates with canonical tokens from src/theme/tokens.ts and src/theme/ThemeProvider.tsx
 */

import { COLOR_PALETTE, LIGHT_THEME, DARK_THEME } from "../theme/tokens";
import { useTheme as useThemeNew, ThemeMode as ThemeModeNew } from "../theme/ThemeProvider";

export const COLORS = {
  // Brand
  primary: COLOR_PALETTE.teal[500],
  primaryHover: COLOR_PALETTE.teal[600],
  accent: COLOR_PALETTE.emerald[500],
  accentHover: COLOR_PALETTE.emerald[600],

  // Light Theme
  light: {
    background: LIGHT_THEME.background as string,
    card: LIGHT_THEME.surface as string,
    border: LIGHT_THEME.border as string,
    textPrimary: LIGHT_THEME.textPrimary as string,
    textSecondary: LIGHT_THEME.textSecondary as string,
    textMuted: LIGHT_THEME.textMuted as string,
    danger: LIGHT_THEME.danger as string,
    warning: LIGHT_THEME.warning as string,
    success: LIGHT_THEME.success as string,
  },

  // Dark Theme
  dark: {
    background: DARK_THEME.background as string,
    card: DARK_THEME.surface as string,
    border: DARK_THEME.border as string,
    textPrimary: DARK_THEME.textPrimary as string,
    textSecondary: DARK_THEME.textSecondary as string,
    textMuted: DARK_THEME.textMuted as string,
    danger: DARK_THEME.danger as string,
    warning: DARK_THEME.warning as string,
    success: DARK_THEME.success as string,
  },
};

export type ThemeMode = ThemeModeNew;

export function useTheme() {
  const current = useThemeNew();
  return {
    ...current,
    theme: {
      colors: {
        primary: current.colors.primary,
        background: current.colors.background,
        card: current.colors.surface,
        border: current.colors.border,
        text: current.colors.textPrimary,
        textMuted: current.colors.textMuted,
        danger: current.colors.danger,
        success: current.colors.success,
      },
    },
  };
}
