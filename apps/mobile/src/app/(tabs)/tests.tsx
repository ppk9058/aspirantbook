import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  InteractionManager,
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
import { useDebounce } from "../../lib/use-debounce";
import { ExamSeriesPackageDto } from "@aspirantbook/shared";

type NavPill = "series" | "my-tests" | "pyq" | "ca";

const EMPTY_ROWS: any[] = [];

// Replaces the old `cardsList` container `gap: 12` so item spacing is unchanged.
const ItemGap = () => <View style={styles.separator} />;

export default function TestsTabScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { selectedGoal, openGoalModal } = useGoal();
  const [activePill, setActivePill] = useState<NavPill>("series");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  // F4: the PYQ and current-affairs lists are not visible on first paint (the
  // series pill is the default), so their queries start after the mount
  // interactions settle. Selecting a pill starts its query immediately, exactly
  // like before, and a not-yet-started pill reports the pre-existing loading
  // state instead of the empty state.
  const [deferredReady, setDeferredReady] = useState(false);
  const [pyqRequested, setPyqRequested] = useState(false);
  const [caRequested, setCaRequested] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setDeferredReady(true));
    return () => task.cancel();
  }, []);

  const pyqEnabled = deferredReady || pyqRequested;
  const caEnabled = deferredReady || caRequested;

  // Query PYQ
  const pyqQuery = useQuery({
    queryKey: ["tests-pyq"],
    enabled: pyqEnabled,
    queryFn: async () => {
      const res = await api.getPyqExams();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQs");
      return res.data || [];
    },
  });

  // Query Current Affairs
  const caQuery = useQuery({
    queryKey: ["tests-ca"],
    enabled: caEnabled,
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
      ? !pyqEnabled || pyqQuery.isLoading
      : activePill === "ca"
      ? !caEnabled || caQuery.isLoading
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
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.examName && s.examName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [seriesQuery.data, debouncedSearch]);

  const categories = ["All", "BPSC", "UPSC", "UPPCS", "SSC", "Banking", "Railways"];

  const showList = !isLoading && !isError && activePill !== "my-tests";
  const listData: any[] =
    !showList
      ? EMPTY_ROWS
      : activePill === "series"
      ? filteredSeries.length > 0
        ? filteredSeries
        : EMPTY_ROWS
      : activePill === "pyq"
      ? (pyqQuery.data || []).length > 0
        ? pyqQuery.data || []
        : EMPTY_ROWS
      : (caQuery.data || []).length > 0
      ? caQuery.data || []
      : EMPTY_ROWS;

  const renderItem = ({ item }: { item: any }) => {
    if (activePill === "series") {
      const pkg = item as ExamSeriesPackageDto;
      return (
        <Card
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
      );
    }

    if (activePill === "pyq") {
      const exam = item;
      return (
        <Card
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
      );
    }

    const caItem = item;
    return (
      <Card
        onPress={() => router.push("/current-affairs" as any)}
        style={styles.packageCard}
      >
        <View style={styles.cardHeader}>
          <Badge label="CURRENT AFFAIRS" variant="primary" size="sm" />
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {caItem.month || "Daily"}
          </Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {caItem.title}
        </Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.actionPrompt, { color: colors.primary }]}>Attempt Quiz</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </Card>
    );
  };

  const listKeyExtractor = (item: any, index: number) => {
    if (activePill === "series") return item.id;
    if (activePill === "pyq") return item.id || item.title || String(index);
    return item.id || item.slug || String(index);
  };

  return (
    <AppShell testID="tests-tab-screen">
      <FlatList
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
        data={listData}
        keyExtractor={listKeyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemGap}
        extraData={activePill}
        ListHeaderComponent={
          <>
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
                  Goal: <Text style={{ fontWeight: "800", color: colors.primary }}>{selectedGoal.name}</Text>
                </Text>
              </View>
              <Text style={[styles.switchGoalText, { color: colors.primary }]}>Change</Text>
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
                onPress={() => {
                  setPyqRequested(true);
                  setActivePill("pyq");
                }}
              />
              <Chip
                label="Quizzes"
                selected={activePill === "ca"}
                onPress={() => {
                  setCaRequested(true);
                  setActivePill("ca");
                }}
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
              <View style={{ marginVertical: 8 }}>
                <ErrorState
                  message={
                    selectedCategory !== "All" || debouncedSearch
                      ? `Failed to load tests for current filter (${selectedCategory !== "All" ? selectedCategory : ""}${debouncedSearch ? ` "${debouncedSearch}"` : ""}).`
                      : errorMessage || "Failed to load test series. Please check connection."
                  }
                  onRetry={handleRefresh}
                />
                {(selectedCategory !== "All" || debouncedSearch.length > 0) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCategory("All");
                      setSearchQuery("");
                    }}
                    style={{ marginTop: 8, alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>Reset Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Empty states (same position as the old in-list empty state) */}
            {!isLoading && !isError && activePill === "series" && filteredSeries.length === 0 && (
              <EmptyState
                title="No Test Series Found"
                description={
                  debouncedSearch
                    ? `No test series matching "${debouncedSearch}"${selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}.`
                    : selectedCategory !== "All"
                    ? `No test series found under ${selectedCategory}.`
                    : "There are currently no mock test series published."
                }
                actionTitle="Reset Filters"
                onAction={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
              />
            )}

            {!isLoading && !isError && activePill === "pyq" && (pyqQuery.data || []).length === 0 && (
              <EmptyState
                title="No PYQ Papers Found"
                description="Previous year question papers will appear here."
              />
            )}

            {!isLoading && !isError && activePill === "ca" && (caQuery.data || []).length === 0 && (
              <EmptyState
                title="No Current Affairs Quizzes"
                description="Daily and monthly current affairs quizzes will appear here."
              />
            )}
          </>
        }
      />
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
  separator: {
    height: 12,
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
