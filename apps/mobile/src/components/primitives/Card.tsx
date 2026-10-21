import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "outlined";
  testID?: string;
}

export function Card({
  children,
  onPress,
  style,
  variant = "default",
  testID,
}: CardProps) {
  const { colors, tokens, isDark } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: isDark ? colors.border : "transparent",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 3,
        };
      case "outlined":
        return {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case "default":
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 4,
          elevation: 1,
        };
    }
  };

  const baseStyle: ViewStyle = {
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...getVariantStyle(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[baseStyle, style]}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[baseStyle, style]} testID={testID}>
      {children}
    </View>
  );
}
