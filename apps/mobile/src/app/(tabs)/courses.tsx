import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Sparkles,
  ChevronRight,
  Clock,
  PlayCircle,
  GraduationCap,
  Layers,
  Award,
  Compass,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { Chip } from "../../components/primitives/Chip";
import { Badge } from "../../components/primitives/Badge";
import { Skeleton } from "../../components/primitives/Skeleton";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { useGoal } from "../../context/GoalContext";
import { api } from "../../lib/api";
import { CourseSummaryDto } from "@aspirantbook/shared";
import { cleanDescriptionPreview } from "../../lib/course-progress";

export { cleanDescriptionPreview };

type DifficultyFilter = "ALL" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export default function CoursesTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["courses-list", selectedDifficulty, searchQuery],
    queryFn: async () => {
      const res = await api.getCourses({
        difficulty: selectedDifficulty !== "ALL" ? selectedDifficulty : undefined,
        search: searchQuery.trim().length > 0 ? searchQuery.trim() : undefined,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load courses");
      return res.data || [];
    },
  });

  const tracksQuery = useQuery({
    queryKey: ["career-tracks-summary"],
    queryFn: async () => {
      const res = await api.getCareerTracks();
      if (!res.ok) return [];
      return res.data || [];
    },
  });

  const isLoading = coursesQuery.isLoading;
  const isError = coursesQuery.isError;
  const errorMessage = coursesQuery.error?.message;
  const courses: CourseSummaryDto[] = coursesQuery.data || [];
  const tracks = tracksQuery.data || [];

  const handleRefresh = () => {
    coursesQuery.refetch();
    tracksQuery.refetch();
  };

  return (
    <AppShell testID="courses-tab-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(coursesQuery.isRefetching)}
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
              Goal: <Text style={{ fontWeight: "800", color: colors.primary }}>{selectedGoal.name}</Text>
            </Text>
          </View>
          <Text style={[styles.switchGoalText, { color: colors.primary }]}>Change</Text>
        </TouchableOpacity>

        {/* Section Heading */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Video Courses & Syllabus
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            In-depth structured video lessons, chapter practice & curriculum
          </Text>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: tokens.radius.lg,
            },
          ]}
        >
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search courses by topic, syllabus..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>

        {/* Difficulty Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterContainer}
        >
          <Chip
            label="All Levels"
            selected={selectedDifficulty === "ALL"}
            onPress={() => setSelectedDifficulty("ALL")}
          />
          <Chip
            label="Beginner"
            selected={selectedDifficulty === "BEGINNER"}
            onPress={() => setSelectedDifficulty("BEGINNER")}
          />
          <Chip
            label="Intermediate"
            selected={selectedDifficulty === "INTERMEDIATE"}
            onPress={() => setSelectedDifficulty("INTERMEDIATE")}
          />
          <Chip
            label="Advanced"
            selected={selectedDifficulty === "ADVANCED"}
            onPress={() => setSelectedDifficulty("ADVANCED")}
          />
        </ScrollView>

        {/* Career Tracks Highlight Banner */}
        {tracks.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/career-tracks" as any)}
            style={[
              styles.tracksBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.primary,
                borderRadius: tokens.radius.xl,
              },
            ]}
          >
            <View style={styles.tracksBannerLeft}>
              <Compass size={22} color={colors.primary} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.tracksBannerTitle, { color: colors.textPrimary }]}>
                  Career & Skill Tracks
                </Text>
                <Text style={[styles.tracksBannerSub, { color: colors.textSecondary }]}>
                  {tracks.length} structured end-to-end paths
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={120} borderRadius={12} />
            <Skeleton height={120} borderRadius={12} />
          </View>
        )}

        {/* Error State */}
        {isError && (
          <ErrorState
            message={errorMessage || "Failed to load courses. Please check connection."}
            onRetry={handleRefresh}
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && courses.length === 0 && (
          <EmptyState
            title="No Courses Found"
            description={
              searchQuery
                ? `No courses matching "${searchQuery}".`
                : "No courses published under this filter yet."
            }
            actionTitle="Clear Filters"
            onAction={() => {
              setSearchQuery("");
              setSelectedDifficulty("ALL");
            }}
          />
        )}

        {/* Course Cards List */}
        {!isLoading && !isError && courses.length > 0 && (
          <View style={styles.cardsList}>
            {courses.map((course) => (
              <Card
                key={course.id}
                onPress={() => router.push(`/courses/${course.id}` as any)}
                style={styles.courseCard}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={course.difficulty || "BEGINNER"}
                      variant={
                        course.difficulty === "ADVANCED"
                          ? "danger"
                          : course.difficulty === "INTERMEDIATE"
                          ? "warning"
                          : "primary"
                      }
                      size="sm"
                    />
                    {course.isEnrolled && (
                      <Badge label="ENROLLED" variant="success" size="sm" />
                    )}
                  </View>
                  <Text style={[styles.priceTag, { color: course.isFree ? colors.success : colors.primary }]}>
                    {course.isFree ? "Free" : `₹${course.price}`}
                  </Text>
                </View>

                <Text style={[styles.courseTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {course.title}
                </Text>

                {Boolean(course.description) && (
                  <Text style={[styles.courseDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {cleanDescriptionPreview(course.description)}
                  </Text>
                )}

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.metaItem}>
                    <PlayCircle size={14} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {course.lessonsCount} lessons
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {course.duration ? `${course.duration}m` : "Self-paced"}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Layers size={14} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {course.chaptersCount} chapters
                    </Text>
                  </View>
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
  titleRow: {
    marginBottom: 14,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  filterContainer: {
    marginBottom: 14,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  tracksBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  tracksBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  tracksBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  tracksBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    gap: 12,
  },
  cardsList: {
    gap: 12,
  },
  courseCard: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  priceTag: {
    fontSize: 14,
    fontWeight: "800",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  courseDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
