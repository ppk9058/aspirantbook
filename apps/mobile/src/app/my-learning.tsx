import React from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, BookOpen, ChevronRight, PlayCircle, Clock } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { MyLearningDto, MyLearningItemDto } from "@aspirantbook/shared";

export default function MyLearningScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();

  const myLearningQuery = useQuery({
    queryKey: ["my-learning"],
    queryFn: async () => {
      const res = await api.getMyLearning();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load learning progress");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const isLoading = isAuthenticated && myLearningQuery.isLoading;
  const isError = isAuthenticated && myLearningQuery.isError;
  const data: MyLearningDto | undefined = myLearningQuery.data;
  const items: MyLearningItemDto[] = data?.enrolledCourses || [];

  return (
    <AppShell testID="my-learning-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(myLearningQuery.isRefetching)}
            onRefresh={() => myLearningQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            My Batches & Enrollment
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Active courses, syllabus progress & video lesson bookmarks
          </Text>
        </View>

        {!isAuthenticated ? (
          <EmptyState
            title="Sign In to Access Enrolled Courses"
            description="Sign in to continue your enrolled batches, watch video lessons, and track progress."
            actionTitle="Sign In"
            onAction={() => router.push("/(auth)/login" as any)}
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={120} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={myLearningQuery.error?.message || "Failed to load enrollments"}
            onRetry={() => myLearningQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No Enrollments Found"
            description="You are not enrolled in any courses or batches yet. Explore published courses to get started."
            actionTitle="Browse Courses"
            onAction={() => router.push("/(tabs)/courses" as any)}
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const progressPct = Math.min(100, Math.max(0, item.progressPercent || 0));
              return (
                <Card
                  key={item.courseId}
                  onPress={() => {
                    if (item.lastLessonId) {
                      router.push(`/courses/${item.courseId}/lesson/${item.lastLessonId}` as any);
                    } else {
                      router.push(`/courses/${item.courseId}` as any);
                    }
                  }}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Badge
                      label={progressPct === 100 ? "COMPLETED" : "IN PROGRESS"}
                      variant={progressPct === 100 ? "success" : "primary"}
                      size="sm"
                    />
                    <Text style={[styles.lessonCount, { color: colors.textMuted }]}>
                      {item.completedLessons}/{item.totalLessons} Lessons
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View
                      style={[
                        styles.progressBarBg,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: progressPct === 100 ? colors.success : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                      {progressPct}% Completed
                    </Text>
                  </View>

                  {/* Action Link */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerLeft}>
                      <PlayCircle size={16} color={colors.primary} />
                      <Text style={[styles.continueText, { color: colors.primary }]}>
                        {progressPct === 100 ? "Review Course" : "Continue Lesson"}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </Card>
              );
            })}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  loadingContainer: {
    gap: 12,
  },
  list: {
    gap: 14,
  },
  card: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lessonCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  continueText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
