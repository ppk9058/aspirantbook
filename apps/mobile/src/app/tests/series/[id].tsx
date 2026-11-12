import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  Clock,
  Award,
  ChevronLeft,
  CheckCircle2,
  Play,
  RotateCcw,
  BarChart2,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react-native";
import { Card } from "../../../components/primitives/Card";
import { Chip } from "../../../components/primitives/Chip";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import { Skeleton } from "../../../components/primitives/Skeleton";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { openWebUrl } from "../../../lib/web-links";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { useTheme } from "../../../theme/ThemeProvider";
import { api } from "../../../lib/api";
import { pluralize } from "../../../lib/formatters";
import { ExamSeriesTestItemDto } from "@aspirantbook/shared";

type TestFilter = "ALL" | "FULL_MOCK" | "SECTIONAL_TEST" | "FREE";

export default function ExamSeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [activeFilter, setActiveFilter] = useState<TestFilter>("ALL");

  const seriesQuery = useQuery({
    queryKey: ["exam-series-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Series ID is required");
      const res = await api.getExamSeriesDetail(id);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load series details");
      return res.data!;
    },
    enabled: Boolean(id),
  });

  const { data, isLoading, isError, error, refetch, isRefetching } = seriesQuery;

  const filteredTests = useMemo(() => {
    if (!data?.tests) return [];
    if (activeFilter === "ALL") return data.tests;
    if (activeFilter === "FREE") return data.tests.filter((t) => t.isFree);
    return data.tests.filter((t) => t.testType === activeFilter);
  }, [data?.tests, activeFilter]);

  const [unlockError, setUnlockError] = useState<string | null>(null);

  const handleUnlockOnWeb = async () => {
    setUnlockError(null);
    const slug = data?.series?.slug || id;
    const res = await openWebUrl(`/test-series/${slug}`, "series_unlock");
    if (!res.success && res.error) {
      setUnlockError(res.error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Test Series</Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={50} borderRadius={10} />
          <Skeleton height={90} borderRadius={12} />
          <Skeleton height={90} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Test Series</Text>
        </View>
        <ErrorState
          message={error?.message || "Could not load test package details"}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  const { series, tests, isEnrolled } = data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 52px Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {series.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Series Overview Banner */}
        <Card style={styles.bannerCard}>
          <View style={styles.badgeRow}>
            <Badge label={series.category} variant="primary" size="sm" />
            {isEnrolled ? (
              <Badge label="ENROLLED" variant="success" size="sm" />
            ) : series.isFree ? (
              <Badge label="FREE BUNDLE" variant="success" size="sm" />
            ) : (
              <Badge label="PRO SERIES" variant="pass" size="sm" />
            )}
          </View>

          <Text style={[styles.seriesTitle, { color: colors.textPrimary }]}>
            {series.title}
          </Text>

          {series.description ? (
            <Text style={[styles.seriesDesc, { color: colors.textSecondary }]}>
              {series.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Layers size={14} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                {series.totalTests} {series.totalTests === 1 ? "Total Test" : "Total Tests"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Award size={14} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                {series.freeTests} {series.freeTests === 1 ? "Free Mock" : "Free Mocks"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {series.languages?.join(", ") || "English, Hindi"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filter Chips (web match: test-series/[id]/TestSeriesDetailClient.tsx) */}
        <View style={styles.filterRow}>
          <Chip
            label="All Tests"
            selected={activeFilter === "ALL"}
            onPress={() => setActiveFilter("ALL")}
          />
          <Chip
            label="Full Length"
            selected={activeFilter === "FULL_MOCK"}
            onPress={() => setActiveFilter("FULL_MOCK")}
          />
          <Chip
            label="Sectional"
            selected={activeFilter === "SECTIONAL_TEST"}
            onPress={() => setActiveFilter("SECTIONAL_TEST")}
          />
          <Chip
            label="Free Mocks"
            selected={activeFilter === "FREE"}
            onPress={() => setActiveFilter("FREE")}
          />
        </View>

        {/* Tests List */}
        <View style={styles.testsList}>
          {filteredTests.length === 0 ? (
            <EmptyState
              title="No Tests In This Section"
              description="There are currently no mock exams matching this filter tab."
              actionTitle="Show All Tests"
              onAction={() => setActiveFilter("ALL")}
            />
          ) : (
            filteredTests.map((test: ExamSeriesTestItemDto) => {
              const status = test.userStatus?.status || "NOT_STARTED";
              const hasAttempt = status !== "NOT_STARTED";
              const isSubmitted = status === "SUBMITTED";
              const isInProgress = status === "IN_PROGRESS";

              return (
                <Card key={test.id} style={styles.testCard}>
                  <View style={styles.testHeader}>
                    <Badge
                      label={test.isFree ? "FREE MOCK" : "PRO"}
                      variant={test.isFree ? "success" : "neutral"}
                      size="sm"
                    />
                    <View style={styles.timeTag}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={[styles.timeText, { color: colors.textMuted }]}>
                        {pluralize(test.durationMinutes, "min")}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.testTitle, { color: colors.textPrimary }]}>
                    {test.title}
                  </Text>

                  <Text style={[styles.testMeta, { color: colors.textSecondary }]}>
                    {pluralize(test.totalQuestions, "Question")} • {pluralize(test.totalMarks, "Mark")}
                  </Text>

                  {/* User Attempt Status Banner if applicable */}
                  {hasAttempt && (
                    <View
                      style={[
                        styles.statusBanner,
                        {
                          backgroundColor: isSubmitted
                            ? "rgba(16, 185, 129, 0.1)"
                            : "rgba(245, 158, 11, 0.1)",
                        },
                      ]}
                    >
                      {isSubmitted ? (
                        <Text style={[styles.statusText, { color: colors.success }]}>
                          Score: {test.userStatus?.score ?? 0} / {test.userStatus?.totalMarks ?? test.totalMarks}
                        </Text>
                      ) : (
                        <Text style={[styles.statusText, { color: colors.warning }]}>
                          Attempt In Progress
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.testActionsRow}>
                    {isInProgress ? (
                      <Button
                        title="Resume Test"
                        variant="primary"
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: "/tests/[id]/runner",
                            params: { id: test.id, attemptId: test.userStatus?.attemptId || "" },
                          })
                        }
                      />
                    ) : isSubmitted ? (
                      <View style={styles.buttonGroup}>
                        <Button
                          title="View Result"
                          variant="secondary"
                          size="sm"
                          onPress={() =>
                            router.push({
                              pathname: "/tests/[id]/result",
                              params: { id: test.id, attemptId: test.userStatus?.attemptId || "" },
                            })
                          }
                        />
                        <Button
                          title="Retake"
                          variant="ghost"
                          size="sm"
                          onPress={() => router.push(`/tests/${test.id}` as any)}
                        />
                      </View>
                    ) : (
                      <Button
                        title="Start Test"
                        variant={test.isFree ? "primary" : "secondary"}
                        size="sm"
                        onPress={() => router.push(`/tests/${test.id}` as any)}
                      />
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Enrollment Bar (if not enrolled and pro) */}
      {!isEnrolled && !series.isFree && (
        <View
          style={[
            styles.stickyBottom,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.stickyLeft}>
            <Text style={[styles.stickyTitle, { color: colors.textPrimary }]}>
              Unlock All Tests
            </Text>
            <Text style={[styles.stickySubtitle, { color: colors.textSecondary }]}>
              Enroll on website to access full series
            </Text>
            {unlockError && (
              <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
                {unlockError}
              </Text>
            )}
          </View>
          <Button
            title="Enroll on Web"
            variant="primary"
            size="md"
            onPress={handleUnlockOnWeb}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  bannerCard: {
    padding: 16,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  seriesTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 8,
  },
  seriesDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  testsList: {
    gap: 12,
  },
  testCard: {
    padding: 16,
  },
  testHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  testMeta: {
    fontSize: 13,
    marginBottom: 12,
  },
  statusBanner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  testActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stickyLeft: {
    flex: 1,
    marginRight: 12,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stickySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
