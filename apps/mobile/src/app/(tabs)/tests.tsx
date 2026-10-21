import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  ChevronRight,
  Sparkles,
  Search,
  BookOpen,
  Award,
  Layers,
  CheckCircle2,
} from "lucide-react-native";
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
import { ExamSeriesPackageDto } from "@aspirantbook/shared";

type NavPill = "series" | "my-tests" | "pyq" | "ca";

export default function TestsTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const [activePill, setActivePill] = useState<NavPill>("series");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Query Exam Series packages
  const seriesQuery = useQuery({
    queryKey: ["exam-series-list", selectedGoal?.id, selectedCategory],
    queryFn: async () => {
      const res = await api.getExamSeries({
        goal: selectedGoal?.id !== "all" ? selectedGoal?.id : undefined,
        category: selectedCategory !== "All" ? selectedCategory : undefined,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load test series");
      return res.data || [];
    },
  });

  // Query PYQ
  const pyqQuery = useQuery({
    queryKey: ["tests-pyq"],
    queryFn: async () => {
      const res = await api.getPyqExams();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQs");
      return res.data || [];
    },
  });

  // Query Current Affairs
  const caQuery = useQuery({
    queryKey: ["tests-ca"],
    queryFn: async () => {
      const res = await api.getCurrentAffairs();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load Current Affairs");
      return res.data || [];
    },
  });

  const isLoading =
    activePill === "series"
      ? seriesQuery.isLoading
      : activePill === "pyq"
      ? pyqQuery.isLoading
      : activePill === "ca"
      ? caQuery.isLoading
      : false;

  const isError =
    activePill === "series"
      ? seriesQuery.isError
      : activePill === "pyq"
      ? pyqQuery.isError
      : activePill === "ca"
      ? caQuery.isError
      : false;

  const errorMessage =
    activePill === "series"
      ? seriesQuery.error?.message
      : activePill === "pyq"
      ? pyqQuery.error?.message
      : caQuery.error?.message;

  const handleRefresh = () => {
    if (activePill === "series") seriesQuery.refetch();
    else if (activePill === "pyq") pyqQuery.refetch();
    else if (activePill === "ca") caQuery.refetch();
  };

  const filteredSeries = useMemo(() => {
    let list = seriesQuery.data || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.examName && s.examName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [seriesQuery.data, searchQuery]);

  const categories = ["All", "BPSC", "UPSC", "UPPCS", "SSC", "Banking", "Railways"];

  return (
    <AppShell testID="tests-tab-screen">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(seriesQuery.isRefetching || pyqQuery.isRefetching || caQuery.isRefetching)}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Active Goal Banner (web match: test-series/page.tsx#L396-L450) */}
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
              Targeting: <Text style={{ fontWeight: "800", color: colors.primary }}>{selectedGoal.name}</Text>
            </Text>
          </View>
          <Text style={[styles.switchGoalText, { color: colors.primary }]}>Change Exam →</Text>
        </TouchableOpacity>

        {/* Section Title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Test Series & Practice
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            All India Mock Tests, Previous Year Papers & Sectional Tests
          </Text>
        </View>

        {/* Navigation Pills (web match: test-series/page.tsx#L363-L388) */}
        <View style={styles.pillRow}>
          <Chip
            label="Explore Series"
            selected={activePill === "series"}
            onPress={() => setActivePill("series")}
          />
          <Chip
            label="My Tests"
            selected={false}
            onPress={() => router.push("/my-tests" as any)}
          />
          <Chip
            label="PYQs"
            selected={activePill === "pyq"}
            onPress={() => setActivePill("pyq")}
          />
          <Chip
            label="Quizzes"
            selected={activePill === "ca"}
            onPress={() => setActivePill("ca")}
          />
        </View>

        {/* Search Bar & Category Chips when in series mode */}
        {activePill === "series" && (
          <View style={styles.filterSection}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: tokens.radius.lg,
                },
              ]}
            >
              <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search test packages..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={140} borderRadius={16} />
          </View>
        )}

        {/* Error state */}
        {isError && (
          <ErrorState
            message={errorMessage || "Failed to load test series. Please check connection."}
            onRetry={handleRefresh}
          />
        )}

        {/* Content: Series Packages */}
        {!isLoading && !isError && activePill === "series" && (
          <View style={styles.cardsList}>
            {filteredSeries.length === 0 ? (
              <EmptyState
                title="No Test Series Found"
                description={`There are currently no mock test series matching your criteria.`}
                actionTitle="Reset Filters"
                onAction={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
              />
            ) : (
              filteredSeries.map((pkg: ExamSeriesPackageDto) => (
                <Card
                  key={pkg.id}
                  onPress={() => router.push(`/tests/series/${pkg.id}` as any)}
                  style={styles.packageCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge
                      label={pkg.isFree ? "FREE PACKAGE" : "PRO SERIES"}
                      variant={pkg.isFree ? "success" : "pass"}
                      size="sm"
                    />
                    <Badge label={pkg.category} variant="neutral" size="sm" />
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {pkg.title}
                  </Text>

                  {pkg.description ? (
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {pkg.description}
                    </Text>
                  ) : null}

                  <View style={styles.statsRow}>
                    <View style={styles.statTag}>
                      <Layers size={13} color={colors.primary} />
                      <Text style={[styles.statTagText, { color: colors.textSecondary }]}>
                        {pkg.totalTests} Total Tests
                      </Text>
                    </View>
                    {pkg.freeTests > 0 && (
                      <View style={styles.statTag}>
                        <CheckCircle2 size={13} color={colors.success} />
                        <Text style={[styles.statTagText, { color: colors.success }]}>
                          {pkg.freeTests} Free Mocks
                        </Text>
                      </View>
                    )}
                    <View style={styles.statTag}>
                      <Text style={[styles.statTagText, { color: colors.textMuted }]}>
                        {pkg.languages?.join(", ") || "English, Hindi"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.actionPrompt, { color: colors.primary }]}>
                      View Tests & Schedule
                    </Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Content: PYQs */}
        {!isLoading && !isError && activePill === "pyq" && (
          <View style={styles.cardsList}>
            {(pyqQuery.data || []).length === 0 ? (
              <EmptyState
                title="No PYQ Papers Found"
                description="Previous year question papers will appear here."
              />
            ) : (
              (pyqQuery.data || []).map((exam: any) => (
                <Card
                  key={exam.id || exam.title}
                  onPress={() => router.push("/pyqs" as any)}
                  style={styles.packageCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge label="PYQ ARCHIVE" variant="neutral" size="sm" />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {exam.year || "All Years"}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {exam.title || exam.name}
                  </Text>
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.actionPrompt, { color: colors.primary }]}>Browse Papers</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* Content: Quizzes */}
        {!isLoading && !isError && activePill === "ca" && (
          <View style={styles.cardsList}>
            {(caQuery.data || []).length === 0 ? (
              <EmptyState
                title="No Current Affairs Quizzes"
                description="Daily and monthly current affairs quizzes will appear here."
              />
            ) : (
              (caQuery.data || []).map((item: any) => (
                <Card
                  key={item.id || item.slug}
                  onPress={() => router.push("/current-affairs" as any)}
                  style={styles.packageCard}
                >
                  <View style={styles.cardHeader}>
                    <Badge label="CURRENT AFFAIRS" variant="primary" size="sm" />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {item.month || "Daily"}
                    </Text>
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.actionPrompt, { color: colors.primary }]}>Attempt Quiz</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                </Card>
              ))
            )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  goalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalBannerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchGoalText: {
    fontSize: 13,
    fontWeight: "700",
  },
  titleRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 16,
  },
  loadingContainer: {
    gap: 12,
  },
  cardsList: {
    gap: 12,
  },
  packageCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  statTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionPrompt: {
    fontSize: 13,
    fontWeight: "700",
  },
});
