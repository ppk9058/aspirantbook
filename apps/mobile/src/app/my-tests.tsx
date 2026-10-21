import React from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, PlayCircle, Clock, ChevronRight } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function MyTestsScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();

  const attemptsQuery = useQuery({
    queryKey: ["my-tests-attempts"],
    queryFn: async () => {
      const res = await api.getTests();
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch tests");
      return res.data?.items || [];
    },
    enabled: isAuthenticated,
  });

  const isLoading = isAuthenticated && attemptsQuery.isLoading;
  const isError = isAuthenticated && attemptsQuery.isError;
  const tests = attemptsQuery.data || [];

  return (
    <AppShell testID="my-tests-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(attemptsQuery.isRefetching)}
            onRefresh={() => attemptsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            My Tests & Attempts
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Active test attempts, in-progress mocks and test series
          </Text>
        </View>

        {!isAuthenticated ? (
          <EmptyState
            title="Sign In to View My Tests"
            description="Track your test attempts, continue in-progress exams, and review your solutions."
            actionTitle="Sign In"
            onAction={() => router.push("/(auth)/login" as any)}
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={90} borderRadius={12} />
            <Skeleton height={90} borderRadius={12} />
            <Skeleton height={90} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={attemptsQuery.error?.message || "Failed to load tests"}
            onRetry={() => attemptsQuery.refetch()}
          />
        ) : tests.length === 0 ? (
          <EmptyState
            title="No Active Tests"
            description="You haven't started any mock tests yet. Explore tests to start your preparation."
            actionTitle="Explore Mock Tests"
            onAction={() => router.push("/(tabs)/tests" as any)}
          />
        ) : (
          <View style={styles.list}>
            {tests.map((test) => (
              <Card
                key={test.id}
                onPress={() => router.push(`/tests/${test.id}` as any)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Badge label="ENROLLED" variant="primary" size="sm" />
                  <View style={styles.timeTag}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {test.durationMinutes} mins
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {test.title}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {test.totalQuestions} Questions • {test.totalMarks} Marks
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
