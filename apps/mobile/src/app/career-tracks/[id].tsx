import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { pluralize } from "../../lib/formatters";
import { ArrowLeft, Compass, CheckCircle2, Circle, Clock, ChevronRight } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { Skeleton } from "../../components/primitives/Skeleton";
import { ErrorState } from "../../components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { CareerTrackDetailDto } from "@aspirantbook/shared";

export default function CareerTrackDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tokens } = useTheme();

  const trackQuery = useQuery({
    queryKey: ["career-track-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing track ID");
      const res = await api.getCareerTrackDetail(id);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load track details");
      return res.data;
    },
    enabled: Boolean(id),
  });

  const isLoading = trackQuery.isLoading;
  const isError = trackQuery.isError;
  const data: CareerTrackDetailDto | undefined = trackQuery.data;
  const track = data?.track;
  const courses = data?.courses || [];

  return (
    <AppShell testID="career-track-detail-screen">
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {track?.title || "Track Roadmap"}
        </Text>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(trackQuery.isRefetching)}
            onRefresh={() => trackQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={80} borderRadius={10} />
            <Skeleton height={80} borderRadius={10} />
          </View>
        )}

        {isError && (
          <ErrorState
            message={trackQuery.error?.message || "Failed to load track roadmap."}
            onRetry={() => trackQuery.refetch()}
          />
        )}

        {Boolean(track) && (
          <>
            {/* Header Card */}
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
              <Badge
                label={track!.type === "CAREER" ? "CAREER TRACK" : "SKILL TRACK"}
                variant={track!.type === "CAREER" ? "primary" : "neutral"}
                size="sm"
              />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {track!.title}
              </Text>
              {Boolean(track!.description) && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {track!.description}
                </Text>
              )}
              <Text style={[styles.courseCountText, { color: colors.textMuted }]}>
                {pluralize(courses.length, "course")} in structured sequence
              </Text>
            </View>

            {/* Courses Sequence Path */}
            <View style={styles.pathSection}>
              <Text style={[styles.pathHeading, { color: colors.textPrimary }]}>
                Curriculum Progression
              </Text>

              <View style={styles.stepsList}>
                {courses.map((course, index) => (
                  <View key={course.id} style={styles.stepContainer}>
                    {/* Left Timeline Indicator */}
                    <View style={styles.timelineCol}>
                      <View
                        style={[
                          styles.timelineCircle,
                          {
                            backgroundColor: course.isEnrolled ? colors.success : colors.primary,
                          },
                        ]}
                      >
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      {index < courses.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      )}
                    </View>

                    {/* Step Content Card */}
                    <Card
                      onPress={() => router.push(`/courses/${course.id}` as any)}
                      style={styles.stepCard}
                    >
                      <View style={styles.cardHeaderRow}>
                        <Badge
                          label={course.difficulty || "BEGINNER"}
                          variant="neutral"
                          size="sm"
                        />
                        {course.isEnrolled && (
                          <Badge label="ENROLLED" variant="success" size="sm" />
                        )}
                      </View>

                      <Text style={[styles.courseTitle, { color: colors.textPrimary }]}>
                        {course.title}
                      </Text>

                      <View style={styles.courseMetaRow}>
                        {Boolean(course.duration) && (
                          <View style={styles.metaItem}>
                            <Clock size={13} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>
                              {course.duration}m
                            </Text>
                          </View>
                        )}
                        <View style={styles.viewLink}>
                          <Text style={[styles.viewLinkText, { color: colors.primary }]}>
                            View Course
                          </Text>
                          <ChevronRight size={14} color={colors.primary} />
                        </View>
                      </View>
                    </Card>
                  </View>
                ))}
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
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    marginRight: 6,
  },
  headerTitle: {
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
    marginBottom: 20,
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  courseCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pathSection: {
    marginTop: 6,
  },
  pathHeading: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
  },
  stepsList: {
    gap: 0,
  },
  stepContainer: {
    flexDirection: "row",
    position: "relative",
  },
  timelineCol: {
    width: 32,
    alignItems: "center",
    marginRight: 10,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 8,
  },
  courseMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  viewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
