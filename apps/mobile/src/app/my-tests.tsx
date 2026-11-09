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
import {
  Clock,
  Play,
  RotateCcw,
  Award,
  Layers,
  ChevronRight,
  BarChart2,
  CheckCircle2,
} from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Chip } from "../components/primitives/Chip";
import { Badge } from "../components/primitives/Badge";
import { Button } from "../components/primitives/Button";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { MyTestsDto } from "@aspirantbook/shared";

type MyTestsTab = "inProgress" | "enrolled" | "completed";

export default function MyTestsScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<MyTestsTab>("inProgress");

  const myTestsQuery = useQuery({
    queryKey: ["my-tests-hub"],
    queryFn: async () => {
      const res = await api.getMyTests();
      if (!res.ok) throw new Error(res.error?.message || "Failed to fetch my tests");
      return res.data!;
    },
    enabled: isAuthenticated,
  });

  const { data, isLoading, isError, error, refetch, isRefetching } = myTestsQuery;

  const inProgress = data?.inProgress || [];
  const enrolledSeries = data?.enrolledSeries || [];
  const recentAttempts = data?.recentAttempts || [];

  return (
    <AppShell testID="my-tests-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            My Tests
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Resume in-progress exams, track enrolled packages, and review past results
          </Text>
        </View>

        {!isAuthenticated ? (
          <EmptyState
            title="Sign In to Access Tests"
            description="Sign in to continue in-progress mock exams and access your enrolled test packages."
            actionTitle="Sign In"
            onAction={() => router.push("/(auth)/login" as any)}
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={100} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={error?.message || "Could not load test history"}
            onRetry={refetch}
          />
        ) : (
          <>
            {/* Filter Tabs */}
            <View style={styles.tabRow}>
              <Chip
                label={`In Progress (${inProgress.length})`}
                selected={activeTab === "inProgress"}
                onPress={() => setActiveTab("inProgress")}
              />
              <Chip
                label={`Enrolled (${enrolledSeries.length})`}
                selected={activeTab === "enrolled"}
                onPress={() => setActiveTab("enrolled")}
              />
              <Chip
                label={`Completed (${recentAttempts.length})`}
                selected={activeTab === "completed"}
                onPress={() => setActiveTab("completed")}
              />
            </View>

            {/* Tab Content: In Progress */}
            {activeTab === "inProgress" && (
              <View style={styles.list}>
                {inProgress.length === 0 ? (
                  <EmptyState
                    title="No In-Progress Exams"
                    description="You don't have any ongoing mock attempts right now."
                    actionTitle="Explore Test Series"
                    onAction={() => router.push("/(tabs)/tests" as any)}
                  />
                ) : (
                  inProgress.map((item) => (
                    <Card key={item.attemptId} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Badge label="IN PROGRESS" variant="warning" size="sm" />
                        <View style={styles.timeTag}>
                          <Clock size={12} color={colors.warning} />
                          <Text style={[styles.timeText, { color: colors.warning }]}>
                            {Math.ceil(item.timeRemainingSecs / 60)}m left
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {item.testTitle}
                      </Text>
                      <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                        {item.seriesTitle}
                      </Text>

                      <View style={styles.cardFooter}>
                        <Button
                          title="Resume Test"
                          variant="primary"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: "/tests/[id]/runner",
                              params: { id: item.testId, attemptId: item.attemptId },
                            })
                          }
                        />
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* Tab Content: Enrolled Packages */}
            {activeTab === "enrolled" && (
              <View style={styles.list}>
                {enrolledSeries.length === 0 ? (
                  <EmptyState
                    title="No Enrolled Series"
                    description="You are not currently enrolled in any test packages."
                    actionTitle="Browse Test Catalog"
                    onAction={() => router.push("/(tabs)/tests" as any)}
                  />
                ) : (
                  enrolledSeries.map((s) => (
                    <Card
                      key={s.seriesId}
                      style={styles.card}
                      onPress={() => router.push(`/tests/series/${s.seriesId}` as any)}
                    >
                      <View style={styles.cardHeader}>
                        <Badge label="ENROLLED" variant="success" size="sm" />
                        <Badge label={s.category} variant="neutral" size="sm" />
                      </View>

                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {s.title}
                      </Text>

                      <View style={styles.progressRow}>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                          Progress: {s.completedTests} of {s.totalTests} tests completed
                        </Text>
                        <ChevronRight size={16} color={colors.primary} />
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* Tab Content: Completed Tests */}
            {activeTab === "completed" && (
              <View style={styles.list}>
                {recentAttempts.length === 0 ? (
                  <EmptyState
                    title="No Completed Tests"
                    description="Your scored mock tests and reports will be archived here."
                    actionTitle="Take a Test"
                    onAction={() => router.push("/(tabs)/tests" as any)}
                  />
                ) : (
                  recentAttempts.map((att) => (
                    <Card key={att.attemptId} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Badge label="SUBMITTED" variant="neutral" size="sm" />
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                          {new Date(att.submittedAt).toLocaleDateString()}
                        </Text>
                      </View>

                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {att.testTitle}
                      </Text>
                      {att.seriesTitle ? (
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                          {att.seriesTitle}
                        </Text>
                      ) : null}

                      <View style={styles.scoreRow}>
                        <Text style={[styles.scoreHighlight, { color: colors.primary }]}>
                          Score: {att.score ?? 0} / {att.totalMarks}
                        </Text>
                        <Text style={[styles.metaPill, { color: colors.textSecondary }]}>
                          {att.accuracyPercentage}% Accuracy
                        </Text>
                        {att.rank ? (
                          <Text style={[styles.metaPill, { color: colors.warning }]}>
                            Rank #{att.rank}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.buttonGroup}>
                        <Button
                          title="Score Report"
                          variant="secondary"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: "/tests/[id]/result",
                              params: { id: att.testId, attemptId: att.attemptId },
                            })
                          }
                        />
                        <Button
                          title="Solutions"
                          variant="ghost"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: "/tests/[id]/solutions",
                              params: { id: att.testId, attemptId: att.attemptId },
                            })
                          }
                        />
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </>
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
  card: {
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
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  scoreHighlight: {
    fontSize: 14,
    fontWeight: "800",
  },
  metaPill: {
    fontSize: 12,
    fontWeight: "600",
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
