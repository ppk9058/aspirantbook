import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  Newspaper,
  ChevronRight,
  Clock,
  Calendar,
  FileText,
  Download,
  BookOpen,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Badge } from "../../../src/components/primitives/Badge";
import { Chip } from "../../../src/components/primitives/Chip";
import { Button } from "../../../src/components/primitives/Button";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { EmptyState } from "../../../src/components/primitives/EmptyState";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { CurrentAffairsItemDto } from "@aspirantbook/shared";

type ModeTab = "quizzes" | "monthlyPdfs";

export default function CurrentAffairsScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [activeTab, setActiveTab] = useState<ModeTab>("quizzes");

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

  const handleRefresh = () => {
    caQuery.refetch();
  };

  const handleOpenPdf = async (item: CurrentAffairsItemDto) => {
    const url = `https://trillionskill.com/current-affairs/${item.slug}?utm_source=mobile_app`;
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <AppShell testID="current-affairs-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(caQuery.isRefetching)}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Current Affairs & Quizzes
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Daily news analysis, practice MCQs and monthly PDF compilation digests
          </Text>
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.tabRow}>
          <Chip
            label="Daily Speed Quizzes"
            selected={activeTab === "quizzes"}
            onPress={() => setActiveTab("quizzes")}
          />
          <Chip
            label="Monthly PDF Magazines"
            selected={activeTab === "monthlyPdfs"}
            onPress={() => setActiveTab("monthlyPdfs")}
          />
        </View>

        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={110} borderRadius={12} />
            <Skeleton height={110} borderRadius={12} />
            <Skeleton height={110} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={caQuery.error?.message || "Failed to load Current Affairs"}
            onRetry={handleRefresh}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No Current Affairs Listed"
            description="Daily and monthly digests will appear here once published."
          />
        ) : activeTab === "quizzes" ? (
          /* Daily Quizzes Tab */
          <View style={styles.list}>
            {items.map((item: CurrentAffairsItemDto) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <Badge label="DAILY SPEED QUIZ" variant="primary" size="sm" />
                  <View style={styles.timeTag}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      15 mins • 15 MCQs
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.footerMeta, { color: colors.textMuted }]}>
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </Text>
                  <Button
                    title="Attempt Quiz"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push(`/tests/${item.id}` as any)}
                  />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          /* Monthly PDF Magazines Tab */
          <View style={styles.list}>
            {items.map((item: CurrentAffairsItemDto) => (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.cardHeader}>
                  <Badge label={`MONTHLY ${item.year}`} variant="neutral" size="sm" />
                  <View style={styles.timeTag}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      Month {item.month}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Button
                    title="Read Online"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleOpenPdf(item)}
                  />
                  <Button
                    title="View Document"
                    variant="primary"
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: "/pyqs/pdf-view",
                        params: { paperId: item.id, title: item.title },
                      })
                    }
                  />
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  loadingContainer: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerMeta: {
    fontSize: 12,
  },
});
