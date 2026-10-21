import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  List,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { AppShell } from "../../../../components/shell/AppShell";
import { Badge } from "../../../../components/primitives/Badge";
import { Button } from "../../../../components/primitives/Button";
import { BottomSheet } from "../../../../components/primitives/BottomSheet";
import { Skeleton } from "../../../../components/primitives/Skeleton";
import { ErrorState } from "../../../../components/primitives/ErrorState";
import { useTheme } from "../../../../theme/ThemeProvider";
import { api } from "../../../../lib/api";
import { CourseLessonDetailDto, CourseDetailDto } from "@aspirantbook/shared";

export default function CourseLessonPlayerScreen() {
  const router = useRouter();
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const { colors, tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showCurriculumSheet, setShowCurriculumSheet] = useState(false);

  // Lesson Detail Query
  const lessonQuery = useQuery({
    queryKey: ["course-lesson", id, lessonId],
    queryFn: async () => {
      if (!id || !lessonId) throw new Error("Missing parameters");
      const res = await api.getCourseLesson(id, lessonId);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load lesson");
      return res.data;
    },
    enabled: Boolean(id && lessonId),
  });

  // Course Detail Query (for curriculum drawer)
  const courseQuery = useQuery({
    queryKey: ["course-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing course id");
      const res = await api.getCourseDetail(id);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load course");
      return res.data;
    },
    enabled: Boolean(id),
  });

  // Progress Mutation
  const progressMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!id || !lessonId) throw new Error("Missing parameters");
      const res = await api.updateCourseLessonProgress(id, lessonId, { completed });
      if (!res.ok) throw new Error(res.error?.message || "Failed to update progress");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-lesson", id, lessonId] });
      queryClient.invalidateQueries({ queryKey: ["course-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-learning"] });
    },
    onError: (err: any) => {
      Alert.alert("Progress Update", err.message || "Failed to update lesson status");
    },
  });

  const lesson: CourseLessonDetailDto | undefined = lessonQuery.data;
  const courseData: CourseDetailDto | undefined = courseQuery.data;
  const isCompleted = Boolean(lesson?.isCompleted);

  const handlePlayVideo = async () => {
    if (lesson?.videoUrl) {
      try {
        await WebBrowser.openBrowserAsync(lesson.videoUrl);
      } catch {
        Alert.alert("Video Player", "Unable to launch video player.");
      }
    } else {
      Alert.alert("Video Unavailable", "No external video stream configured for this lesson.");
    }
  };

  return (
    <AppShell testID="course-lesson-player-screen">
      {/* 52px Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
            {lesson?.courseTitle || "Course"}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {lesson?.title || "Loading Lesson..."}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowCurriculumSheet(true)}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <List size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sticky Video Player Container at Top (16:9 ratio) */}
      <View style={styles.videoPlayerContainer}>
        {lesson?.isLocked ? (
          <View style={styles.lockedContainer}>
            <Lock size={36} color="#94a3b8" />
            <Text style={styles.lockedTitle}>Lesson Locked</Text>
            <Text style={styles.lockedSub}>Enroll in the full course to view this lesson</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePlayVideo}
            style={styles.videoPlayerTouch}
          >
            <View style={styles.playButtonCircle}>
              <Play size={28} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.playText}>
              {lesson?.videoUrl ? "Tap to Play Video" : "Video Lesson"}
            </Text>
            {Boolean(lesson?.durationText) && (
              <View style={styles.durationBadge}>
                <Clock size={12} color="#ffffff" />
                <Text style={styles.durationText}>{lesson?.durationText}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Body Content */}
      <ScrollView
        style={[styles.scrollArea, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {lessonQuery.isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={28} width="80%" />
            <Skeleton height={20} width="50%" />
            <Skeleton height={44} borderRadius={10} />
            <Skeleton height={120} borderRadius={12} />
          </View>
        )}

        {lessonQuery.isError && (
          <ErrorState
            message={lessonQuery.error?.message || "Failed to load lesson"}
            onRetry={() => lessonQuery.refetch()}
          />
        )}

        {Boolean(lesson) && (
          <>
            {/* Title & Chapter */}
            <View style={styles.lessonMeta}>
              {Boolean(lesson!.chapterTitle) && (
                <Text style={[styles.chapterName, { color: colors.primary }]}>
                  {lesson!.chapterTitle}
                </Text>
              )}
              <Text style={[styles.lessonHeading, { color: colors.textPrimary }]}>
                {lesson!.title}
              </Text>
            </View>

            {/* Completion Button */}
            {!lesson!.isLocked && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => progressMutation.mutate(!isCompleted)}
                style={[
                  styles.completeButton,
                  {
                    backgroundColor: isCompleted
                      ? "rgba(16, 185, 129, 0.12)"
                      : colors.surfaceSecondary,
                    borderColor: isCompleted ? colors.success : colors.border,
                  },
                ]}
              >
                {isCompleted ? (
                  <CheckCircle size={20} color={colors.success} />
                ) : (
                  <Circle size={20} color={colors.textMuted} />
                )}
                <Text
                  style={[
                    styles.completeButtonText,
                    { color: isCompleted ? colors.success : colors.textPrimary },
                  ]}
                >
                  {isCompleted ? "Completed" : "Mark as Complete"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Lesson Text Content / Notes */}
            {Boolean(lesson!.content) && (
              <View
                style={[
                  styles.notesCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: tokens.radius.lg,
                  },
                ]}
              >
                <Text style={[styles.notesHeading, { color: colors.textPrimary }]}>
                  Lesson Notes & Summary
                </Text>
                <Text style={[styles.notesContent, { color: colors.textSecondary }]}>
                  {lesson!.content}
                </Text>
              </View>
            )}

            {/* Navigation Footer: Prev / Next Lesson */}
            <View style={[styles.navFooter, { borderTopColor: colors.border }]}>
              {lesson!.navigation.prevLessonId ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/courses/${id}/lesson/${lesson!.navigation.prevLessonId}` as any
                    )
                  }
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ChevronLeft size={18} color={colors.textPrimary} />
                  <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>
                    Previous
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {lesson!.navigation.nextLessonId ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/courses/${id}/lesson/${lesson!.navigation.nextLessonId}` as any
                    )
                  }
                  style={[
                    styles.navBtn,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.navBtnText, { color: "#ffffff", fontWeight: "700" }]}>
                    Next Lesson
                  </Text>
                  <ChevronRight size={18} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Curriculum Bottom Sheet Drawer */}
      <BottomSheet
        visible={showCurriculumSheet}
        onClose={() => setShowCurriculumSheet(false)}
        title="Course Curriculum"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {courseData?.chapters.map((ch, chIdx) => (
            <View key={ch.id} style={styles.sheetChapter}>
              <Text style={[styles.sheetChapterTitle, { color: colors.primary }]}>
                Chapter {chIdx + 1}: {ch.title}
              </Text>
              {ch.lessons.map((item) => {
                const isCurrent = item.id === lessonId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (!item.isLocked) {
                        setShowCurriculumSheet(false);
                        router.push(`/courses/${id}/lesson/${item.id}` as any);
                      } else {
                        Alert.alert("Lesson Locked", "Enroll in the course to unlock.");
                      }
                    }}
                    style={[
                      styles.sheetLessonRow,
                      {
                        backgroundColor: isCurrent
                          ? "rgba(14, 165, 233, 0.1)"
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.sheetLessonLeft}>
                      {item.isCompleted ? (
                        <CheckCircle size={16} color={colors.success} />
                      ) : item.isLocked ? (
                        <Lock size={16} color={colors.textMuted} />
                      ) : (
                        <Play size={16} color={colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.sheetLessonName,
                          {
                            color: isCurrent
                              ? colors.primary
                              : item.isLocked
                              ? colors.textMuted
                              : colors.textPrimary,
                            fontWeight: isCurrent ? "700" : "500",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                    {Boolean(item.durationText) && (
                      <Text style={[styles.sheetLessonDuration, { color: colors.textMuted }]}>
                        {item.durationText}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 4,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  videoPlayerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#090d16",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayerTouch: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(14, 165, 233, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  playText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    bottom: 12,
    right: 12,
    gap: 4,
  },
  durationText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  lockedContainer: {
    alignItems: "center",
    gap: 6,
  },
  lockedTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  lockedSub: {
    color: "#94a3b8",
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    gap: 12,
  },
  lessonMeta: {
    marginBottom: 16,
  },
  chapterName: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  lessonHeading: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  notesCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  notesHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  notesContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  navFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sheetScroll: {
    maxHeight: 380,
  },
  sheetChapter: {
    marginBottom: 16,
  },
  sheetChapterTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  sheetLessonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  sheetLessonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  sheetLessonName: {
    fontSize: 14,
  },
  sheetLessonDuration: {
    fontSize: 12,
  },
});
