import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import {
  Search as SearchIcon,
  X,
  BookOpen,
  Award,
  FileText,
  PlayCircle,
  Layers,
  ChevronRight,
  Clock,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Chip } from "../components/primitives/Chip";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { useTheme } from "../theme/ThemeProvider";
import { api } from "../lib/api";
import { SearchResultItemDto } from "@aspirantbook/shared";

type SearchFilterType = "ALL" | "TEST" | "COURSE" | "SERIES" | "PYQ";

const RECENT_SEARCHES = ["UPSC Prelims", "BPSC General Studies", "Indian Polity", "Mock Test 1", "Modern History"];

export default function SearchScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<SearchFilterType>("ALL");

  const searchQuery = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      const q = query.trim();
      if (!q || q.length < 2) return { query: q, total: 0, results: [] };
      const res = await api.search(q);
      if (!res.ok) throw new Error(res.error?.message || "Search failed");
      return res.data;
    },
    enabled: query.trim().length >= 2,
  });

  const isLoading = searchQuery.isLoading && query.trim().length >= 2;
  const isError = searchQuery.isError;
  const rawResults: SearchResultItemDto[] = searchQuery.data?.results || [];

  const filteredResults = rawResults.filter((item) => {
    if (filterType === "ALL") return true;
    return item.type === filterType;
  });

  const getResultIcon = (type: string) => {
    switch (type) {
      case "TEST":
        return <Award size={18} color={colors.primary} />;
      case "COURSE":
        return <PlayCircle size={18} color="#10b981" />;
      case "SERIES":
        return <Layers size={18} color="#f59e0b" />;
      case "PYQ":
        return <FileText size={18} color="#8b5cf6" />;
      default:
        return <BookOpen size={18} color={colors.primary} />;
    }
  };

  return (
    <AppShell testID="search-screen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search Bar Input */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: tokens.radius.lg,
              },
            ]}
          >
            <SearchIcon size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search mock tests, video courses, PYQs..."
              placeholderTextColor={colors.textMuted}
              testID="global-search-input"
              style={[styles.input, { color: colors.textPrimary }]}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Chips (Visible when query is active) */}
        {query.trim().length >= 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          >
            <Chip
              label="All Results"
              selected={filterType === "ALL"}
              onPress={() => setFilterType("ALL")}
            />
            <Chip
              label="Mock Tests"
              selected={filterType === "TEST"}
              onPress={() => setFilterType("TEST")}
            />
            <Chip
              label="Courses"
              selected={filterType === "COURSE"}
              onPress={() => setFilterType("COURSE")}
            />
            <Chip
              label="Test Series"
              selected={filterType === "SERIES"}
              onPress={() => setFilterType("SERIES")}
            />
            <Chip
              label="PYQs"
              selected={filterType === "PYQ"}
              onPress={() => setFilterType("PYQ")}
            />
          </ScrollView>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Recent Searches */}
          {!query.trim() && (
            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Popular Searches
              </Text>
              <View style={styles.recentWrap}>
                {RECENT_SEARCHES.map((tag, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setQuery(tag)}
                    style={[
                      styles.recentTag,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: tokens.radius.full,
                      },
                    ]}
                  >
                    <SearchIcon size={12} color={colors.textMuted} />
                    <Text style={[styles.recentTagText, { color: colors.textPrimary }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Loading Skeletons */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Skeleton height={70} borderRadius={10} />
              <Skeleton height={70} borderRadius={10} />
              <Skeleton height={70} borderRadius={10} />
            </View>
          )}

          {/* Error State */}
          {isError && (
            <ErrorState
              message={searchQuery.error?.message || "Search request failed"}
              onRetry={() => searchQuery.refetch()}
            />
          )}

          {/* Empty Results */}
          {!isLoading && !isError && query.trim().length >= 2 && filteredResults.length === 0 && (
            <EmptyState
              title="No Results Found"
              description={`We couldn't find any results matching "${query}".`}
              actionTitle="Clear Search"
              onAction={() => setQuery("")}
            />
          )}

          {/* Search Result Cards */}
          {!isLoading && !isError && filteredResults.length > 0 && (
            <View style={styles.resultsList}>
              {filteredResults.map((item) => (
                <Card
                  key={`${item.type}-${item.id}`}
                  onPress={() => router.push(item.route as any)}
                  style={styles.resultCard}
                >
                  <View style={styles.resultLeft}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      {getResultIcon(item.type)}
                    </View>
                    <View style={styles.resultInfo}>
                      <View style={styles.resultTopRow}>
                        {Boolean(item.badge) && (
                          <Badge
                            label={item.badge!}
                            variant={
                              item.type === "TEST"
                                ? "primary"
                                : item.type === "COURSE"
                                ? "success"
                                : item.type === "PYQ"
                                ? "warning"
                                : "neutral"
                            }
                            size="sm"
                          />
                        )}
                        <Text style={[styles.resultType, { color: colors.textMuted }]}>
                          {item.type}
                        </Text>
                      </View>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </Card>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  filterBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  recentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  recentTagText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingContainer: {
    gap: 10,
    marginTop: 8,
  },
  resultsList: {
    gap: 10,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  resultLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resultInfo: {
    flex: 1,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  resultType: {
    fontSize: 11,
    fontWeight: "700",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 2,
  },
  resultSub: {
    fontSize: 12,
  },
});
