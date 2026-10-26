import React, { useEffect, useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  HelpCircle,
  Lightbulb,
  Check,
  X,
  Menu,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { apiClient } from '../../../lib/api';

type FilterType = 'all' | 'correct' | 'incorrect' | 'skipped';

export default function SolutionsScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [solutionsData, setSolutionsData] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let mounted = true;
    async function loadSolutions() {
      try {
        setLoading(true);
        if (!attemptId) {
          Alert.alert('Error', 'Missing attempt ID', [{ text: 'Back', onPress: () => router.back() }]);
          return;
        }

        const res = await apiClient.getAttemptSolutions(attemptId);
        if (!mounted) return;

        if (res.ok && res.data) {
          setSolutionsData(res.data);
        } else {
          Alert.alert('Error', res.error?.message || 'Could not load solutions', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to fetch solutions', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSolutions();
    return () => {
      mounted = false;
    };
  }, [attemptId]);

  const allQuestions = solutionsData?.questions || [];

  // Filter questions
  const filteredQuestions = useMemo(() => {
    if (filter === 'all') return allQuestions;
    return allQuestions.filter((q: any) => {
      const selected = q.userSelectedOptionId;
      const correctOpt = q.options?.find((o: any) => o.isCorrect)?.id;
      if (filter === 'correct') return selected && selected === correctOpt;
      if (filter === 'incorrect') return selected && selected !== correctOpt;
      if (filter === 'skipped') return !selected;
      return true;
    });
  }, [allQuestions, filter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    allQuestions.forEach((q: any) => {
      const selected = q.userSelectedOptionId;
      const correctOpt = q.options?.find((o: any) => o.isCorrect)?.id;
      if (!selected) skipped++;
      else if (selected === correctOpt) correct++;
      else incorrect++;
    });
    return { all: allQuestions.length, correct, incorrect, skipped };
  }, [allQuestions]);

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Loading detailed explanations...
        </Text>
      </View>
    );
  }

  if (!currentQ) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>No questions match filter.</Text>
        <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setFilter('all')}>
          <Text style={styles.resetFilterText}>Reset Filter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const correctOption = currentQ.options?.find((o: any) => o.isCorrect);
  const userOption = currentQ.options?.find((o: any) => o.id === currentQ.userSelectedOptionId);
  const isCorrect = userOption && correctOption && userOption.id === correctOption.id;
  const isSkipped = !userOption;
  const isIncorrect = userOption && (!correctOption || userOption.id !== correctOption.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Solutions & Analysis</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textMuted }]}>
            Question {currentIndex + 1} of {filteredQuestions.length}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => {
              setFilter('all');
              setCurrentIndex(0);
            }}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'correct' && styles.filterChipActiveGreen]}
            onPress={() => {
              setFilter('correct');
              setCurrentIndex(0);
            }}
          >
            <CheckCircle size={14} color={filter === 'correct' ? '#16a34a' : '#6b7280'} />
            <Text style={[styles.filterChipText, filter === 'correct' && { color: '#16a34a', fontWeight: '700' }]}>
              Correct ({counts.correct})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'incorrect' && styles.filterChipActiveRed]}
            onPress={() => {
              setFilter('incorrect');
              setCurrentIndex(0);
            }}
          >
            <XCircle size={14} color={filter === 'incorrect' ? '#dc2626' : '#6b7280'} />
            <Text style={[styles.filterChipText, filter === 'incorrect' && { color: '#dc2626', fontWeight: '700' }]}>
              Incorrect ({counts.incorrect})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'skipped' && styles.filterChipActiveGray]}
            onPress={() => {
              setFilter('skipped');
              setCurrentIndex(0);
            }}
          >
            <MinusCircle size={14} color={filter === 'skipped' ? '#4b5563' : '#6b7280'} />
            <Text style={[styles.filterChipText, filter === 'skipped' && { color: '#4b5563', fontWeight: '700' }]}>
              Skipped ({counts.skipped})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Solution View */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge Row */}
        <View style={styles.statusRow}>
          {isCorrect && (
            <View style={[styles.outcomeBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
              <CheckCircle size={16} color="#16a34a" />
              <Text style={[styles.outcomeBadgeText, { color: '#16a34a' }]}>
                Correct (+{currentQ.positiveMarks || 1})
              </Text>
            </View>
          )}
          {isIncorrect && (
            <View style={[styles.outcomeBadge, { backgroundColor: 'rgba(220, 38, 38, 0.12)' }]}>
              <XCircle size={16} color="#dc2626" />
              <Text style={[styles.outcomeBadgeText, { color: '#dc2626' }]}>
                Incorrect (-{currentQ.negativeMarks || 0})
              </Text>
            </View>
          )}
          {isSkipped && (
            <View style={[styles.outcomeBadge, { backgroundColor: 'rgba(156, 163, 175, 0.15)' }]}>
              <MinusCircle size={16} color="#6b7280" />
              <Text style={[styles.outcomeBadgeText, { color: '#4b5563' }]}>Unattempted (0)</Text>
            </View>
          )}

          {currentQ.topic && (
            <Text style={[styles.topicText, { color: theme.colors.textMuted }]}>{currentQ.topic}</Text>
          )}
        </View>

        {/* Question Text */}
        <Text style={[styles.questionText, { color: theme.colors.text }]}>{currentQ.text}</Text>

        {/* Options Comparison */}
        <View style={styles.optionsList}>
          {currentQ.options?.map((opt: any, idx: number) => {
            const isThisCorrect = !!opt.isCorrect;
            const isUserSelection = opt.id === currentQ.userSelectedOptionId;
            const letter = String.fromCharCode(65 + idx);

            let cardBg = theme.colors.card;
            let borderColor = theme.colors.border;
            let badgeBg = theme.colors.border;
            let badgeTextColor = theme.colors.text;

            if (isThisCorrect) {
              cardBg = 'rgba(22, 163, 74, 0.08)';
              borderColor = '#16a34a';
              badgeBg = '#16a34a';
              badgeTextColor = '#ffffff';
            } else if (isUserSelection && !isThisCorrect) {
              cardBg = 'rgba(220, 38, 38, 0.08)';
              borderColor = '#dc2626';
              badgeBg = '#dc2626';
              badgeTextColor = '#ffffff';
            }

            return (
              <View
                key={opt.id}
                style={[styles.optionCard, { backgroundColor: cardBg, borderColor }]}
              >
                <View style={[styles.optionLetter, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.optionLetterText, { color: badgeTextColor }]}>{letter}</Text>
                </View>
                <View style={styles.optionBody}>
                  <Text style={[styles.optionContentText, { color: theme.colors.text }]}>{opt.text}</Text>
                  {isThisCorrect && (
                    <Text style={styles.correctIndicator}>✓ Correct Answer</Text>
                  )}
                  {isUserSelection && !isThisCorrect && (
                    <Text style={styles.incorrectIndicator}>✗ Your Answer</Text>
                  )}
                  {isUserSelection && isThisCorrect && (
                    <Text style={styles.userCorrectIndicator}>✓ Your Answer (Correct)</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Detailed Explanation */}
        <View style={[styles.explanationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.explanationHeader}>
            <Lightbulb size={20} color="#eab308" />
            <Text style={[styles.explanationTitle, { color: theme.colors.text }]}>Detailed Explanation</Text>
          </View>
          <Text style={[styles.explanationText, { color: theme.colors.text }]}>
            {currentQ.explanation || 'No detailed explanation provided for this question.'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
        >
          <ChevronLeft size={20} color={currentIndex === 0 ? '#9ca3af' : theme.colors.text} />
          <Text style={[styles.navBtnText, { color: currentIndex === 0 ? '#9ca3af' : theme.colors.text }]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex === filteredQuestions.length - 1 && styles.navBtnDisabled]}
          disabled={currentIndex === filteredQuestions.length - 1}
          onPress={() => setCurrentIndex((idx) => Math.min(filteredQuestions.length - 1, idx + 1))}
        >
          <Text
            style={[
              styles.navBtnText,
              { color: currentIndex === filteredQuestions.length - 1 ? '#9ca3af' : theme.colors.text },
            ]}
          >
            Next
          </Text>
          <ChevronRight size={20} color={currentIndex === filteredQuestions.length - 1 ? '#9ca3af' : theme.colors.text} />
        </TouchableOpacity>
      </View>
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
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  resetFilterText: {
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
  headerTitleCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipActiveGreen: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  filterChipActiveRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  filterChipActiveGray: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outcomeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topicText: {
    fontSize: 12,
    fontWeight: '500',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionBody: {
    flex: 1,
  },
  optionContentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  correctIndicator: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  incorrectIndicator: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  userCorrectIndicator: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  explanationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
