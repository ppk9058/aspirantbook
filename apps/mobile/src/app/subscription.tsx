import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { CreditCard, ExternalLink, ShieldCheck, Zap } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Button } from "../components/primitives/Button";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionScreen() {
  const { colors, tokens } = useTheme();
  const { user, hasActivePass } = useAuth();

  const handleOpenPricing = async () => {
    try {
      await WebBrowser.openBrowserAsync(
        "https://trillionskill.com/pricing?utm_source=mobile_app"
      );
    } catch {}
  };

  return (
    <AppShell testID="subscription-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Subscription & Payments
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your Aspirantbook Pass access and payment history
          </Text>
        </View>

        {/* Current Plan Card */}
        <Card
          variant="elevated"
          style={[
            styles.planCard,
            {
              backgroundColor: hasActivePass ? colors.surface : colors.passUpgradeBg,
              borderColor: hasActivePass ? colors.passActiveBorder : "transparent",
            },
          ]}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIcon}>
              <Zap
                size={22}
                color={hasActivePass ? colors.passActiveText : "#FFFFFF"}
                fill={hasActivePass ? colors.passActiveText : "#FFFFFF"}
              />
            </View>
            <Badge
              label={hasActivePass ? "ACTIVE PASS" : "FREE TIER"}
              variant={hasActivePass ? "pass" : "neutral"}
              size="md"
            />
          </View>

          <Text
            style={[
              styles.planTitle,
              { color: hasActivePass ? colors.textPrimary : "#FFFFFF" },
            ]}
          >
            {hasActivePass ? "Aspirantbook Pass (Pro Access)" : "Free Learner Tier"}
          </Text>

          <Text
            style={[
              styles.planDesc,
              {
                color: hasActivePass
                  ? colors.textSecondary
                  : "rgba(255,255,255,0.85)",
              },
            ]}
          >
            {hasActivePass
              ? "Your subscription is currently active with complete access to all test series, PYQs, and video lessons."
              : "Upgrade with Pass to unlock 500+ mock tests, previous year papers, and comprehensive courses."}
          </Text>

          <View style={styles.planAction}>
            <Button
              title={hasActivePass ? "Manage on website" : "Upgrade on website"}
              onPress={handleOpenPricing}
              variant={hasActivePass ? "primary" : "secondary"}
              size="md"
              iconRight={<ExternalLink size={16} color={hasActivePass ? "#FFFFFF" : colors.textPrimary} />}
              testID="sub-action-btn"
            />
          </View>
        </Card>

        {/* Reader Model Compliance */}
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: tokens.radius.xl,
            },
          ]}
        >
          <ShieldCheck size={20} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Subscriptions and purchases are processed via our secure web checkout.
            All active benefits sync automatically to your mobile app.
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  planCard: {
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  planDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  planAction: {
    marginTop: 4,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 10,
  },
});
