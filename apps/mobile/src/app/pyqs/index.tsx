import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  ChevronRight,
  Search,
  BookOpen,
  Sparkles,
  Download,
  Play,
  Calendar,
} from "lucide-react-native";
import { AppShell } from "../../components/shell/AppShell";
import { Card } from "../../../src/components/primitives/Card";
import { Chip } from "../../../src/components/primitives/Chip";
import { Badge } from "../../../src/components/primitives/Badge";
import { Button } from "../../../src/components/primitives/Button";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { EmptyState } from "../../../src/components/primitives/EmptyState";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/api";
import { PyqExamDto, PyqPaperDto } from "@aspirantbook/shared";

const EMPTY_PAPERS: PyqPaperDto[] = [];

// Replaces the old `list` container `gap: 12` so item spacing is unchanged.
const ItemGap = () => <View style={styles.separator} />;

export default function PyqsScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [selectedExamId, setSelectedExamId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Exam Categories
  const examsQuery = useQuery({
    queryKey: ["pyq-exams-list"],
    queryFn: async () => {
      const res = await api.getPyqExams();
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQ exams");
      return res.data || [];
    },
  });

  // 2. Fetch Papers
  const papersQuery = useQuery({
    queryKey: ["pyq-papers-list", selectedExamId],
    queryFn: async () => {
      const res = await api.getPyqPapers({
        examId: selectedExamId !== "ALL" ? selectedExamId : undefined,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load PYQ papers");
      return res.data || [];
    },
  });

  const isLoading = examsQuery.isLoading || papersQuery.isLoading;
  const isError = examsQuery.isError || papersQuery.isError;
  const exams = examsQuery.data || [];
  const rawPapers = papersQuery.data || [];

  const handleRefresh = () => {
    examsQuery.refetch();
    papersQuery.refetch();
  };

  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return rawPapers;
    const q = searchQuery.toLowerCase();
    return rawPapers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.examName.toLowerCase().includes(q) ||
        String(p.year).includes(q)
    );
  }, [rawPapers, searchQuery]);

  const showList = !isLoading && !isError && filteredPapers.length > 0;

  const renderItem = ({ item: paper }: { item: PyqPaperDto }) => (
    <Card style={styles.paperCard}>
      <View style={styles.cardHeader}>
        <Badge label={paper.examName} variant="primary" size="sm" />
        <View style={styles.yearBadge}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={[styles.yearText, { color: colors.textMuted }]}>
            Year {paper.year} {paper.shift ? `(${paper.shift})` : ""}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
        {paper.title}
      </Text>

      {paper.totalQuestions && (
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {paper.totalQuestions} Questions • Official Paper
        </Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Button
          title="Read PDF"
          variant="secondary"
          size="sm"
          onPress={() =>
            router.push({
              pathname: "/pyqs/pdf-view",
              params: { paperId: paper.id, title: paper.title },
            })
          }
        />
        <Button
          title="Attempt as CBT"
          variant="primary"
          size="sm"
          onPress={() => router.push(`/tests/${paper.id}` as any)}
        />
      </View>
    </Card>
  );

  return (
    <AppShell testID="pyqs-screen">
      <FlatList
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(examsQuery.isRefetching || papersQuery.isRefetching)}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        data={showList ? filteredPapers : EMPTY_PAPERS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemGap}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Previous Year Papers (PYQs)
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Authentic official question papers with verified solutions & CBT mock simulations
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
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search papers by exam or year..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Exam Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examPillsContainer}
            >
              <Chip
                label="All Exams"
                selected={selectedExamId === "ALL"}
                onPress={() => setSelectedExamId("ALL")}
              />
              {exams.map((e: PyqExamDto) => (
                <Chip
                  key={e.id}
                  label={`${e.name} (${e.totalPapers})`}
                  selected={selectedExamId === e.id}
                  onPress={() => setSelectedExamId(e.id)}
                />
              ))}
            </ScrollView>

            {/* Content Body */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Skeleton height={110} borderRadius={12} />
                <Skeleton height={110} borderRadius={12} />
                <Skeleton height={110} borderRadius={12} />
              </View>
            ) : isError ? (
              <ErrorState
                message={papersQuery.error?.message || "Failed to load PYQ papers"}
                onRetry={handleRefresh}
              />
            ) : filteredPapers.length === 0 ? (
              <EmptyState
                title="No Papers Found"
                description="There are currently no official papers matching your criteria."
                actionTitle="Reset Search"
                onAction={() => {
                  setSelectedExamId("ALL");
                  setSearchQuery("");
                }}
              />
            ) : null}
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
  header: {
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  examPillsContainer: {
    gap: 8,
    paddingRight: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  separator: {
    height: 12,
  },
  paperCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  yearText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
