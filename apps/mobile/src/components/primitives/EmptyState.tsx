import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Inbox } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionTitle,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  const { colors, tokens } = useTheme();

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {icon || <Inbox size={32} color={colors.textMuted} />}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <View style={styles.actionContainer}>
          <Button
            title={actionTitle}
            onPress={onAction}
            size="sm"
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: 16,
  },
});
