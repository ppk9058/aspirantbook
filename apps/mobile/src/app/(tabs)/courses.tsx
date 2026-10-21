import React, { useState } from "react";
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
import { BookOpen, Layers, Sparkles, ChevronRight, Clock, PlayCircle } from "lucide-react-native";
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

type CoursesFilter = "all" | "courses" | "tutorials" | "my-learning";

export default function CoursesTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const [filter, setFilter] = useState<CoursesFilter>("all");

  // 1. Tutorials Query
  const tutorialsQuery = useQuery({
    queryKey: ["courses-tutorials", selectedGoal.id],
    queryFn: async () => {
      const res = await api.getTutorials();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load tutorials");
      return res.data || [];
    },
  });

  const isLoading = tutorialsQuery.isLoading;
  const isError = tutorialsQuery.isError;
  const errorMessage = tutorialsQuery.error?.message;

  const handleRefresh = () => {
    tutorialsQuery.refetch();
  };

  const tutorials = tutorialsQuery.data || [];

  return (
    <AppShell testID="courses-tab-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(tutorialsQuery.isRefetching)}
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
          <Text style={[styles.switchGoalText, { color: colors.primary }]}>Switch →</Text>
        </TouchableOpacity>

        {/* Section Heading */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Courses & Tutorials
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Video lessons, interactive chapters & syllabus roadmaps
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Chip
            label="All Learning"
            selected={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label="Tutorials"
            selected={filter === "tutorials"}
            onPress={() => setFilter("tutorials")}
          />
          <Chip
            label="My Batches"
            selected={filter === "my-learning"}
            onPress={() => router.push("/my-learning" as any)}
          />
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={110} borderRadius={12} />
            <Skeleton height={110} borderRadius={12} />
            <Skeleton height={110} borderRadius={12} />
          </View>
        )}

        {/* Error */}
        {isError && (
          <ErrorState
            message={errorMessage || "Failed to load courses. Please check connection."}
            onRetry={handleRefresh}
          />
        )}

        {/* Empty */}
        {!isLoading && !isError && tutorials.length === 0 && (
          <EmptyState
            title="No Courses Available"
            description={`No tutorials or courses currently published for ${selectedGoal.name}.`}
            actionTitle="Explore Goals"
            onAction={openGoalModal}
          />
        )}

        {/* Cards */}
        {!isLoading && !isError && tutorials.length > 0 && (
          <View style={styles.cardsList}>
            {tutorials.map((item) => (
              <Card
                key={item.id}
                onPress={() => router.push(`/tutorials/${item.slug}` as any)}
                style={styles.courseCard}
              >
                <View style={styles.cardHeader}>
                  <Badge
                    label={item.category || "ALL LEVELS"}
                    variant="neutral"
                    size="sm"
                  />
                  <Text style={[styles.lessonsCount, { color: colors.textMuted }]}>
                    {item.lessonsCount} Lessons
                  </Text>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={[styles.cardDesc, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <BookOpen size={14} color={colors.primary} />
                    <Text style={[styles.footerText, { color: colors.primary }]}>
                      Start Learning
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.primary} />
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
  filterRow: {
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
  courseCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lessonsCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
});
