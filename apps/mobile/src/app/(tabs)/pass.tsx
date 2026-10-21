import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Zap, CheckCircle2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Badge } from "../../../src/components/primitives/Badge";
import { Button } from "../../../src/components/primitives/Button";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { buildWebUrl } from "../../lib/web-links";

const PASS_BENEFITS = [
  "Unlimited Access to 500+ All India Mock Tests & Test Series",
  "Previous Year Papers with detailed step-by-step solutions",
  "Complete Video Course catalogue and chapter notes",
  "Detailed performance analytics and sectional score breakdowns",
  "All India Rank (AIR) and comparative percentiles",
  "Ad-free uninterrupted learning experience",
];

export default function PassTabScreen() {
  const { colors, tokens } = useTheme();
  const { user, hasActivePass } = useAuth();

  const handleOpenPricing = async () => {
    try {
      // Reader model web checkout with utm_source=mobile_app
      await WebBrowser.openBrowserAsync(
        buildWebUrl("/pricing", "pass_tab")
      );
    } catch {}
  };

  return (
    <AppShell testID="pass-tab-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Pass Hero Card */}
        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            {
              backgroundColor: hasActivePass
                ? colors.surface
                : colors.passUpgradeBg,
              borderColor: hasActivePass ? colors.passActiveBorder : "transparent",
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroIconBadge}>
              <Zap
                size={24}
                color={hasActivePass ? colors.passActiveText : "#FFFFFF"}
                fill={hasActivePass ? colors.passActiveText : "#FFFFFF"}
              />
            </View>
            <Badge
              label={hasActivePass ? "ACTIVE (PRO ACCESS)" : "PRO PASS"}
              variant={hasActivePass ? "pass" : "success"}
              size="md"
            />
          </View>

          <Text
            style={[
              styles.heroTitle,
              { color: hasActivePass ? colors.textPrimary : "#FFFFFF" },
            ]}
          >
            {hasActivePass
              ? "Your Pass is Active!"
              : "Upgrade to Aspirantbook Pass"}
          </Text>

          <Text
            style={[
              styles.heroDesc,
              {
                color: hasActivePass
                  ? colors.textSecondary
                  : "rgba(255,255,255,0.85)",
              },
            ]}
          >
            {hasActivePass
              ? "You have complete unlocked access across all mock tests, video lessons, and digital eBooks."
              : "One single pass unlocking full test series, PYQs, video lessons, and interactive tutorials."}
          </Text>

          {!hasActivePass && (
            <View style={styles.actionRow}>
              <Button
                title="Get Pass on website"
                onPress={handleOpenPricing}
                variant="secondary"
                size="md"
                iconRight={<ExternalLink size={16} color={colors.textPrimary} />}
                testID="pass-get-btn"
              />
            </View>
          )}
        </Card>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Included in Pass
          </Text>

          <Card style={styles.benefitsCard}>
            {PASS_BENEFITS.map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <CheckCircle2
                  size={18}
                  color={colors.success}
                  style={styles.checkIcon}
                />
                <Text
                  style={[
                    styles.benefitText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {benefit}
                </Text>
              </View>
            ))}
          </Card>
        </View>

        {/* Reader Model Explainer Note */}
        <View
          style={[
            styles.readerNote,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: tokens.radius.xl,
            },
          ]}
        >
          <ShieldCheck size={20} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            In accordance with digital app policies, subscription orders are
            securely processed on the website. All purchases instantly activate on
            your mobile account.
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
  heroCard: {
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRow: {
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  benefitsCard: {
    padding: 16,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
  },
  checkIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  readerNote: {
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
