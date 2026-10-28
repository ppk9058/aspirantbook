import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { AlertCircle, WifiOff, RefreshCw } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { classifyError } from "../../lib/error-classifier";
import { API_BASE_URL } from "../../lib/api";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isNetworkError?: boolean;
  style?: ViewStyle;
  testID?: string;
  baseUrl?: string;
}

export function sanitizeErrorMessage(rawMessage?: string, baseUrl?: string): { displayTitle: string; displayMessage: string; isNetwork: boolean } {
  const classified = classifyError(rawMessage, baseUrl || API_BASE_URL);
  return {
    displayTitle: classified.displayTitle,
    displayMessage: classified.displayMessage,
    isNetwork: classified.isNetwork,
  };
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  isNetworkError: explicitNetworkError = false,
  style,
  testID,
  baseUrl,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const classified = classifyError(message, baseUrl || API_BASE_URL);
  const isNetwork = explicitNetworkError || classified.isNetwork;
  const resolvedTitle = isNetwork
    ? (title === "Something went wrong" ? "Connection Unavailable" : title)
    : title;
  const resolvedMessage = classified.displayMessage;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isNetwork
              ? colors.surfaceSecondary
              : "rgba(239, 68, 68, 0.1)",
            borderColor: isNetwork ? colors.border : "rgba(239, 68, 68, 0.25)",
          },
        ]}
      >
        {isNetwork ? (
          <WifiOff size={32} color={colors.textSecondary} />
        ) : (
          <AlertCircle size={32} color={colors.danger} />
        )}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {resolvedTitle}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {resolvedMessage}
      </Text>
      {onRetry ? (
        <View style={styles.actionContainer}>
          <Button
            title="Try Again"
            onPress={onRetry}
            size="sm"
            variant="outline"
            icon={<RefreshCw size={16} color={colors.primary} />}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  actionContainer: {
    marginTop: 8,
  },
});
