import React from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronRight, BookOpen } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Badge } from "../../../src/components/primitives/Badge";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { EmptyState } from "../../../src/components/primitives/EmptyState";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";

export default function PyqsScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();

  const pyqQuery = useQuery({
    queryKey: ["pyq-exams-list"],
    queryFn: async () => {
      const res = await api.getPyqExams();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQs");
      return res.data || [];
    },
  });

  const isLoading = pyqQuery.isLoading;
  const isError = pyqQuery.isError;
  const exams = pyqQuery.data || [];

  return (
    <AppShell testID="pyqs-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(pyqQuery.isRefetching)}
            onRefresh={() => pyqQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Previous Year Papers (PYQs)
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Authentic official question papers with solutions & CBT practice
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={100} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={pyqQuery.error?.message || "Failed to load PYQ papers"}
            onRetry={() => pyqQuery.refetch()}
          />
        ) : exams.length === 0 ? (
          <EmptyState
            title="No PYQ Papers Available"
            description="Official previous year papers will appear here once published."
          />
        ) : (
          <View style={styles.list}>
            {exams.map((exam: any) => (
              <Card
                key={exam.id || exam.title}
                onPress={() => router.push(`/(tabs)/tests` as any)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Badge label="OFFICIAL PYQ" variant="neutral" size="sm" />
                  <Text style={[styles.yearText, { color: colors.textMuted }]}>
                    {exam.year || "All Years"}
                  </Text>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {exam.title || exam.name}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <FileText size={14} color={colors.primary} />
                    <Text style={[styles.footerText, { color: colors.primary }]}>
                      Read PDF & Take Mock
                    </Text>
                  </View>
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
  yearText: {
    fontSize: 11,
    fontWeight: "600",
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
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
});
