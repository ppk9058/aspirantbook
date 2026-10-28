import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/lib/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "danger" | "outline";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: "sm" | "md" | "lg";
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = "md",
}: ButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS === "ios" || Platform.OS === "android") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getBackgroundColor = () => {
    if (disabled) return "#94A3B8";
    switch (variant) {
      case "primary":
        return COLORS.primary;
      case "accent":
        return COLORS.accent;
      case "danger":
        return "#EF4444";
      case "secondary":
        return "#0B2545";
      case "outline":
        return "transparent";
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (variant === "outline") return COLORS.primary;
    return "#FFFFFF";
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        size === "sm" && styles.sm,
        size === "lg" && styles.lg,
        { backgroundColor: getBackgroundColor() },
        variant === "outline" && styles.outline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sm: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  lg: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});
