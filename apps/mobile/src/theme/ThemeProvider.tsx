import React, { createContext, useContext } from "react";

export interface ThemeColors {
  primary: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gold: string;
  cream: string;
}

export interface ThemeTokens {
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

export interface ThemeContextValue {
  colors: ThemeColors;
  tokens: ThemeTokens;
}

const defaultTheme: ThemeContextValue = {
  colors: {
    primary: "#1B1F4A",
    surface: "#FFFFFF",
    surfaceSecondary: "#FAF5E8",
    border: "#EAE3CC",
    textPrimary: "#1E1A0F",
    textSecondary: "#3A3510",
    textMuted: "#71717A",
    gold: "#F5C842",
    cream: "#F0EAD9",
  },
  tokens: {
    radius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
  },
};

const ThemeContext = createContext<ThemeContextValue>(defaultTheme);

export function ThemeProvider({
  children,
  value = defaultTheme,
}: {
  children: React.ReactNode;
  value?: ThemeContextValue;
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
