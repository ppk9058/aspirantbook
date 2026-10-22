import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PlayCircle,
  Lock,
  CheckCircle,
  ExternalLink,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { Skeleton } from "../../components/primitives/Skeleton";
import { ErrorState } from "../../components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { openWebUrl } from "../../lib/web-links";
import { CourseDetailDto, CourseChapterDto } from "@aspirantbook/shared";

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ["course-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing course id");
      const res = await api.getCourseDetail(id);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load course details");
      return res.data;
    },
    enabled: Boolean(id),
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing course id");
      const res = await api.enrollFreeCourse(id);
      if (!res.ok) throw new Error(res.error?.message || "Enrollment failed");
      return res.data;
    },
    onSuccess: () => {
      setActionMessage(null);
      queryClient.invalidateQueries({ queryKey: ["course-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-learning"] });
    },
    onError: (err: any) => {
      setActionMessage(err.message || "Failed to enroll in free course");
    },
  });

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: prev[chapterId] === false ? true : false, // default open
    }));
  };

  const handleOpenWebsite = async (slug: string) => {
    setEnrollError(null);
    // CourseDetail must use WebBrowser.openBrowserAsync for web-only checkout (Reader model) with utm_source=mobile_app
    const res = await openWebUrl(`/courses/${slug}`, "course_enroll");
    if (!res.success && res.error) {
      setEnrollError(res.error);
    }
  };

  const data: CourseDetailDto | undefined = courseQuery.data;
  const course = data?.course;
  const chapters = data?.chapters || [];
  const isEnrolled = Boolean(data?.isEnrolled || course?.isEnrolled);

  // Find first playable lesson
  const allLessons = chapters.flatMap((c) => c.lessons);
  const firstPlayableLesson = allLessons.find((l) => !l.isLocked) || allLessons[0];

  return (
    <AppShell testID="course-detail-screen">
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {course?.title || "Course Details"}
        </Text>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(courseQuery.isRefetching)}
            onRefresh={() => courseQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {courseQuery.isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={24} width="70%" />
            <Skeleton height={60} borderRadius={8} />
            <Skeleton height={48} borderRadius={10} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        )}

        {courseQuery.isError && (
          <ErrorState
            message={courseQuery.error?.message || "Failed to load course details."}
            onRetry={() => courseQuery.refetch()}
          />
        )}

        {Boolean(course) && (
          <>
            {actionMessage ? (
              <View style={styles.actionBanner}>
                <AlertCircle size={16} color="#d97706" />
                <Text style={styles.actionBannerText}>{actionMessage}</Text>
                <TouchableOpacity onPress={() => setActionMessage(null)}>
                  <Text style={styles.actionBannerDismiss}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Hero Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: tokens.radius.xl,
                },
              ]}
            >
              <View style={styles.badgeRow}>
                <Badge
                  label={course!.difficulty || "BEGINNER"}
                  variant={course!.difficulty === "ADVANCED" ? "danger" : "primary"}
                  size="sm"
                />
                {isEnrolled ? (
                  <Badge label="ENROLLED" variant="success" size="sm" />
                ) : course!.isFree ? (
                  <Badge label="FREE COURSE" variant="pass" size="sm" />
                ) : (
                  <Badge label={`₹${course!.price}`} variant="neutral" size="sm" />
                )}
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {course!.title}
              </Text>

              {Boolean(course!.description) && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {course!.description}
                </Text>
              )}

              {/* Stats Row */}
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <View style={styles.statItem}>
                  <PlayCircle size={16} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {course!.lessonsCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Lessons</Text>
                </View>

                <View style={styles.statItem}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {course!.duration ? `${course!.duration}m` : "Self-paced"}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
                </View>

                <View style={styles.statItem}>
                  <Award size={16} color={colors.primary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {course!.chaptersCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Chapters</Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.actionContainer}>
              {isEnrolled ? (
                <Button
                  title="Continue Learning"
                  variant="primary"
                  size="lg"
                  style={{ width: "100%" }}
                  onPress={() => {
                    if (firstPlayableLesson) {
                      router.push(`/courses/${course!.id}/lesson/${firstPlayableLesson.id}` as any);
                    }
                  }}
                />
              ) : course!.isFree ? (
                <Button
                  title={enrollMutation.isPending ? "Enrolling..." : "Enroll Now (Free)"}
                  variant="primary"
                  size="lg"
                  style={{ width: "100%" }}
                  loading={enrollMutation.isPending}
                  onPress={() => {
                    if (!isAuthenticated) {
                      router.push("/(auth)/login" as any);
                    } else {
                      enrollMutation.mutate();
                    }
                  }}
                />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleOpenWebsite(course!.slug)}
                  style={[
                    styles.webButton,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: tokens.radius.lg,
                    },
                  ]}
                >
                  <Text style={styles.webButtonText}>Enroll on Website (₹{course!.price})</Text>
                  <ExternalLink size={18} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              )}
              {enrollError && (
                <Text style={{ color: colors.danger, marginTop: 8, textAlign: "center", fontSize: 13 }}>
                  {enrollError}
                </Text>
              )}
            </View>

            {/* Curriculum Section */}
            <View style={styles.curriculumSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Course Curriculum
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                {chapters.length} chapters • {allLessons.length} lessons
              </Text>

              <View style={styles.chaptersList}>
                {chapters.map((chapter: CourseChapterDto, idx: number) => {
                  const isExpanded = expandedChapters[chapter.id] !== false; // default true
                  return (
                    <View
                      key={chapter.id}
                      style={[
                        styles.chapterCard,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                          borderRadius: tokens.radius.lg,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleChapter(chapter.id)}
                        style={styles.chapterHeader}
                      >
                        <View style={styles.chapterTitleWrap}>
                          <Text style={[styles.chapterOrder, { color: colors.primary }]}>
                            Chapter {idx + 1}
                          </Text>
                          <Text style={[styles.chapterTitle, { color: colors.textPrimary }]}>
                            {chapter.title}
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.textMuted} />
                        ) : (
                          <ChevronDown size={20} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.lessonsList, { borderTopColor: colors.border }]}>
                          {chapter.lessons.map((lesson) => {
                            const canPlay = !lesson.isLocked;
                            return (
                              <TouchableOpacity
                                key={lesson.id}
                                activeOpacity={canPlay ? 0.7 : 1}
                                onPress={() => {
                                  if (canPlay) {
                                    router.push(`/courses/${course!.id}/lesson/${lesson.id}` as any);
                                  } else {
                                    setActionMessage(
                                      course!.isFree
                                        ? "Enroll in this free course below to unlock all lessons."
                                        : "Enroll in this course on the website to access locked lessons."
                                    );
                                  }
                                }}
                                style={[
                                  styles.lessonRow,
                                  { borderBottomColor: colors.border },
                                ]}
                              >
                                <View style={styles.lessonLeft}>
                                  {lesson.isCompleted ? (
                                    <CheckCircle size={18} color={colors.success} />
                                  ) : canPlay ? (
                                    <PlayCircle size={18} color={colors.primary} />
                                  ) : (
                                    <Lock size={18} color={colors.textMuted} />
                                  )}
                                  <View style={styles.lessonInfo}>
                                    <Text
                                      style={[
                                        styles.lessonTitle,
                                        {
                                          color: canPlay ? colors.textPrimary : colors.textMuted,
                                        },
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {lesson.title}
                                    </Text>
                                    {Boolean(lesson.durationText) && (
                                      <Text style={[styles.lessonDuration, { color: colors.textMuted }]}>
                                        {lesson.durationText}
                                      </Text>
                                    )}
                                  </View>
                                </View>

                                {lesson.isTrial && (
                                  <Badge label="FREE PREVIEW" variant="pass" size="sm" />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    gap: 14,
  },
  heroCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  actionContainer: {
    marginBottom: 20,
  },
  webButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  webButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  curriculumSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  chaptersList: {
    gap: 12,
  },
  chapterCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  chapterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  chapterTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  chapterOrder: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  lessonsList: {
    borderTopWidth: 1,
  },
  lessonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  lessonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  lessonDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  actionBannerText: {
    color: "#92400e",
    fontSize: 13,
    flex: 1,
  },
  actionBannerDismiss: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "700",
  },
});
