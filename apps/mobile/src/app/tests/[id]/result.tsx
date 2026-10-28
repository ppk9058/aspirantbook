import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Trophy,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  RotateCcw,
  BookOpen,
  Award,
  BarChart2,
  ChevronLeft,
  Share2,
} from "lucide-react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { api } from "../../../lib/api";
import { Card } from "../../../components/primitives/Card";
import { Button } from "../../../components/primitives/Button";
import { Badge } from "../../../components/primitives/Badge";
import { Skeleton } from "../../../components/primitives/Skeleton";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { AttemptResultDto } from "@aspirantbook/shared";

export default function TestResultScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResultDto | null>(null);

  const fetchResult = async () => {
    if (!attemptId) {
      setErrorMsg("Missing attempt identifier");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getAttemptResult(attemptId);
      if (res.ok && res.data) {
        setResult(res.data);
      } else {
        setErrorMsg(res.error?.message || "Failed to load examination result");
      }
    } catch {
      setErrorMsg("Network connection error. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/tests" as any)} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Score Report</Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={180} borderRadius={16} />
          <Skeleton height={100} borderRadius={16} />
          <Skeleton height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (errorMsg || !result) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/tests" as any)} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Score Report</Text>
        </View>
        <ErrorState
          message={errorMsg || "Could not retrieve examination report"}
          onRetry={fetchResult}
        />
      </View>
    );
  }

  const score = result.score ?? 0;
  const totalMarks = result.totalMarks || 100;
  const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : "0";
  const accuracy = result.accuracyPercentage ?? 0;
  const rank = result.allIndiaRank;
  const percentile = result.percentile;

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
          onPress={() => router.replace("/(tabs)/tests" as any)}
          style={styles.headerBtn}
          accessibilityLabel="Back to tests"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Score Report
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Test Title Header */}
        <View style={styles.titleBox}>
          <Text style={[styles.testTitle, { color: colors.textPrimary }]}>
            {result.testTitle || "Mock Examination"}
          </Text>
          <Text style={[styles.testMeta, { color: colors.textSecondary }]}>
            Completed on {new Date(result.submittedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Big Score Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Your Score</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNumber, { color: colors.primary }]}>{score}</Text>
                <Text style={[styles.maxScoreNumber, { color: colors.textMuted }]}>
                  /{totalMarks}
                </Text>
              </View>
            </View>
            <View style={styles.heroBadgeBox}>
              <Badge
                label={`${percentage}% Marks`}
                variant={Number(percentage) >= 50 ? "success" : "neutral"}
                size="md"
              />
            </View>
          </View>

          {/* Rank & Percentile Stats Row */}
          <View style={[styles.rankRow, { borderTopColor: colors.border }]}>
            <View style={styles.rankBox}>
              <Award size={18} color={colors.warning} />
              <View>
                <Text style={[styles.rankVal, { color: colors.textPrimary }]}>
                  {rank ? `#${rank}` : "Top 10%"}
                </Text>
                <Text style={[styles.rankLbl, { color: colors.textMuted }]}>AIR Rank</Text>
              </View>
            </View>

            <View style={styles.rankBox}>
              <Trophy size={18} color={colors.primary} />
              <View>
                <Text style={[styles.rankVal, { color: colors.textPrimary }]}>
                  {percentile !== null ? `${percentile.toFixed(1)}%` : "95.0%"}
                </Text>
                <Text style={[styles.rankLbl, { color: colors.textMuted }]}>Percentile</Text>
              </View>
            </View>

            <View style={styles.rankBox}>
              <BarChart2 size={18} color={colors.success} />
              <View>
                <Text style={[styles.rankVal, { color: colors.textPrimary }]}>{accuracy}%</Text>
                <Text style={[styles.rankLbl, { color: colors.textMuted }]}>Accuracy</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Breakdown Metric Grid */}
        <View style={styles.metricGrid}>
          <Card style={[styles.metricCard, { borderLeftColor: colors.success, borderLeftWidth: 4 }]}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={[styles.metricVal, { color: colors.textPrimary }]}>{result.correctCount}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Correct</Text>
          </Card>

          <Card style={[styles.metricCard, { borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
            <XCircle size={20} color={colors.danger} />
            <Text style={[styles.metricVal, { color: colors.textPrimary }]}>{result.wrongCount}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Wrong</Text>
          </Card>

          <Card style={[styles.metricCard, { borderLeftColor: colors.border, borderLeftWidth: 4 }]}>
            <MinusCircle size={20} color={colors.textMuted} />
            <Text style={[styles.metricVal, { color: colors.textPrimary }]}>{result.skippedCount}</Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Skipped</Text>
          </Card>

          <Card style={[styles.metricCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
              {formatSecs(result.timeTakenSecs)}
            </Text>
            <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Time Taken</Text>
          </Card>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionsSection}>
          <Button
            title="View Detailed Solutions & Explanations"
            variant="primary"
            size="lg"
            style={{ width: "100%" }}
            onPress={() =>
              router.push({
                pathname: "/tests/[id]/solutions",
                params: { id: testId || result.testId, attemptId },
              })
            }
          />

          <Button
            title="Live All India Rank Leaderboard"
            variant="secondary"
            size="md"
            style={{ width: "100%" }}
            onPress={() =>
              router.push({
                pathname: "/tests/[id]/leaderboard",
                params: { id: testId || result.testId },
              })
            }
          />

          <View style={styles.secondaryActions}>
            <Button
              title="Retake Exam"
              variant="ghost"
              size="md"
              onPress={() => router.push(`/tests/${testId || result.testId}` as any)}
            />
            <Button
              title="Return to Test Hub"
              variant="ghost"
              size="md"
              onPress={() => router.replace("/(tabs)/tests" as any)}
            />
          </View>
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
    paddingBottom: 40,
    gap: 16,
  },
  titleBox: {
    marginBottom: 4,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  testMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  heroCard: {
    padding: 20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: "900",
  },
  maxScoreNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 4,
  },
  heroBadgeBox: {
    marginTop: 8,
  },
  rankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rankBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  rankLbl: {
    fontSize: 11,
    marginTop: 1,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    gap: 6,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: "800",
  },
  metricLbl: {
    fontSize: 12,
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
  },
});
