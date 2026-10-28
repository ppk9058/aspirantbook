import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Award,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
  RotateCcw,
  BarChart2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react-native";
import { Card } from "../../../components/primitives/Card";
import { Button } from "../../../components/primitives/Button";
import { Badge } from "../../../components/primitives/Badge";
import { Skeleton } from "../../../components/primitives/Skeleton";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { useTheme } from "../../../theme/ThemeProvider";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";
import { shouldShowUpgradeCta } from "../../../lib/exam-access-ui";

export default function TestInstructionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const testQuery = useQuery({
    queryKey: ["test-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("Test ID is required");
      const res = await api.getTestDetail(id);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load test details");
      return res.data!;
    },
    enabled: Boolean(id),
  });

  const { data: test, isLoading, isError, error, refetch } = testQuery;

  const handleStartExam = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to attempt this mock exam and record your verified score and rank.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
        ]
      );
      return;
    }

    try {
      setStarting(true);
      setStartError(null);
      const res = await api.startAttempt(id!);
      if (res.ok && res.data) {
        router.replace({
          pathname: "/tests/[id]/runner",
          params: { id: id!, attemptId: res.data.attemptId },
        });
      } else {
        setStartError(res.error?.message || "Could not initialize test attempt.");
      }
    } catch {
      setStartError("Network connection failed. Please retry.");
    } finally {
      setStarting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Exam Instructions</Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={160} borderRadius={16} />
          <Skeleton height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isError || !test) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Exam Instructions</Text>
        </View>
        <ErrorState
          message={error?.message || "Failed to load test instructions"}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

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
          {test.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Test Overview Card */}
        <Card style={styles.infoCard}>
          {test.series?.title ? (
            <Text style={[styles.seriesName, { color: colors.primary }]}>{test.series.title}</Text>
          ) : null}
          <Text style={[styles.testTitle, { color: colors.textPrimary }]}>{test.title}</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {test.durationMinutes}m
              </Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Duration</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
              <CheckCircle2 size={18} color={colors.success} />
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {test.totalQuestions}
              </Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Questions</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Award size={18} color={colors.warning} />
              <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                {test.totalMarks}
              </Text>
              <Text style={[styles.statLbl, { color: colors.textMuted }]}>Total Marks</Text>
            </View>
          </View>

          <View style={[styles.markingScheme, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.markingText, { color: colors.textSecondary }]}>
              Correct: <Text style={{ color: colors.success, fontWeight: "700" }}>+{test.positiveMarksPerQuestion}</Text> marks • Incorrect:{" "}
              <Text style={{ color: colors.danger, fontWeight: "700" }}>-{test.negativeMarksPerQuestion}</Text> marks
            </Text>
          </View>
        </Card>

        {/* Previous Attempts Section */}
        {test.previousAttempts && test.previousAttempts.length > 0 && (
          <Card style={styles.attemptsCard}>
            <View style={styles.attemptsHeader}>
              <BarChart2 size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Previous Attempt
              </Text>
            </View>
            {test.previousAttempts.slice(0, 1).map((att) => (
              <View key={att.id} style={styles.attemptRow}>
                <View>
                  <Text style={[styles.attemptScore, { color: colors.textPrimary }]}>
                    Score: {att.score ?? 0} / {att.totalMarks}
                  </Text>
                  {att.percentile !== null && (
                    <Text style={[styles.attemptMeta, { color: colors.textMuted }]}>
                      {att.percentile.toFixed(1)} percentile • Rank {att.rank || "-"}
                    </Text>
                  )}
                </View>
                <Button
                  title="View Report"
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: "/tests/[id]/result",
                      params: { id: test.id, attemptId: att.id },
                    })
                  }
                />
              </View>
            ))}
          </Card>
        )}

        {/* General Exam Instructions Card */}
        <Card style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <ShieldAlert size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Examination Instructions
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
              The countdown timer at the top indicates the remaining time. The test will automatically submit when the timer reaches 00:00.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
              Every answer choice is autosaved instantly to offline storage and synchronized to the server queue.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
              Use "Mark for Review" to flag tricky questions to re-check later before submitting.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
              Do not switch apps or minimize during the exam. Integrity monitoring tracks off-screen events.
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Bottom Start Button */}
      <View
        style={[
          styles.stickyBottom,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        {startError ? (
          <View style={styles.startErrorBanner}>
            <AlertCircle size={15} color="#ef4444" />
            <Text style={styles.startErrorText}>{startError}</Text>
          </View>
        ) : null}
        {shouldShowUpgradeCta(test.isFree, startError) ? (
          <Button
            title="View Pass Options"
            variant="secondary"
            size="lg"
            style={{ width: "100%", marginBottom: 8 }}
            onPress={() => router.push("/subscription" as any)}
          />
        ) : null}
        <Button
          title={starting ? "Initializing..." : "Start Mock Exam"}
          variant="primary"
          size="lg"
          loading={starting}
          style={{ width: "100%" }}
          onPress={handleStartExam}
        />
      </View>
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
    paddingBottom: 90,
    gap: 16,
  },
  infoCard: {
    padding: 16,
  },
  seriesName: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  statLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  markingScheme: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  markingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  attemptsCard: {
    padding: 16,
  },
  attemptsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  attemptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attemptScore: {
    fontSize: 15,
    fontWeight: "700",
  },
  attemptMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  rulesCard: {
    padding: 16,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  startErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  startErrorText: {
    color: "#dc2626",
    fontSize: 13,
    flex: 1,
  },
});
