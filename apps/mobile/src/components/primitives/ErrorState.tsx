import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { AlertCircle, WifiOff, RefreshCw } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isNetworkError?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const NETWORK_ERROR_REGEX = /fetch failed|ConnectException|java\.net|Network request failed|NetworkError|timeout|ECONNREFUSED|ECONNRESET/i;

export function sanitizeErrorMessage(rawMessage?: string): { displayTitle: string; displayMessage: string; isNetwork: boolean } {
  const msg = rawMessage || "Failed to complete request. Please try again.";
  const isNetwork = NETWORK_ERROR_REGEX.test(msg);

  if (isNetwork) {
    const userMsg = "Could not reach the server. Check your connection and try again.";
    const isDev = typeof __DEV__ !== "undefined" && Boolean(__DEV__);
    const displayMsg = isDev ? `${userMsg} (${msg})` : userMsg;
    return {
      displayTitle: "Connection Unavailable",
      displayMessage: displayMsg,
      isNetwork: true,
    };
  }

  // Also sanitize any accidental leakage of backend/network exception strings in non-dev mode
  const isDev = typeof __DEV__ !== "undefined" && Boolean(__DEV__);
  if (!isDev && /java\.net|ConnectException|fetch failed/i.test(msg)) {
    return {
      displayTitle: "Connection Unavailable",
      displayMessage: "Could not reach the server. Check your connection and try again.",
      isNetwork: true,
    };
  }

  return {
    displayTitle: "Something went wrong",
    displayMessage: msg,
    isNetwork: false,
  };
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  isNetworkError: explicitNetworkError = false,
  style,
  testID,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const sanitized = sanitizeErrorMessage(message);
  const isNetwork = explicitNetworkError || sanitized.isNetwork;
  const resolvedTitle = isNetwork ? (title === "Something went wrong" ? "Connection Unavailable" : title) : title;
  const resolvedMessage = sanitized.displayMessage;

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
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: 16,
  },
});
