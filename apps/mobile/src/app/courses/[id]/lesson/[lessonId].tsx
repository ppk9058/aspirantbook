import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  List,
  ExternalLink,
  Lock,
  Clock,
  Sparkles,
  AlertCircle,
  Gauge,
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
import {
  resolveVideoState,
  ALLOWED_PLAYBACK_SPEEDS,
  PlaybackSpeed,
  computeCurriculumNavigation,
} from "../../../../lib/video-player-helper";

export default function CourseLessonPlayerScreen() {
  const router = useRouter();
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const { colors, tokens } = useTheme();
  const queryClient = useQueryClient();
  const [showCurriculumSheet, setShowCurriculumSheet] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

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
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const progressMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!id || !lessonId) throw new Error("Missing parameters");
      const res = await api.updateCourseLessonProgress(id, lessonId, { completed });
      if (!res.ok) throw new Error(res.error?.message || "Failed to update progress");
      return res.data;
    },
    onSuccess: () => {
      setActionMessage(null);
      queryClient.invalidateQueries({ queryKey: ["course-lesson", id, lessonId] });
      queryClient.invalidateQueries({ queryKey: ["course-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-learning"] });
    },
    onError: (err: any) => {
      setActionMessage(err.message || "Failed to update lesson status");
    },
  });

  const lesson: CourseLessonDetailDto | undefined = lessonQuery.data;
  const courseData: CourseDetailDto | undefined = courseQuery.data;
  const isCompleted = Boolean(lesson?.isCompleted);

  // Resolve video state through security & provider resolver
  const videoState = useMemo(() => {
    const resolved = resolveVideoState({
      videoUrl: lesson?.videoUrl,
      isLocked: false,
    });
    return {
      ...resolved,
      isLocked: Boolean(lesson?.isLocked),
    };
  }, [lesson?.videoUrl, lesson?.isLocked]);

  // Sequential navigation computed from course chapters if present, falling back to API navigation
  const nav = useMemo(() => {
    if (courseData?.chapters && lessonId) {
      return computeCurriculumNavigation(lessonId, courseData.chapters);
    }
    return {
      prevLessonId: lesson?.navigation?.prevLessonId || null,
      nextLessonId: lesson?.navigation?.nextLessonId || null,
    };
  }, [courseData?.chapters, lessonId, lesson?.navigation]);

  // expo-video player instance for native streaming
  const nativeStreamUrl = !videoState.isLocked && videoState.provider === "native" ? videoState.streamUrl || "" : "";
  const player = useVideoPlayer(nativeStreamUrl, (p) => {
    p.loop = false;
    p.playbackRate = playbackSpeed;
  });

  // Update speed when state changes
  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    try {
      if (player) {
        player.playbackRate = speed;
      }
    } catch {
      // In case native player is unmounted
    }
  };

  const handleOpenExternal = async () => {
    if (videoState.externalUrl) {
      try {
        await WebBrowser.openBrowserAsync(videoState.externalUrl);
      } catch {
        setActionMessage("Unable to launch external browser.");
      }
    }
  };

  return (
    <AppShell testID="course-lesson-player-screen" showBottomBar={false}>
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
        {lessonQuery.isLoading ? (
          <View style={styles.videoLoading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.videoLoadingText}>Loading video stream...</Text>
          </View>
        ) : videoState.isLocked ? (
          <View style={styles.lockedContainer}>
            <Lock size={36} color="#94a3b8" />
            <Text style={styles.lockedTitle}>Lesson Locked</Text>
            <Text style={styles.lockedSub}>Enroll in the full course to view this lesson</Text>
          </View>
        ) : videoState.provider === "native" && videoState.streamUrl ? (
          <View style={styles.nativePlayerWrap}>
            <VideoView
              style={styles.videoView}
              player={player}
              nativeControls
              allowsPictureInPicture
              contentFit="contain"
            />
          </View>
        ) : videoState.provider === "embed_youtube" || videoState.provider === "embed_vimeo" ? (
          <View style={styles.embedContainer}>
            <View style={styles.embedBadge}>
              <ExternalLink size={14} color="#f59e0b" />
              <Text style={styles.embedBadgeText}>{videoState.embedLabel}</Text>
            </View>
            <Text style={styles.embedTitle}>External Video Stream</Text>
            <Text style={styles.embedSub}>
              This lesson is hosted externally. Tap below to launch full-resolution playback.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenExternal}
              style={styles.embedButton}
            >
              <Play size={16} color="#ffffff" fill="#ffffff" />
              <Text style={styles.embedButtonText}>Watch on {videoState.embedLabel?.replace("Opens ", "") || "Web"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noVideoContainer}>
            <AlertCircle size={32} color="#94a3b8" />
            <Text style={styles.noVideoText}>No video stream available for this lesson</Text>
          </View>
        )}
      </View>

      {/* Playback Speeds Bar (shown when native video is active) */}
      {videoState.provider === "native" && videoState.streamUrl && !videoState.isLocked ? (
        <View style={[styles.speedBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.speedLabelWrap}>
            <Gauge size={14} color={colors.textMuted} />
            <Text style={[styles.speedLabel, { color: colors.textMuted }]}>Speed</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speedPills}>
            {ALLOWED_PLAYBACK_SPEEDS.map((speed) => {
              const isActive = playbackSpeed === speed;
              return (
                <TouchableOpacity
                  key={speed}
                  activeOpacity={0.7}
                  onPress={() => handleSpeedChange(speed)}
                  style={[
                    styles.speedPill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.speedPillText,
                      { color: isActive ? "#ffffff" : colors.textPrimary },
                    ]}
                  >
                    {speed}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Action Message Banner */}
      {actionMessage && (
        <View style={styles.actionBanner}>
          <AlertCircle size={15} color="#d97706" />
          <Text style={styles.actionBannerText}>{actionMessage}</Text>
          <TouchableOpacity onPress={() => setActionMessage(null)}>
            <Text style={styles.actionBannerDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

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
              {nav.prevLessonId ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/courses/${id}/lesson/${nav.prevLessonId}` as any
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

              {nav.nextLessonId ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/courses/${id}/lesson/${nav.nextLessonId}` as any
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
          {courseData?.chapters?.map((ch, chIdx) => (
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
                        setActionMessage("Lesson is locked. Enroll in the course to unlock.");
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
  nativePlayerWrap: {
    width: "100%",
    height: "100%",
  },
  videoView: {
    width: "100%",
    height: "100%",
  },
  videoLoading: {
    alignItems: "center",
    gap: 8,
  },
  videoLoadingText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  lockedContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
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
    textAlign: "center",
  },
  embedContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  embedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  embedBadgeText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "600",
  },
  embedTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  embedSub: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  embedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  embedButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  noVideoContainer: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  noVideoText: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
  },
  speedBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  speedLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 4,
  },
  speedLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  speedPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  speedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  speedPillText: {
    fontSize: 12,
    fontWeight: "600",
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
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
