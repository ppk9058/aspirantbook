import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Search as SearchIcon, X, BookOpen, ClipboardList, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/shell/AppShell";
import { Card } from "../components/primitives/Card";
import { Badge } from "../components/primitives/Badge";
import { Skeleton } from "../components/primitives/Skeleton";
import { EmptyState } from "../components/primitives/EmptyState";
import { useTheme } from "../theme/ThemeProvider";
import { api } from "../lib/api";

export default function SearchScreen() {
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const [query, setQuery] = useState("");

  const testsQuery = useQuery({
    queryKey: ["search-tests", query],
    queryFn: async () => {
      const res = await api.getTests();
      return res.ok ? res.data?.items || [] : [];
    },
  });

  const tutorialsQuery = useQuery({
    queryKey: ["search-tutorials", query],
    queryFn: async () => {
      const res = await api.getTutorials();
      return res.ok ? res.data || [] : [];
    },
  });

  const q = query.trim().toLowerCase();

  const matchingTests = q
    ? (testsQuery.data || []).filter((t) => t.title.toLowerCase().includes(q))
    : [];

  const matchingTutorials = q
    ? (tutorialsQuery.data || []).filter(
        (tut) =>
          tut.title.toLowerCase().includes(q) ||
          tut.description?.toLowerCase().includes(q)
      )
    : [];

  const totalResults = matchingTests.length + matchingTutorials.length;

  return (
    <AppShell testID="search-screen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Search Bar Input */}
        <View style={styles.searchBarContainer}>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <SearchIcon size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search tests, tutorials, notes..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              testID="global-search-input"
              style={[styles.input, { color: colors.textPrimary }]}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!q ? (
            <EmptyState
              title="Search aspirantbook"
              description="Type to instantly find mock tests, video lessons, and interactive tutorials."
              icon={<SearchIcon size={32} color={colors.textMuted} />}
            />
          ) : totalResults === 0 ? (
            <EmptyState
              title="No Results Found"
              description={`We couldn't find anything matching "${query}". Try searching for UPSC, GS, or Mock Tests.`}
            />
          ) : (
            <View style={styles.resultsList}>
              {matchingTests.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    TEST SERIES ({matchingTests.length})
                  </Text>
                  {matchingTests.map((t) => (
                    <Card
                      key={t.id}
                      onPress={() => router.push(`/tests/${t.id}` as any)}
                      style={styles.resultCard}
                    >
                      <View style={styles.cardHeader}>
                        <Badge label="TEST" variant="primary" size="sm" />
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                          {t.durationMinutes} mins
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {t.title}
                      </Text>
                      <View style={styles.cardFooter}>
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {t.totalQuestions} Questions
                        </Text>
                        <ChevronRight size={16} color={colors.primary} />
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {matchingTutorials.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    COURSES & TUTORIALS ({matchingTutorials.length})
                  </Text>
                  {matchingTutorials.map((tut) => (
                    <Card
                      key={tut.id}
                      onPress={() => router.push(`/tutorials/${tut.slug}` as any)}
                      style={styles.resultCard}
                    >
                      <View style={styles.cardHeader}>
                        <Badge label="TUTORIAL" variant="neutral" size="sm" />
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                          {tut.lessonsCount} Lessons
                        </Text>
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {tut.title}
                      </Text>
                      <View style={styles.cardFooter}>
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {tut.category || "All levels"}
                        </Text>
                        <ChevronRight size={16} color={colors.primary} />
                      </View>
                    </Card>
                  ))}
                </View>
              )}
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
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsList: {
    gap: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  resultCard: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
  },
});
