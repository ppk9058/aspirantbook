import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "pass";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const { colors, tokens } = useTheme();

  // Minimum 44px touch target enforced by design rules
  const sizeMap: Record<ButtonSize, { height: number; px: number; py: number; fontSize: number }> = {
    sm: { height: 44, px: tokens.spacing.md, py: tokens.spacing.xs, fontSize: tokens.typography.xs.fontSize },
    md: { height: 48, px: tokens.spacing.lg, py: tokens.spacing.sm, fontSize: tokens.typography.sm.fontSize },
    lg: { height: 54, px: tokens.spacing.xl, py: tokens.spacing.md, fontSize: tokens.typography.base.fontSize },
  };

  const currentSize = sizeMap[size];

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: colors.primary,
            borderWidth: 0,
          },
          text: {
            color: "#FFFFFF",
            fontWeight: tokens.typography.fontWeights.bold,
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: {
            color: colors.textPrimary,
            fontWeight: tokens.typography.fontWeights.semibold,
          },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: colors.primary,
          },
          text: {
            color: colors.primary,
            fontWeight: tokens.typography.fontWeights.bold,
          },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: colors.textPrimary,
            fontWeight: tokens.typography.fontWeights.semibold,
          },
        };
      case "danger":
        return {
          container: {
            backgroundColor: colors.danger,
            borderWidth: 0,
          },
          text: {
            color: "#FFFFFF",
            fontWeight: tokens.typography.fontWeights.bold,
          },
        };
      case "pass":
        return {
          container: {
            backgroundColor: colors.passUpgradeBg,
            borderWidth: 0,
          },
          text: {
            color: "#FFFFFF",
            fontWeight: tokens.typography.fontWeights.bold,
          },
        };
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        {
          minHeight: currentSize.height,
          paddingHorizontal: currentSize.px,
          borderRadius: tokens.radius.xl,
          opacity: disabled ? 0.5 : 1,
        },
        variantStyle.container,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.text.color || "#FFFFFF"}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text
            style={[
              styles.textBase,
              { fontSize: currentSize.fontSize },
              variantStyle.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textBase: {
    textAlign: "center",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
