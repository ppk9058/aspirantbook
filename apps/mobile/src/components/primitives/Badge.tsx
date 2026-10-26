import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type BadgeVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "pass";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
  testID?: string;
}

export function Badge({
  label,
  variant = "primary",
  size = "md",
  style,
  testID,
}: BadgeProps) {
  const { colors, tokens, isDark } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "pass":
        return {
          container: {
            backgroundColor: colors.passActiveBg,
            borderColor: colors.passActiveBorder,
            borderWidth: 1,
          },
          text: {
            color: colors.passActiveText,
            fontWeight: "800",
          },
        };
      case "success":
        return {
          container: {
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#dcfce7",
            borderColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: isDark ? "#34d399" : "#15803d",
            fontWeight: "700",
          },
        };
      case "warning":
        return {
          container: {
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
            borderColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: isDark ? "#fbbf24" : "#b45309",
            fontWeight: "700",
          },
        };
      case "danger":
        return {
          container: {
            backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
            borderColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: isDark ? "#f87171" : "#b91c1c",
            fontWeight: "700",
          },
        };
      case "neutral":
        return {
          container: {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderWidth: 1,
          },
          text: {
            color: colors.textSecondary,
            fontWeight: "600",
          },
        };
      case "primary":
      default:
        return {
          container: {
            backgroundColor: colors.drawerBadgeBg,
            borderColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: colors.drawerBadgeText,
            fontWeight: "700",
          },
        };
    }
  };

  const currentStyles = getVariantStyles();
  const isSm = size === "sm";

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        {
          paddingHorizontal: isSm ? 6 : 8,
          paddingVertical: isSm ? 1 : 3,
          borderRadius: tokens.radius.full,
        },
        currentStyles.container,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: isSm ? 9 : 11,
          },
          currentStyles.text,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    letterSpacing: 0.3,
  },
});
