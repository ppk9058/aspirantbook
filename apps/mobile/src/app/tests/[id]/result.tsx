import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Trophy,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  BarChart2,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { apiClient } from '../../../lib/api';

export default function TestResultScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function loadResult() {
      try {
        setLoading(true);
        if (!attemptId) {
          Alert.alert('Error', 'Missing attempt ID', [{ text: 'Back', onPress: () => router.back() }]);
          return;
        }

        const res = await apiClient.getAttemptResult(attemptId);
        if (!mounted) return;

        if (res.ok && res.data) {
          setResult(res.data);
        } else {
          Alert.alert('Error', res.error?.message || 'Could not load test results', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to fetch result', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadResult();
    return () => {
      mounted = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Generating detailed performance analytics...
        </Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Result not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/practice')}>
          <Text style={styles.backBtnText}>Return to Practice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const score = result.score ?? 0;
  const maxScore = result.maxScore ?? 100;
  const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : '0';
  const correct = result.correctCount ?? 0;
  const incorrect = result.incorrectCount ?? 0;
  const skipped = result.unansweredCount ?? 0;
  const total = correct + incorrect + skipped;
  const accuracy = (correct + incorrect) > 0 ? ((correct / (correct + incorrect)) * 100).toFixed(1) : '0';
  const percentile = result.percentile ? result.percentile.toFixed(1) : null;
  const rank = result.rank ?? null;
  const totalTakers = result.totalTakers ?? null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.replace('/practice')}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Performance Analysis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Scorecard */}
        <View style={[styles.scorecard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.trophyWrapper}>
            <Trophy size={36} color="#eab308" />
          </View>
          <Text style={[styles.testName, { color: theme.colors.textMuted }]}>
            {result.test?.title || 'Examination Result'}
          </Text>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: theme.colors.primary }]}>{score}</Text>
            <Text style={[styles.scoreTotal, { color: theme.colors.textMuted }]}> / {maxScore}</Text>
          </View>

          <View style={styles.percentagePill}>
            <Text style={styles.percentageText}>{percentage}% Score</Text>
          </View>

          {/* Rank & Percentile row */}
          {(percentile !== null || rank !== null) && (
            <View style={styles.ranksRow}>
              {percentile !== null && (
                <View style={styles.rankCol}>
                  <Text style={[styles.rankValue, { color: theme.colors.text }]}>{percentile}th</Text>
                  <Text style={[styles.rankLabel, { color: theme.colors.textMuted }]}>Percentile</Text>
                </View>
              )}
              {rank !== null && (
                <View style={styles.rankCol}>
                  <Text style={[styles.rankValue, { color: theme.colors.text }]}>
                    #{rank} {totalTakers ? `/ ${totalTakers}` : ''}
                  </Text>
                  <Text style={[styles.rankLabel, { color: theme.colors.textMuted }]}>Rank</Text>
                </View>
              )}
              <View style={styles.rankCol}>
                <Text style={[styles.rankValue, { color: theme.colors.text }]}>{accuracy}%</Text>
                <Text style={[styles.rankLabel, { color: theme.colors.textMuted }]}>Accuracy</Text>
              </View>
            </View>
          )}
        </View>

        {/* Breakdown Metric Tiles */}
        <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Question Summary</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricTile, { backgroundColor: 'rgba(22, 163, 74, 0.08)' }]}>
            <CheckCircle size={22} color="#16a34a" />
            <Text style={[styles.metricNumber, { color: '#16a34a' }]}>{correct}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Correct</Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: 'rgba(220, 38, 38, 0.08)' }]}>
            <XCircle size={22} color="#dc2626" />
            <Text style={[styles.metricNumber, { color: '#dc2626' }]}>{incorrect}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Incorrect</Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: 'rgba(156, 163, 175, 0.08)' }]}>
            <MinusCircle size={22} color="#9ca3af" />
            <Text style={[styles.metricNumber, { color: '#6b7280' }]}>{skipped}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Skipped</Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
            <BarChart2 size={22} color={theme.colors.primary} />
            <Text style={[styles.metricNumber, { color: theme.colors.primary }]}>{total}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Total</Text>
          </View>
        </View>

        {/* Section Breakdown (if present) */}
        {Array.isArray(result.sectionScores) && result.sectionScores.length > 0 && (
          <View style={styles.sectionBreakdownWrapper}>
            <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Sectional Performance</Text>
            {result.sectionScores.map((sec: any, idx: number) => (
              <View
                key={sec.sectionId || idx}
                style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <View style={styles.secCardHeader}>
                  <Text style={[styles.secName, { color: theme.colors.text }]}>
                    {sec.sectionName || `Section ${idx + 1}`}
                  </Text>
                  <Text style={[styles.secScore, { color: theme.colors.primary }]}>
                    {sec.score} / {sec.maxScore}
                  </Text>
                </View>
                <View style={styles.secStatsRow}>
                  <Text style={styles.secStatText}>Correct: <Text style={{ color: '#16a34a' }}>{sec.correctCount}</Text></Text>
                  <Text style={styles.secStatText}>Wrong: <Text style={{ color: '#dc2626' }}>{sec.incorrectCount}</Text></Text>
                  <Text style={styles.secStatText}>Skipped: <Text style={{ color: '#6b7280' }}>{sec.unansweredCount}</Text></Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Solutions CTA */}
        <TouchableOpacity
          style={[styles.solutionsButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            router.push({
              pathname: `/tests/${testId}/solutions`,
              params: { attemptId },
            });
          }}
        >
          <BookOpen size={20} color="#ffffff" />
          <Text style={styles.solutionsBtnText}>View Solutions & Explanations</Text>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Return Button */}
        <TouchableOpacity
          style={[styles.returnButton, { borderColor: theme.colors.border }]}
          onPress={() => router.replace('/practice')}
        >
          <Text style={[styles.returnBtnText, { color: theme.colors.text }]}>Back to Practice</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBack: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  scorecard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNum: {
    fontSize: 42,
    fontWeight: '800',
  },
  scoreTotal: {
    fontSize: 20,
    fontWeight: '600',
  },
  percentagePill: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  percentageText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
  ranksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.15)',
  },
  rankCol: {
    alignItems: 'center',
  },
  rankValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  metricTile: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionBreakdownWrapper: {
    marginBottom: 24,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  secCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  secName: {
    fontSize: 14,
    fontWeight: '600',
  },
  secScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  secStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  secStatText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  solutionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  solutionsBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  returnButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  returnBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
