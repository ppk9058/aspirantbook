import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock, PlayCircle, Award, Sparkles } from "lucide-react-native";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { AppShell } from "@/components/shell/AppShell";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function HomeScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["home-dashboard"],
    queryFn: async () => {
      const res = await api.getHome();
      return res.ok ? res.data : null;
    },
  });

  return (
    <AppShell testID="home-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greeting}>Daily Learning</Text>
            <Text style={styles.subGreeting}>Welcome back to AspirantBook</Text>
          </View>
          <View style={styles.streakBadge}>
            <Flame size={16} color="#EA580C" />
            <Text style={styles.streakText}>
              {data?.streakDays || 1} Day Streak
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton height={120} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton height={200} borderRadius={16} />
          </View>
        ) : (
          <>
            {/* Continue Learning Card */}
            {data?.continueLearning && (
              <Card style={styles.continueCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sectionBadge}>CONTINUE LEARNING</Text>
                  <PlayCircle size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.continueTutorialTitle}>
                  {data.continueLearning.tutorialTitle}
                </Text>
                <Text style={styles.continueLessonTitle}>
                  {data.continueLearning.lessonTitle}
                </Text>
                <TouchableOpacity
                  style={styles.resumeBtn}
                  onPress={() =>
                    router.push(
                      `/tutorials/${data.continueLearning!.tutorialSlug}/${data.continueLearning!.lessonId}`
                    )
                  }
                >
                  <Text style={styles.resumeBtnText}>Resume Lesson</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* Daily Quiz Banner */}
            {data?.todayQuiz && (
              <Card style={styles.dailyQuizCard}>
                <View style={styles.quizHeader}>
                  <Sparkles size={18} color="#D97706" />
                  <Text style={styles.quizBadge}>TODAY'S QUIZ</Text>
                </View>
                <Text style={styles.quizTitle}>{data.todayQuiz.title}</Text>
                <Text style={styles.quizMeta}>
                  {data.todayQuiz.questionCount} Questions • Daily Current Affairs
                </Text>
                <TouchableOpacity
                  style={styles.quizBtn}
                  onPress={() => router.push("/(tabs)/practice")}
                >
                  <Text style={styles.quizBtnText}>Start Quick Quiz</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* Upcoming & Recent Mock Tests */}
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Mock Examinations</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/practice")}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {data?.upcomingOrRecentTests && data.upcomingOrRecentTests.length > 0 ? (
              data.upcomingOrRecentTests.map((t) => (
                <Card key={t.id} style={styles.testCard}>
                  <View style={styles.testCardTop}>
                    <Text style={styles.testSeriesTag}>{t.seriesTitle}</Text>
                    <View style={styles.durationRow}>
                      <Clock size={13} color="#64748B" />
                      <Text style={styles.durationText}>{t.durationMinutes} mins</Text>
                    </View>
                  </View>
                  <Text style={styles.testTitle}>{t.title}</Text>
                  <View style={styles.testFooter}>
                    {t.score !== null && t.score !== undefined ? (
                      <Text style={styles.scoreText}>Latest Score: {t.score}</Text>
                    ) : (
                      <Text style={styles.readyText}>Ready to take</Text>
                    )}
                    <TouchableOpacity
                      style={styles.startTestBtn}
                      onPress={() => router.push(`/tests/${t.id}`)}
                    >
                      <Text style={styles.startTestBtnText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Award size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No recent attempts</Text>
                <Text style={styles.emptySubtitle}>
                  Choose a test from the Practice tab to begin preparing.
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    padding: 18,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  subGreeting: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
    marginLeft: 4,
  },
  loadingContainer: {
    marginTop: 10,
  },
  continueCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  continueTutorialTitle: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    marginBottom: 2,
  },
  continueLessonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  resumeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  resumeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dailyQuizCard: {
    backgroundColor: "#FEFCE8",
    borderColor: "#FEF08A",
    marginBottom: 20,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  quizBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    marginLeft: 5,
  },
  quizTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  quizMeta: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  quizBtn: {
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  quizBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
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
    fontWeight: "700",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  testCard: {
    marginBottom: 12,
  },
  testCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  testSeriesTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 4,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  testFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
  },
  readyText: {
    fontSize: 12,
    color: "#64748B",
  },
  startTestBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  startTestBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
});
