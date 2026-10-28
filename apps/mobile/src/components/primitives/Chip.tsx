import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  badge?: string | number;
  style?: ViewStyle;
  testID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  badge,
  style,
  testID,
}: ChipProps) {
  const { colors, tokens } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          borderRadius: tokens.radius.full,
          backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          {
            color: selected ? "#FFFFFF" : colors.textPrimary,
            fontWeight: selected
              ? tokens.typography.fontWeights.bold
              : tokens.typography.fontWeights.medium,
          },
        ]}
      >
        {label}
      </Text>
      {badge !== undefined && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: selected ? "rgba(255,255,255,0.25)" : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: selected ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 38,
    marginRight: 8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
