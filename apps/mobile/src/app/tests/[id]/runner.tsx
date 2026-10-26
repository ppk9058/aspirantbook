import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  BackHandler,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  CheckCircle,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Send,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { apiClient } from '../../../lib/api';
import { cbtSyncQueue } from '../../../lib/cbt-sync';
import { formatTimeRemaining } from '../../../lib/cbt-timer';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  order: number;
  sectionId?: string;
  sectionName?: string;
  text: string;
  options: QuestionOption[];
  positiveMarks: number;
  negativeMarks: number;
}

export default function CbtRunnerScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  // Screen keep-awake during exam
  useKeepAwake();

  // State
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [currentSection, setCurrentSection] = useState<string>('all');
  const [fontScale, setFontScale] = useState<number>(1);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const targetEndRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimestampRef = useRef<number | null>(null);

  // Load Attempt and Questions
  useEffect(() => {
    let mounted = true;
    async function loadAttempt() {
      try {
        setLoading(true);
        if (!attemptId) {
          Alert.alert('Error', 'Missing attempt ID', [{ text: 'Go Back', onPress: () => router.back() }]);
          return;
        }

        const res = await apiClient.getAttempt(attemptId);
        if (!mounted) return;

        if (res.ok && res.data) {
          const data = res.data as any;
          setAttempt(data);
          const rawQuestions = data.questions || [];
          const qs: Question[] = rawQuestions.map((q: any) => ({
            id: q.id,
            order: q.questionNumber || q.order || 1,
            sectionId: q.sectionId,
            sectionName: q.sectionName,
            text: q.textEn || q.text || "",
            options: Array.isArray(q.options)
              ? q.options
              : (q.optionsEn || []).map((opt: string, idx: number) => ({
                  id: String.fromCharCode(65 + idx),
                  text: opt,
                })),
            positiveMarks: q.positiveMarks || 2,
            negativeMarks: q.negativeMarks || 0.5,
          }));
          setQuestions(qs);

          // Restore existing responses
          const existingAnswers: Record<string, string> = {};
          if (Array.isArray(data.responses)) {
            data.responses.forEach((r: any) => {
              if (r.selectedOptionId || r.selectedOption) {
                existingAnswers[r.questionId] = r.selectedOptionId || r.selectedOption;
              }
            });
          }
          setAnswers(existingAnswers);

          // Mark first question visited
          if (qs.length > 0) {
            setVisited({ [qs[0].id]: true });
          }

          // Target end calculation from server
          if (data.targetEndTimestamp || data.timeRemainingSecs) {
            const remSecs = data.timeRemainingSecs || 3600;
            targetEndRef.current = Date.now() + remSecs * 1000;
            setRemainingSeconds(remSecs);
          } else {
            // Default 60 minutes if not specified
            targetEndRef.current = Date.now() + 60 * 60 * 1000;
            setRemainingSeconds(3600);
          }

          // Initialize sync queue
          await cbtSyncQueue.init();
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to load attempt', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to connect', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAttempt();
    return () => {
      mounted = false;
    };
  }, [attemptId]);

  // Timer Tick & Background AppState handling with 5s grace
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (targetEndRef.current <= 0) return;
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetEndRef.current - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(timerInterval);
        handleAutoSubmit();
      }
    }, 1000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        backgroundTimestampRef.current = Date.now();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTimestampRef.current) {
          const awaySeconds = Math.floor((Date.now() - backgroundTimestampRef.current) / 1000);
          // Grace period: if away > 5 seconds, warn the candidate
          if (awaySeconds > 5) {
            Alert.alert(
              'Exam Integrity Notice',
              `You were away from the test window for ${awaySeconds} seconds. Please stay on the exam screen.`
            );
          }
          backgroundTimestampRef.current = null;
        }
        // Resync timer
        if (targetEndRef.current > 0) {
          const now = Date.now();
          const rem = Math.max(0, Math.floor((targetEndRef.current - now) / 1000));
          setRemainingSeconds(rem);
          if (rem <= 0) {
            handleAutoSubmit();
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(timerInterval);
      subscription.remove();
    };
  }, []);

  // Hardware Back Button Prompt
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Leave Test?',
        'Are you sure you want to pause and exit? Your saved answers are safely preserved.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => router.replace(`/tests/${testId}`),
          },
        ]
      );
      return true; // prevent default exit
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [testId]);

  // Auto Submit on Time Expiry
  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    Alert.alert('Time Expired', 'The allocated time has ended. Your test is being submitted automatically.', [
      { text: 'OK' },
    ]);
    await doSubmit();
  }, [submitting, attemptId]);

  // Actual Submit Action
  const doSubmit = async () => {
    try {
      setSubmitting(true);
      // Flush offline answers first
      await cbtSyncQueue.flush();

      const res = await apiClient.submitAttempt(attemptId!);
      if (res.ok) {
        setSubmitModalVisible(false);
        router.replace({
          pathname: '/tests/[id]/result',
          params: { id: testId, attemptId },
        });
      } else {
        Alert.alert('Submit Failed', res.error?.message || 'Could not submit test. Please retry.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error during submission. Your answers are saved locally.');
    } finally {
      setSubmitting(false);
    }
  };

  // Sections extraction
  const sections = useMemo(() => {
    const map = new Map<string, string>();
    questions.forEach((q) => {
      if (q.sectionId && q.sectionName) {
        map.set(q.sectionId, q.sectionName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [questions]);

  // Filtered Questions by Section
  const filteredQuestions = useMemo(() => {
    if (currentSection === 'all') return questions;
    return questions.filter((q) => q.sectionId === currentSection);
  }, [questions, currentSection]);

  const currentQ = filteredQuestions[currentIndex] || questions[0];

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextQ = filteredQuestions[nextIdx];
      if (nextQ) {
        setVisited((prev) => ({ ...prev, [nextQ.id]: true }));
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevQ = filteredQuestions[prevIdx];
      if (prevQ) {
        setVisited((prev) => ({ ...prev, [prevQ.id]: true }));
      }
    }
  };

  const handleSelectQuestion = (index: number) => {
    setCurrentIndex(index);
    const q = filteredQuestions[index];
    if (q) {
      setVisited((prev) => ({ ...prev, [q.id]: true }));
    }
    setPaletteVisible(false);
  };

  // Option selection
  const handleSelectOption = (optionId: string) => {
    if (!currentQ) return;
    const newAnswers = { ...answers };
    if (newAnswers[currentQ.id] === optionId) {
      // Deselect if already selected
      delete newAnswers[currentQ.id];
    } else {
      newAnswers[currentQ.id] = optionId;
    }
    setAnswers(newAnswers);

    // Enqueue to offline sync queue
    cbtSyncQueue.enqueue(attemptId!, currentQ.id, newAnswers[currentQ.id] || null);
  };

  // Clear response
  const handleClearResponse = () => {
    if (!currentQ) return;
    const newAnswers = { ...answers };
    delete newAnswers[currentQ.id];
    setAnswers(newAnswers);
    cbtSyncQueue.enqueue(attemptId!, currentQ.id, null);
  };

  // Toggle mark for review
  const handleToggleMark = () => {
    if (!currentQ) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  // Palette status classification
  const getQuestionStatus = (qId: string) => {
    const isAnswered = !!answers[qId];
    const isMarked = !!markedForReview[qId];
    const isVis = !!visited[qId];

    if (isAnswered && isMarked) return 'answered-marked';
    if (isMarked) return 'marked';
    if (isAnswered) return 'answered';
    if (isVis) return 'not-answered';
    return 'not-visited';
  };

  // Status Counts
  const counts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let answeredMarked = 0;
    let notVisited = 0;

    questions.forEach((q) => {
      const st = getQuestionStatus(q.id);
      if (st === 'answered') answered++;
      else if (st === 'not-answered') notAnswered++;
      else if (st === 'marked') marked++;
      else if (st === 'answered-marked') answeredMarked++;
      else notVisited++;
    });

    return { answered, notAnswered, marked, answeredMarked, notVisited };
  }, [questions, answers, markedForReview, visited]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Loading examination environment...
        </Text>
      </View>
    );
  }

  if (!currentQ) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <AlertCircle size={48} color={theme.colors.danger} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>No questions found in this test.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Return</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCurrentMarked = !!markedForReview[currentQ.id];
  const currentAnswer = answers[currentQ.id];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header with Timer and Palette Toggle */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              Alert.alert('Leave Test?', 'Your answers are saved. You can resume anytime.', [
                { text: 'Stay', style: 'cancel' },
                { text: 'Pause & Exit', style: 'destructive', onPress: () => router.replace(`/tests/${testId}`) },
              ]);
            }}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.testTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {attempt?.test?.title || 'Exam'}
            </Text>
            <Text style={[styles.qCounterText, { color: theme.colors.textMuted }]}>
              Q {currentIndex + 1} of {filteredQuestions.length}
            </Text>
          </View>
        </View>

        {/* Server Timer */}
        <View style={[styles.timerBadge, remainingSeconds < 300 && styles.timerBadgeWarning]}>
          <Clock size={16} color={remainingSeconds < 300 ? '#b91c1c' : theme.colors.primary} />
          <Text
            style={[
              styles.timerText,
              { color: remainingSeconds < 300 ? '#b91c1c' : theme.colors.primary },
            ]}
          >
            {formatTimeRemaining(remainingSeconds)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setFontScale((s) => (s >= 1.3 ? 0.9 : s + 0.1))}
          >
            {fontScale >= 1.2 ? <ZoomOut size={20} color={theme.colors.text} /> : <ZoomIn size={20} color={theme.colors.text} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.paletteTrigger]}
            onPress={() => setPaletteVisible(true)}
          >
            <Menu size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Switcher (if multiple sections exist) */}
      {sections.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.sectionBar, { borderBottomColor: theme.colors.border }]}
        >
          <TouchableOpacity
            style={[
              styles.sectionTab,
              currentSection === 'all' && [styles.sectionTabActive, { borderColor: theme.colors.primary }],
            ]}
            onPress={() => {
              setCurrentSection('all');
              setCurrentIndex(0);
            }}
          >
            <Text
              style={[
                styles.sectionTabText,
                { color: currentSection === 'all' ? theme.colors.primary : theme.colors.textMuted },
              ]}
            >
              All Sections
            </Text>
          </TouchableOpacity>
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={[
                styles.sectionTab,
                currentSection === sec.id && [styles.sectionTabActive, { borderColor: theme.colors.primary }],
              ]}
              onPress={() => {
                setCurrentSection(sec.id);
                setCurrentIndex(0);
              }}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  { color: currentSection === sec.id ? theme.colors.primary : theme.colors.textMuted },
                ]}
              >
                {sec.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Main Question Scroll Body */}
      <ScrollView contentContainerStyle={styles.contentBody}>
        {/* Marks & Metadata Header */}
        <View style={styles.qMetaRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.border }]}>
            <Text style={[styles.badgeText, { color: theme.colors.textMuted }]}>
              +{currentQ.positiveMarks} / -{currentQ.negativeMarks} Marks
            </Text>
          </View>
          {currentQ.sectionName && (
            <Text style={[styles.sectionTag, { color: theme.colors.textMuted }]}>
              {currentQ.sectionName}
            </Text>
          )}
        </View>

        {/* Question Text */}
        <Text style={[styles.questionText, { color: theme.colors.text, fontSize: 16 * fontScale }]}>
          {currentQ.text}
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQ.options.map((opt, idx) => {
            const isSelected = currentAnswer === opt.id;
            const letter = String.fromCharCode(65 + idx);

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? theme.colors.primary + '12' : theme.colors.card,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => handleSelectOption(opt.id)}
              >
                <View
                  style={[
                    styles.optionLetter,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      { color: isSelected ? '#ffffff' : theme.colors.text },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? theme.colors.primary : theme.colors.text,
                      fontSize: 15 * fontScale,
                    },
                  ]}
                >
                  {opt.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Toolbar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <View style={styles.bottomLeftActions}>
          <TouchableOpacity
            style={[
              styles.actionPill,
              isCurrentMarked && styles.actionPillActivePurple,
            ]}
            onPress={handleToggleMark}
          >
            <Bookmark size={16} color={isCurrentMarked ? '#9333ea' : theme.colors.textMuted} />
            <Text
              style={[
                styles.actionPillText,
                { color: isCurrentMarked ? '#9333ea' : theme.colors.textMuted },
              ]}
            >
              {isCurrentMarked ? 'Marked' : 'Mark'}
            </Text>
          </TouchableOpacity>

          {currentAnswer && (
            <TouchableOpacity style={styles.actionPill} onPress={handleClearResponse}>
              <Text style={[styles.actionPillText, { color: theme.colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomNavActions}>
          <TouchableOpacity
            style={[styles.navStepButton, currentIndex === 0 && styles.navStepButtonDisabled]}
            disabled={currentIndex === 0}
            onPress={handlePrev}
          >
            <ChevronLeft size={20} color={currentIndex === 0 ? theme.colors.textMuted : theme.colors.text} />
          </TouchableOpacity>

          {currentIndex === filteredQuestions.length - 1 ? (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setSubmitModalVisible(true)}
            >
              <Send size={16} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Save & Next</Text>
              <ChevronRight size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Question Palette Modal (Standard NTA / SSC Grid) */}
      <Modal visible={paletteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.paletteContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.paletteHeader}>
              <Text style={[styles.paletteTitle, { color: theme.colors.text }]}>Question Palette</Text>
              <TouchableOpacity onPress={() => setPaletteVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#16a34a' }]}>
                  <Text style={styles.legendNumber}>{counts.answered}</Text>
                </View>
                <Text style={[styles.legendLabel, { color: theme.colors.textMuted }]}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#dc2626' }]}>
                  <Text style={styles.legendNumber}>{counts.notAnswered}</Text>
                </View>
                <Text style={[styles.legendLabel, { color: theme.colors.textMuted }]}>Not Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#9333ea' }]}>
                  <Text style={styles.legendNumber}>{counts.marked}</Text>
                </View>
                <Text style={[styles.legendLabel, { color: theme.colors.textMuted }]}>Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#9333ea', borderColor: '#16a34a', borderWidth: 2 }]}>
                  <Text style={styles.legendNumber}>{counts.answeredMarked}</Text>
                </View>
                <Text style={[styles.legendLabel, { color: theme.colors.textMuted }]}>Ans & Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#9ca3af' }]}>
                  <Text style={styles.legendNumber}>{counts.notVisited}</Text>
                </View>
                <Text style={[styles.legendLabel, { color: theme.colors.textMuted }]}>Not Visited</Text>
              </View>
            </View>

            {/* Palette Grid */}
            <ScrollView contentContainerStyle={styles.paletteGrid}>
              {filteredQuestions.map((q, idx) => {
                const status = getQuestionStatus(q.id);
                const isSelected = idx === currentIndex;

                let bg = '#9ca3af'; // not-visited
                let border = 'transparent';
                if (status === 'answered') bg = '#16a34a';
                else if (status === 'not-answered') bg = '#dc2626';
                else if (status === 'marked') bg = '#9333ea';
                else if (status === 'answered-marked') {
                  bg = '#9333ea';
                  border = '#16a34a';
                }

                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[
                      styles.paletteButton,
                      { backgroundColor: bg, borderColor: isSelected ? theme.colors.primary : border },
                      isSelected && styles.paletteButtonCurrent,
                    ]}
                    onPress={() => handleSelectQuestion(idx)}
                  >
                    <Text style={styles.paletteButtonText}>{idx + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Bottom Final Submit Trigger */}
            <TouchableOpacity
              style={[styles.paletteSubmitButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                setPaletteVisible(false);
                setSubmitModalVisible(true);
              }}
            >
              <Text style={styles.paletteSubmitButtonText}>Proceed to Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Submit Modal */}
      <Modal visible={submitModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: theme.colors.card }]}>
            <HelpCircle size={44} color={theme.colors.primary} />
            <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>Submit Examination?</Text>
            <Text style={[styles.confirmDesc, { color: theme.colors.textMuted }]}>
              You have answered {counts.answered + counts.answeredMarked} out of {questions.length} questions.
              Once submitted, you cannot edit answers.
            </Text>

            <View style={styles.confirmStatsRow}>
              <View style={styles.confirmStat}>
                <Text style={[styles.confirmStatNum, { color: '#16a34a' }]}>
                  {counts.answered + counts.answeredMarked}
                </Text>
                <Text style={styles.confirmStatLabel}>Answered</Text>
              </View>
              <View style={styles.confirmStat}>
                <Text style={[styles.confirmStatNum, { color: '#dc2626' }]}>
                  {counts.notAnswered + counts.notVisited}
                </Text>
                <Text style={styles.confirmStatLabel}>Unanswered</Text>
              </View>
              <View style={styles.confirmStat}>
                <Text style={[styles.confirmStatNum, { color: '#9333ea' }]}>
                  {counts.marked + counts.answeredMarked}
                </Text>
                <Text style={styles.confirmStatLabel}>Marked</Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                disabled={submitting}
                onPress={() => setSubmitModalVisible(false)}
              >
                <Text style={[styles.confirmBtnText, { color: theme.colors.text }]}>Review More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                disabled={submitting}
                onPress={doSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: '#ffffff', fontWeight: '700' }]}>
                    Yes, Submit Now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  headerIconButton: {
    padding: 6,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 140,
  },
  qCounterText: {
    fontSize: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerBadgeWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paletteTrigger: {
    marginLeft: 4,
  },
  sectionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sectionTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
  },
  sectionTabActive: {
    borderWidth: 1,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentBody: {
    padding: 16,
    paddingBottom: 40,
  },
  qMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTag: {
    fontSize: 12,
    fontWeight: '500',
  },
  questionText: {
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  actionPillActivePurple: {
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navStepButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  navStepButtonDisabled: {
    opacity: 0.4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  paletteContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paletteTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendNumber: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  legendLabel: {
    fontSize: 12,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 8,
  },
  paletteButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  paletteButtonCurrent: {
    borderWidth: 2,
    transform: [{ scale: 1.05 }],
  },
  paletteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  paletteSubmitButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  paletteSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmModal: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 360,
    width: '90%',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'rgba(156, 163, 175, 0.08)',
    borderRadius: 10,
    marginBottom: 20,
  },
  confirmStat: {
    alignItems: 'center',
  },
  confirmStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  confirmStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  confirmBtnText: {
    fontSize: 14,
  },
});
