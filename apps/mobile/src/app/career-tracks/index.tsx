import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Compass, ChevronRight, Layers, Sparkles } from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../components/primitives/Card";
import { Badge } from "../../components/primitives/Badge";
import { Skeleton } from "../../components/primitives/Skeleton";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { CareerTrackDto } from "@aspirantbook/shared";

export default function CareerTracksIndexScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();

  const tracksQuery = useQuery({
    queryKey: ["career-tracks-all"],
    queryFn: async () => {
      const res = await api.getCareerTracks();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load career tracks");
      return res.data || [];
    },
  });

  const isLoading = tracksQuery.isLoading;
  const isError = tracksQuery.isError;
  const tracks: CareerTrackDto[] = tracksQuery.data || [];

  return (
    <AppShell testID="career-tracks-screen">
      {/* 52px Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Career & Skill Tracks
        </Text>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(tracksQuery.isRefetching)}
            onRefresh={() => tracksQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.heroSection}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Structured Career Paths
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            Master end-to-end curriculums with guided course sequences and syllabus milestones.
          </Text>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={130} borderRadius={12} />
            <Skeleton height={130} borderRadius={12} />
          </View>
        )}

        {isError && (
          <ErrorState
            message={tracksQuery.error?.message || "Failed to load tracks."}
            onRetry={() => tracksQuery.refetch()}
          />
        )}

        {!isLoading && !isError && tracks.length === 0 && (
          <EmptyState
            title="No Tracks Available"
            description="Career and skill tracks will appear here once published."
          />
        )}

        {!isLoading && !isError && tracks.length > 0 && (
          <View style={styles.trackList}>
            {tracks.map((track) => (
              <Card
                key={track.id}
                onPress={() => router.push(`/career-tracks/${track.id}` as any)}
                style={styles.trackCard}
              >
                <View style={styles.cardHeader}>
                  <Badge
                    label={track.type === "CAREER" ? "CAREER TRACK" : "SKILL TRACK"}
                    variant={track.type === "CAREER" ? "primary" : "neutral"}
                    size="sm"
                  />
                  <View style={styles.courseCountWrap}>
                    <Layers size={14} color={colors.textMuted} />
                    <Text style={[styles.courseCount, { color: colors.textMuted }]}>
                      {track.totalCourses} courses
                    </Text>
                  </View>
                </View>

                <Text style={[styles.trackTitle, { color: colors.textPrimary }]}>
                  {track.title}
                </Text>

                {Boolean(track.description) && (
                  <Text style={[styles.trackDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {track.description}
                  </Text>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.exploreText, { color: colors.primary }]}>
                    View Track Roadmap
                  </Text>
                  <ChevronRight size={18} color={colors.primary} />
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
  heroSection: {
    marginBottom: 18,
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
  },
  subheading: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  loadingContainer: {
    gap: 12,
  },
  trackList: {
    gap: 14,
  },
  trackCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courseCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  trackDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  exploreText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
