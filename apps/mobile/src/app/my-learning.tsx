import React from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Layers, BookOpen, ChevronRight, PlayCircle } from "lucide-react-native";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

export default function MyLearningScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();

  const tutorialsQuery = useQuery({
    queryKey: ["my-learning-courses"],
    queryFn: async () => {
      const res = await api.getTutorials();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load learning items");
      return res.data || [];
    },
    enabled: isAuthenticated,
  });

  const isLoading = isAuthenticated && tutorialsQuery.isLoading;
  const isError = isAuthenticated && tutorialsQuery.isError;
  const items = tutorialsQuery.data || [];

  return (
    <AppShell testID="my-learning-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(tutorialsQuery.isRefetching)}
            onRefresh={() => tutorialsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            My Batches & Enrollments
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Active courses, batches and tracked syllabus progress
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
            <Skeleton height={100} borderRadius={12} />
            <Skeleton height={100} borderRadius={12} />
          </View>
        ) : isError ? (
          <ErrorState
            message={tutorialsQuery.error?.message || "Failed to load enrollments"}
            onRetry={() => tutorialsQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No Enrollments Found"
            description="You are not enrolled in any batches yet. Browse courses to begin."
            actionTitle="Browse Courses"
            onAction={() => router.push("/(tabs)/courses" as any)}
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Card
                key={item.id}
                onPress={() => router.push(`/tutorials/${item.slug}` as any)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Badge label="ENROLLED" variant="primary" size="sm" />
                  <Text style={[styles.lessonCount, { color: colors.textMuted }]}>
                    {item.lessonsCount} Lessons
                  </Text>
                </View>

                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <PlayCircle size={14} color={colors.primary} />
                    <Text style={[styles.footerText, { color: colors.primary }]}>
                      Continue Course
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
  header: {
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
  loadingContainer: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  lessonCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
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
    marginLeft: 6,
  },
});
