import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { CreditCard, ExternalLink, ShieldCheck, Zap } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Button } from "../components/primitives/Button";
import { Skeleton } from "../components/primitives/Skeleton";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { openWebUrl } from "../lib/web-links";

export default function SubscriptionScreen() {
  const { colors, tokens } = useTheme();
  const { user, hasActivePass } = useAuth();

  const purchasesQuery = useQuery({
    queryKey: ["user-purchases"],
    queryFn: async () => {
      const res = await api.getPurchases();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load purchases");
      return res.data;
    },
    enabled: Boolean(user),
  });

  const purchasesData = purchasesQuery.data;
  const historyList = purchasesData?.history || [];
  const daysRemaining = purchasesData?.activeSubscription?.daysRemaining;
  const [browserError, setBrowserError] = useState<string | null>(null);

  const handleOpenPricing = async () => {
    setBrowserError(null);
    // Reader model web checkout with utm_source=mobile_app via WebBrowser.openBrowserAsync
    const res = await openWebUrl("/pricing", "subscription_screen");
    if (!res.success && res.error) {
      setBrowserError(res.error);
    }
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
            Manage your AspirantBook Pass access and payment history
          </Text>
          {browserError && (
            <Text style={{ color: colors.danger, marginTop: 8, fontSize: 13 }}>
              {browserError}
            </Text>
          )}
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
            {hasActivePass ? "AspirantBook Pass (Pro Access)" : "Free Learner Tier"}
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
              ? `Your subscription is active with complete access to all test series, PYQs, and video lessons.${
                  daysRemaining !== null && daysRemaining !== undefined
                    ? ` (${daysRemaining} days remaining)`
                    : ""
                }`
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

        {/* Payment & Order History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Payment & Order History
          </Text>

          {!user ? (
            <Card style={styles.infoCard}>
              <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
                Sign in to view your payment history and subscription records.
              </Text>
            </Card>
          ) : purchasesQuery.isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={64} borderRadius={12} />
              <Skeleton height={64} borderRadius={12} />
            </View>
          ) : historyList.length === 0 ? (
            <Card style={styles.infoCard}>
              <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
                No past transactions or payment records found for this account.
              </Text>
            </Card>
          ) : (
            historyList.map((item) => (
              <Card key={item.id} style={styles.purchaseCard}>
                <View style={styles.purchaseTopRow}>
                  <Text style={[styles.purchasePlan, { color: colors.textPrimary }]}>
                    {item.description || "Pass Subscription"}
                  </Text>
                  <Badge
                    label={String(item.status).toUpperCase()}
                    variant={
                      String(item.status).toUpperCase() === "PAID" ||
                      String(item.status).toUpperCase() === "ACTIVE"
                        ? "success"
                        : "neutral"
                    }
                    size="sm"
                  />
                </View>
                <View style={styles.purchaseBottomRow}>
                  <Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={[styles.purchaseAmount, { color: colors.textPrimary }]}>
                    {item.amount > 0 ? `₹${(item.amount / 100).toFixed(0)}` : "Included"}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>

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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  infoCard: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardText: {
    fontSize: 13,
    textAlign: "center",
  },
  purchaseCard: {
    padding: 14,
    marginBottom: 8,
  },
  purchaseTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  purchasePlan: {
    fontSize: 14,
    fontWeight: "700",
  },
  purchaseBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  purchaseDate: {
    fontSize: 12,
  },
  purchaseAmount: {
    fontSize: 14,
    fontWeight: "700",
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
