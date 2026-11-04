import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  Clock,
  PlayCircle,
  Award,
  Sparkles,
  FileText,
  Compass,
  Calendar,
  Layers,
  Crown,
  ChevronRight,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { Skeleton } from "../../components/primitives/Skeleton";
import { useTheme } from "../../theme/ThemeProvider";
import { useGoal } from "../../context/GoalContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { DashboardSummaryDto } from "@aspirantbook/shared";

type DashboardTestSummary = DashboardSummaryDto["upcomingOrRecentTests"][number];

const EMPTY_TESTS: DashboardTestSummary[] = [];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const { isAuthenticated } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["home-dashboard", selectedGoal.id],
    queryFn: async () => {
      const res = await api.getHome();
      return res.ok ? res.data : null;
    },
  });

  const quickActions = useMemo(
    () => [
      {
        title: "Test Series",
        subtitle: "Exam Simulation",
        icon: Award,
        route: "/(tabs)/tests",
        color: colors.primary,
      },
      {
        title: "Courses",
        subtitle: "Video Classes",
        icon: PlayCircle,
        route: "/(tabs)/courses",
        color: "#10b981",
      },
      {
        title: "PYQ Papers",
        subtitle: "Previous Years",
        icon: FileText,
        route: "/pyqs",
        color: "#8b5cf6",
      },
      {
        title: "Current Affairs",
        subtitle: "Daily & Monthly",
        icon: Calendar,
        route: "/current-affairs",
        color: "#f59e0b",
      },
      {
        title: "Career Tracks",
        subtitle: "Guided Paths",
        icon: Compass,
        route: "/career-tracks",
        color: "#06b6d4",
      },
      {
        title: "Pass / Pro",
        subtitle: "Unlimited Access",
        icon: Crown,
        route: "/subscription",
        color: "#ec4899",
      },
    ],
    [colors.primary]
  );

  const recentTests = data?.upcomingOrRecentTests;
  const listData = !isLoading && recentTests && recentTests.length > 0 ? recentTests : EMPTY_TESTS;

  const renderItem = ({ item: t }: { item: DashboardTestSummary }) => (
    <Card
      onPress={() => router.push(`/tests/${t.id}` as any)}
      style={styles.testCard}
    >
      <View style={styles.testCardTop}>
        <Badge label={t.seriesTitle} variant="neutral" size="sm" />
        <View style={styles.durationRow}>
          <Clock size={13} color={colors.textMuted} />
          <Text style={[styles.durationText, { color: colors.textMuted }]}>
            {t.durationMinutes} mins
          </Text>
        </View>
      </View>
      <Text style={[styles.testTitle, { color: colors.textPrimary }]}>
        {t.title}
      </Text>
      <View style={[styles.testFooter, { borderTopColor: colors.border }]}>
        {t.score !== null && t.score !== undefined ? (
          <Text style={[styles.scoreText, { color: colors.success }]}>
            Latest Score: {t.score}
          </Text>
        ) : (
          <Text style={[styles.readyText, { color: colors.textMuted }]}>
            Ready to simulate
          </Text>
        )}
        <View style={styles.takeTestLink}>
          <Text style={[styles.takeTestText, { color: colors.primary }]}>
            Start Test
          </Text>
          <ChevronRight size={14} color={colors.primary} />
        </View>
      </View>
    </Card>
  );

  const renderEmpty = () =>
    isLoading ? null : (
      <Card style={styles.emptyCard}>
        <Award size={32} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No recent attempts
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Explore test series to attempt simulated CBT exams.
        </Text>
      </Card>
    );

  return (
    <AppShell testID="home-screen">
      <FlatList
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty()}
        ListHeaderComponent={
          <>
            {/* Goal Selector Pill */}
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
                  Goal: <Text style={{ fontWeight: "800", color: colors.primary }}>{selectedGoal.name}</Text>
                </Text>
              </View>
              <Text style={[styles.switchGoalText, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>

            {/* Greeting Banner */}
            <View style={styles.topHeader}>
              <View>
                <Text style={[styles.greeting, { color: colors.textPrimary }]}>Daily Prep Hub</Text>
                <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
                  Master syllabus for {selectedGoal.name}
                </Text>
              </View>
              {isAuthenticated && Boolean(data?.streakDays) && (data?.streakDays || 0) > 0 ? (
                <View
                  testID="home-streak-badge"
                  style={[
                    styles.streakBadge,
                    {
                      backgroundColor: "rgba(234, 88, 12, 0.1)",
                      borderColor: "rgba(234, 88, 12, 0.3)",
                    },
                  ]}
                >
                  <Flame size={16} color="#EA580C" />
                  <Text style={styles.streakText}>
                    {data?.streakDays} Day Streak
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Quick Access 3x2 Grid */}
            <View style={styles.gridContainer}>
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => router.push(action.route as any)}
                    style={[
                      styles.gridTile,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: tokens.radius.lg,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.tileIconCircle,
                        { backgroundColor: `${action.color}15` },
                      ]}
                    >
                      <Icon size={20} color={action.color} />
                    </View>
                    <Text style={[styles.tileTitle, { color: colors.textPrimary }]}>
                      {action.title}
                    </Text>
                    <Text style={[styles.tileSub, { color: colors.textMuted }]}>
                      {action.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Skeleton height={120} borderRadius={16} />
                <Skeleton height={120} borderRadius={16} />
              </View>
            ) : (
              <>
                {/* Continue Learning Card */}
                {data?.continueLearning && (
                  <Card
                    onPress={() =>
                      router.push(
                        `/tutorials/${data.continueLearning!.tutorialSlug}/${data.continueLearning!.lessonId}` as any
                      )
                    }
                    style={[
                      styles.continueCard,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Badge label="CONTINUE LEARNING" variant="primary" size="sm" />
                      <PlayCircle size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.continueTutorialTitle, { color: colors.textSecondary }]}>
                      {data.continueLearning.tutorialTitle}
                    </Text>
                    <Text style={[styles.continueLessonTitle, { color: colors.textPrimary }]}>
                      {data.continueLearning.lessonTitle}
                    </Text>
                    <View style={styles.resumeRow}>
                      <Text style={[styles.resumeText, { color: colors.primary }]}>
                        Resume Lesson
                      </Text>
                      <ChevronRight size={16} color={colors.primary} />
                    </View>
                  </Card>
                )}

                {/* Daily Quiz Banner */}
                {data?.todayQuiz && (
                  <Card
                    onPress={() => router.push("/current-affairs" as any)}
                    style={[
                      styles.dailyQuizCard,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.warning,
                      },
                    ]}
                  >
                    <View style={styles.quizHeader}>
                      <Sparkles size={16} color={colors.warning} />
                      <Badge label="TODAY'S SPEED QUIZ" variant="warning" size="sm" />
                    </View>
                    <Text style={[styles.quizTitle, { color: colors.textPrimary }]}>
                      {data.todayQuiz.title}
                    </Text>
                    <Text style={[styles.quizMeta, { color: colors.textSecondary }]}>
                      {data.todayQuiz.questionCount} Questions • Current Affairs & GK
                    </Text>
                  </Card>
                )}

                {/* Mock Examinations Section */}
                <View style={styles.sectionHeadingRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Mock Examinations
                  </Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/tests" as any)}>
                    <Text style={[styles.seeAllText, { color: colors.primary }]}>See all →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        }
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  goalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  goalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalBannerText: {
    fontSize: 13,
  },
  switchGoalText: {
    fontSize: 13,
    fontWeight: "700",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  gridTile: {
    width: "48%",
    borderWidth: 1,
    padding: 12,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 11,
  },
  loadingContainer: {
    gap: 12,
  },
  continueCard: {
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  continueTutorialTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  continueLessonTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  resumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resumeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dailyQuizCard: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  quizMeta: {
    fontSize: 12,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  testCard: {
    padding: 14,
    marginBottom: 12,
  },
  testCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  testFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
  },
  readyText: {
    fontSize: 12,
  },
  takeTestLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  takeTestText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
});
