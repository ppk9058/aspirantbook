import React from "react";
import { Text as RNText, TextStyle, StyleSheet, TextProps as RNTextProps } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySm"
  | "caption"
  | "label"
  | "brand";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  weight?: "400" | "500" | "600" | "700" | "800" | "900";
  style?: TextStyle;
  children: React.ReactNode;
}

export function Text({
  variant = "body",
  color,
  weight,
  style,
  children,
  ...props
}: TextProps) {
  const { colors, tokens } = useTheme();

  const variantStyles: Record<TextVariant, TextStyle> = {
    h1: {
      fontSize: tokens.typography["2xl"].fontSize,
      lineHeight: tokens.typography["2xl"].lineHeight,
      fontWeight: tokens.typography.fontWeights.extrabold,
      color: colors.textPrimary,
    },
    h2: {
      fontSize: tokens.typography.xl.fontSize,
      lineHeight: tokens.typography.xl.lineHeight,
      fontWeight: tokens.typography.fontWeights.bold,
      color: colors.textPrimary,
    },
    h3: {
      fontSize: tokens.typography.lg.fontSize,
      lineHeight: tokens.typography.lg.lineHeight,
      fontWeight: tokens.typography.fontWeights.bold,
      color: colors.textPrimary,
    },
    body: {
      fontSize: tokens.typography.base.fontSize,
      lineHeight: tokens.typography.base.lineHeight,
      fontWeight: tokens.typography.fontWeights.normal,
      color: colors.textPrimary,
    },
    bodySm: {
      fontSize: tokens.typography.sm.fontSize,
      lineHeight: tokens.typography.sm.lineHeight,
      fontWeight: tokens.typography.fontWeights.normal,
      color: colors.textSecondary,
    },
    caption: {
      fontSize: tokens.typography.xs.fontSize,
      lineHeight: tokens.typography.xs.lineHeight,
      fontWeight: tokens.typography.fontWeights.medium,
      color: colors.textMuted,
    },
    label: {
      fontSize: tokens.typography.xs.fontSize,
      lineHeight: tokens.typography.xs.lineHeight,
      fontWeight: tokens.typography.fontWeights.bold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
    brand: {
      fontSize: tokens.typography.base.fontSize,
      lineHeight: tokens.typography.base.lineHeight,
      fontWeight: tokens.typography.fontWeights.extrabold,
      letterSpacing: -0.5,
      color: colors.brandTextPrimary,
    },
  };

  const computedStyle: TextStyle = {
    ...variantStyles[variant],
    ...(color ? { color } : {}),
    ...(weight ? { fontWeight: weight } : {}),
    ...style,
  };

  return (
    <RNText style={computedStyle} {...props}>
      {children}
    </RNText>
  );
}
