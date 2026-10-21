import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, Globe } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { Screen } from "./Screen";

export interface WebOnlyScreenProps {
  title: string;
  explanation: string;
  webPath?: string;
  style?: ViewStyle;
  testID?: string;
}

const BASE_WEB_URL = "https://aspirantbook.com";

export function WebOnlyScreen({
  title,
  explanation,
  webPath = "",
  style,
  testID,
}: WebOnlyScreenProps) {
  const { colors, tokens } = useTheme();

  const handleOpenWebsite = async () => {
    const path = webPath.startsWith("/") ? webPath : `/${webPath}`;
    const separator = path.includes("?") ? "&" : "?";
    const fullUrl = `${BASE_WEB_URL}${path}${separator}utm_source=mobile_app`;
    try {
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch {
      // Browser launch fallback
    }
  };

  return (
    <Screen safeTop safeBottom style={style} testID={testID}>
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Globe size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>

        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
          {explanation}
        </Text>

        <View style={styles.buttonWrapper}>
          <Button
            title="Open on website"
            onPress={handleOpenWebsite}
            variant="primary"
            size="md"
            iconRight={<ExternalLink size={16} color="#FFFFFF" />}
            testID={`${testID || "web-only"}-btn`}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  explanation: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 24,
  },
  buttonWrapper: {
    width: "100%",
    maxWidth: 240,
  },
});
