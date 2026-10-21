import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, CheckCircle2, ChevronRight, Award, Sparkles } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Chip } from "../../../src/components/primitives/Chip";
import { Badge } from "../../../src/components/primitives/Badge";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { EmptyState } from "../../../src/components/primitives/EmptyState";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { useGoal } from "../../context/GoalContext";
import { api } from "../../lib/api";

type TestsPill = "explore" | "my-tests" | "pyq" | "ca";

export default function TestsTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const [activePill, setActivePill] = useState<TestsPill>("explore");

  // 1. Tests Series List Query
  const testsQuery = useQuery({
    queryKey: ["tests-list", selectedGoal.id],
    queryFn: async () => {
      const res = await api.getTests();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load tests");
      return res.data?.items || [];
    },
  });

  // 2. PYQ Query
  const pyqQuery = useQuery({
    queryKey: ["tests-pyq"],
    queryFn: async () => {
      const res = await api.getPyqExams();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQs");
      return res.data || [];
    },
  });

  // 3. Current Affairs Query
  const caQuery = useQuery({
    queryKey: ["tests-ca"],
    queryFn: async () => {
      const res = await api.getCurrentAffairs();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load Current Affairs");
      return res.data || [];
    },
  });

  const isLoading =
    activePill === "explore"
      ? testsQuery.isLoading
      : activePill === "pyq"
      ? pyqQuery.isLoading
      : activePill === "ca"
      ? caQuery.isLoading
      : false;

  const isError =
    activePill === "explore"
      ? testsQuery.isError
      : activePill === "pyq"
      ? pyqQuery.isError
      : activePill === "ca"
      ? caQuery.isError
      : false;

  const errorMessage =
    activePill === "explore"
      ? testsQuery.error?.message
      : activePill === "pyq"
      ? pyqQuery.error?.message
      : caQuery.error?.message;

  const handleRefresh = () => {
    if (activePill === "explore") testsQuery.refetch();
    else if (activePill === "pyq") pyqQuery.refetch();
    else if (activePill === "ca") caQuery.refetch();
  };

  return (
    <AppShell testID="tests-tab-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(testsQuery.isRefetching || pyqQuery.isRefetching || caQuery.isRefetching)}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Goal Banner */}
        <TouchableOpacity
          onPress={openGoalModal}
          activeOpacity={0.85}
          style={[
            styles.goalBanner,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: tokens.radius.xl,
            },
          ]}
        >
          <View style={styles.goalBannerLeft}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={[styles.goalBannerText, { color: colors.textPrimary }]}>
              Targeting: <Text style={{ fontWeight: "800", color: colors.primary }}>{selectedGoal.name}</Text>
            </Text>
          </View>
          <Text style={[styles.switchGoalText, { color: colors.primary }]}>Switch →</Text>
        </TouchableOpacity>

        {/* Section Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Test Series & Practice
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            All India Mock Tests, Previous Year Papers & Quizzes
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.pillRow}>
          <Chip
            label="Explore Mocks"
            selected={activePill === "explore"}
            onPress={() => setActivePill("explore")}
          />
          <Chip
            label="My Tests"
            selected={activePill === "my-tests"}
            onPress={() => router.push("/my-tests" as any)}
          />
          <Chip
            label="PYQs"
            selected={activePill === "pyq"}
            onPress={() => setActivePill("pyq")}
          />
          <Chip
            label="Quizzes"
            selected={activePill === "ca"}
            onPress={() => setActivePill("ca")}
          />
        </View>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={90} borderRadius={12} />
            <Skeleton height={90} borderRadius={12} />
            <Skeleton height={90} borderRadius={12} />
          </View>
        )}

        {/* Error state */}
        {isError && (
          <ErrorState
            message={errorMessage || "Failed to load tests. Please check connection."}
            onRetry={handleRefresh}
          />
        )}

        {/* Content: Explore Mocks */}
        {!isLoading && !isError && activePill === "explore" && (
          <View style={styles.cardsList}>
            {(testsQuery.data || []).length === 0 ? (
              <EmptyState
                title="No Tests Available"
                description={`There are currently no mock tests listed for ${selectedGoal.name}.`}
                actionTitle="Switch Target Goal"
                onAction={openGoalModal}
              />
            ) : (
              (testsQuery.data || []).map((test) => (
                <Card
                  key={test.id}
                  onPress={() => router.push(`/tests/${test.id}` as any)}
                  style={styles.testCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge
                      label={test.isFree ? "FREE MOCK" : "PRO"}
                      variant={test.isFree ? "success" : "pass"}
                      size="sm"
                    />
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
              ))
            )}
          </View>
        )}

        {/* Content: PYQs */}
        {!isLoading && !isError && activePill === "pyq" && (
          <View style={styles.cardsList}>
            {(pyqQuery.data || []).length === 0 ? (
              <EmptyState
                title="No PYQ Papers Found"
                description="Previous year papers will appear here."
              />
            ) : (
              (pyqQuery.data || []).map((exam: any) => (
                <Card
                  key={exam.id || exam.title}
                  onPress={() => router.push("/pyqs" as any)}
                  style={styles.testCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge label="PYQ" variant="neutral" size="sm" />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {exam.year || "Archive"}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {exam.title || exam.name}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      Full paper PDF & CBT Practice
                    </Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Content: Current Affairs & Quizzes */}
        {!isLoading && !isError && activePill === "ca" && (
          <View style={styles.cardsList}>
            {(caQuery.data || []).length === 0 ? (
              <EmptyState
                title="No Quizzes Found"
                description="Daily quizzes and monthly digests will appear here."
              />
            ) : (
              (caQuery.data || []).map((ca: any) => (
                <Card
                  key={ca.id || ca.title}
                  onPress={() => router.push("/current-affairs" as any)}
                  style={styles.testCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge label="DAILY QUIZ" variant="success" size="sm" />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {ca.category || "Current Affairs"}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {ca.title}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {ca.description || "Practice 10 Daily MCQs"}
                    </Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </Card>
              ))
            )}
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
  goalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  goalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalBannerText: {
    fontSize: 13,
    marginLeft: 6,
  },
  switchGoalText: {
    fontSize: 12,
    fontWeight: "700",
  },
  titleRow: {
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
  pillRow: {
    flexDirection: "row",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  loadingContainer: {
    gap: 12,
  },
  cardsList: {
    gap: 12,
  },
  testCard: {
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
