import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { LIGHT_THEME, DARK_THEME, ThemeColors, TOKENS } from "./tokens";
import { Storage } from "../lib/storage";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  tokens: typeof TOKENS;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  initialTheme = "light",
  skipStorage = false,
}: {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  skipStorage?: boolean;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [isLoaded, setIsLoaded] = useState(skipStorage);

  useEffect(() => {
    if (skipStorage) return;
    let active = true;
    void Storage.getTheme().then((saved) => {
      if (!active) return;
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
      }
      if (active) setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    void Storage.setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme = prev === "light" ? "dark" : "light";
      void Storage.setTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const isDark = theme === "dark";
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark,
      colors,
      tokens: TOKENS,
      toggleTheme,
      setTheme,
      isLoaded,
    }),
    [theme, isDark, colors, toggleTheme, setTheme, isLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside ThemeProvider
    return {
      theme: "light",
      isDark: false,
      colors: LIGHT_THEME,
      tokens: TOKENS,
      toggleTheme: () => {},
      setTheme: () => {},
      isLoaded: true,
    };
  }
  return context;
}
