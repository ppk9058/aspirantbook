import React, { useState } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { ExternalLink, Globe } from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { Screen } from "./Screen";
import { openWebUrl } from "../../lib/web-links";

export interface WebOnlyScreenProps {
  title: string;
  explanation: string;
  webPath?: string;
  style?: ViewStyle;
  testID?: string;
}

export function WebOnlyScreen({
  title,
  explanation,
  webPath = "",
  style,
  testID,
}: WebOnlyScreenProps) {
  const { colors, tokens } = useTheme();
  const [browserError, setBrowserError] = useState<string | null>(null);

  const handleOpenWebsite = async () => {
    setBrowserError(null);
    const res = await openWebUrl(webPath || "/", "web_only_screen");
    if (!res.success && res.error) {
      setBrowserError(res.error);
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
          <Globe size={40} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontWeight: tokens.typography.fontWeights.semibold,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.explanation,
            {
              color: colors.textSecondary,
              fontWeight: tokens.typography.fontWeights.normal,
            },
          ]}
        >
          {explanation}
        </Text>

        <Button
          title="Open on Website"
          variant="primary"
          size="lg"
          iconRight={<ExternalLink size={18} color="#FFFFFF" />}
          style={styles.actionButton}
          onPress={handleOpenWebsite}
        />

        {browserError && (
          <Text style={{ color: colors.danger, marginTop: 12, textAlign: "center", fontSize: 13 }}>
            {browserError}
          </Text>
        )}
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  explanation: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
  },
  actionButton: {
    minWidth: 200,
  },
});
