import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ChevronRight, CheckCircle2, Clock } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Badge } from "../../../src/components/primitives/Badge";
import { Chip } from "../../../src/components/primitives/Chip";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { EmptyState } from "../../../src/components/primitives/EmptyState";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";

export default function CurrentAffairsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"daily" | "monthly">("daily");

  const caQuery = useQuery({
    queryKey: ["current-affairs-list"],
    queryFn: async () => {
      const res = await api.getCurrentAffairs();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load Current Affairs");
      return res.data || [];
    },
  });

  const isLoading = caQuery.isLoading;
  const isError = caQuery.isError;
  const items = caQuery.data || [];

  return (
    <AppShell testID="current-affairs-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(caQuery.isRefetching)}
            onRefresh={() => caQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Current Affairs & Quizzes
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Daily news analysis, practice MCQs and monthly PDF roundups
          </Text>
        </View>

        <View style={styles.chipRow}>
          <Chip
            label="Daily Quizzes"
            selected={tab === "daily"}
            onPress={() => setTab("daily")}
          />
          <Chip
            label="Monthly PDFs"
            selected={tab === "monthly"}
            onPress={() => setTab("monthly")}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={100} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={caQuery.error?.message || "Failed to load Current Affairs"}
            onRetry={() => caQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No Quizzes Today"
            description="Daily current affairs quizzes will appear here as they are published."
          />
        ) : (
          <View style={styles.list}>
            {items.map((item: any) => (
              <Card
                key={item.id || item.title}
                onPress={() => router.push(`/(tabs)/tests` as any)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Badge label={item.category || "DAILY QUIZ"} variant="success" size="sm" />
                  <View style={styles.timeTag}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      10 mins
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {item.description || "10 Questions • Detailed Explanations"}
                  </Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </Card>
            ))}
          </View>
        )}
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
  chipRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  loadingContainer: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
