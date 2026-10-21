import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Award,
  Clock,
  ChevronLeft,
  Search,
  User,
  BarChart2,
} from "lucide-react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { api } from "../../../lib/api";
import { Card } from "../../../components/primitives/Card";
import { Badge } from "../../../components/primitives/Badge";
import { Skeleton } from "../../../components/primitives/Skeleton";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { TestLeaderboardDto, TestLeaderboardItemDto } from "@aspirantbook/shared";

export default function TestLeaderboardScreen() {
  const { id: testId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [search, setSearch] = useState("");

  const leaderboardQuery = useQuery({
    queryKey: ["test-leaderboard", testId, search],
    queryFn: async () => {
      if (!testId) throw new Error("Test ID is required");
      const res = await api.getTestLeaderboard(testId, {
        search: search.trim() || undefined,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load leaderboard");
      return res.data!;
    },
    enabled: Boolean(testId),
  });

  const { data, isLoading, isError, error, refetch, isRefetching } = leaderboardQuery;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Leaderboard</Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={100} borderRadius={16} />
          <Skeleton height={60} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Leaderboard</Text>
        </View>
        <ErrorState
          message={error?.message || "Leaderboard is only visible to submitted candidates"}
          onRetry={refetch}
        />
      </View>
    );
  }

  const { testTitle, totalMarks, totalParticipants, currentUserRank, rankings } = data;

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 52px Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {testTitle}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {totalParticipants} Total Test Takers
          </Text>
        </View>
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
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search candidates by name..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Current User Rank Sticky Card if found */}
        {currentUserRank && (
          <Card
            style={[
              styles.myRankCard,
              {
                backgroundColor: "rgba(14, 165, 233, 0.1)",
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.myRankLeft}>
              <View style={[styles.myRankCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.myRankNumber}>#{currentUserRank.rank}</Text>
              </View>
              <View>
                <Text style={[styles.myRankTitle, { color: colors.textPrimary }]}>
                  Your Standing
                </Text>
                <Text style={[styles.myRankSub, { color: colors.textSecondary }]}>
                  Score: {currentUserRank.score} / {totalMarks} • {currentUserRank.accuracy}%
                </Text>
              </View>
            </View>
            <Badge label="YOU" variant="primary" size="sm" />
          </Card>
        )}

        {/* Leaderboard List */}
        <View style={styles.rankingsList}>
          {rankings.length === 0 ? (
            <EmptyState
              title="No Candidates Found"
              description="No participants matched your search."
              actionTitle="Clear Search"
              onAction={() => setSearch("")}
            />
          ) : (
            rankings.map((item: TestLeaderboardItemDto) => {
              const isTop1 = item.rank === 1;
              const isTop2 = item.rank === 2;
              const isTop3 = item.rank === 3;

              let rankBadgeColor = colors.surfaceSecondary;
              let rankTextColor = colors.textPrimary;
              if (isTop1) {
                rankBadgeColor = "#FEF08A"; // Gold
                rankTextColor = "#854D0E";
              } else if (isTop2) {
                rankBadgeColor = "#E2E8F0"; // Silver
                rankTextColor = "#334155";
              } else if (isTop3) {
                rankBadgeColor = "#FED7AA"; // Bronze
                rankTextColor = "#9A3412";
              }

              return (
                <View
                  key={item.rank}
                  style={[
                    styles.rankItem,
                    {
                      backgroundColor: item.isCurrentUser
                        ? "rgba(14, 165, 233, 0.08)"
                        : colors.surface,
                      borderColor: item.isCurrentUser ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: rankBadgeColor }]}>
                    <Text style={[styles.rankNumber, { color: rankTextColor }]}>
                      {item.rank}
                    </Text>
                  </View>

                  <View style={styles.candidateInfo}>
                    <View style={styles.candidateNameRow}>
                      <Text
                        style={[
                          styles.candidateName,
                          { color: colors.textPrimary },
                          item.isCurrentUser && { fontWeight: "800" },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.isCurrentUser && (
                        <Badge label="You" variant="primary" size="sm" />
                      )}
                    </View>
                    <Text style={[styles.candidateMeta, { color: colors.textMuted }]}>
                      Accuracy: {item.accuracy}% • Time: {formatSecs(item.timeSecs)}
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreVal, { color: colors.primary }]}>
                      {item.score}
                    </Text>
                    <Text style={[styles.maxScoreVal, { color: colors.textMuted }]}>
                      /{totalMarks}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
  headerBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  searchBar: {
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
  myRankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1.5,
  },
  myRankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  myRankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  myRankNumber: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  myRankTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  myRankSub: {
    fontSize: 12,
    marginTop: 2,
  },
  rankingsList: {
    gap: 8,
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: "800",
  },
  candidateInfo: {
    flex: 1,
  },
  candidateNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  candidateName: {
    fontSize: 14,
    fontWeight: "600",
  },
  candidateMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: 8,
  },
  scoreVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  maxScoreVal: {
    fontSize: 12,
    fontWeight: "600",
  },
});
