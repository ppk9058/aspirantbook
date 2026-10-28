import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Grid,
  CheckCircle,
  Bookmark,
  Send,
  AlertCircle,
  X,
  Languages,
} from "lucide-react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { api } from "../../../lib/api";
import { cbtSyncQueue } from "../../../lib/cbt-sync";
import { formatTimeRemaining } from "../../../lib/cbt-timer";
import { selectQuestionAtIndex } from "../../../lib/cbt-selection";
import { MathRenderer } from "../../../components/exam/MathRenderer";
import { Button } from "../../../components/primitives/Button";
import { Badge } from "../../../components/primitives/Badge";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { Card } from "../../../components/primitives/Card";

interface QuestionOption {
  id: string; // "A" | "B" | "C" | "D"
  textEn: string;
  textHi?: string | null;
}

interface Question {
  id: string;
  order: number;
  sectionId?: string;
  sectionName?: string;
  textEn: string;
  textHi?: string | null;
  options: QuestionOption[];
  positiveMarks: number;
  negativeMarks: number;
}

export default function CbtRunnerScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  // Screen keep-awake during exam
  useKeepAwake();

  // State
  const [loading, setLoading] = useState(true);
  const [testTitle, setTestTitle] = useState("Mock Exam");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState<"EN" | "HI">("EN");
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [integrityNotice, setIntegrityNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    setRetryNonce((prev) => prev + 1);
  }, []);
  const [syncState, setSyncState] = useState<{ pendingCount: number; lastError: string | null }>({
    pendingCount: 0,
    lastError: cbtSyncQueue.getLastSyncError(),
  });

  useEffect(() => {
    return cbtSyncQueue.subscribe((s) => {
      setSyncState({ pendingCount: s.pendingCount, lastError: s.lastError });
    });
  }, []);

  const targetEndRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);
  const backgroundTimestampRef = useRef<number | null>(null);

  // Load Attempt and Questions
  useEffect(() => {
    let mounted = true;
    async function loadAttempt() {
      try {
        setLoading(true);
        setLoadError(null);
        if (!attemptId) {
          if (mounted) setLoadError("Missing attempt ID");
          return;
        }

        const res = await api.getAttempt(attemptId);
        if (!mounted) return;

        if (res.ok && res.data) {
          const data = res.data;
          setTestTitle(data.testTitle || "Mock Exam");

          if (Array.isArray(data.sections) && data.sections.length > 0) {
            setSections(data.sections.map((s) => ({ id: s.id, name: s.name })));
          }

          const rawQuestions = data.questions || [];
          const qs: Question[] = rawQuestions.map((q: any) => {
            const optionsEn = q.optionsEn || [];
            const optionsHi = q.optionsHi || [];
            const opts: QuestionOption[] = optionsEn.map((optText: string, idx: number) => ({
              id: String.fromCharCode(65 + idx),
              textEn: optText,
              textHi: optionsHi[idx] || null,
            }));

            return {
              id: q.id,
              order: q.questionNumber || 1,
              sectionId: q.sectionId,
              sectionName: q.sectionName,
              textEn: q.textEn || "",
              textHi: q.textHi || null,
              options: opts,
              positiveMarks: q.positiveMarks ?? 1.0,
              negativeMarks: q.negativeMarks ?? 0.33,
            };
          });
          setQuestions(qs);

          // Restore existing responses
          const existingAnswers: Record<string, string> = {};
          const existingMarked: Record<string, boolean> = {};
          rawQuestions.forEach((q: any) => {
            if (q.selectedOption) {
              existingAnswers[q.id] = q.selectedOption;
            }
            if (q.isMarked) {
              existingMarked[q.id] = true;
            }
          });
          setAnswers(existingAnswers);
          setMarkedForReview(existingMarked);

          // Mark first question visited
          if (qs.length > 0) {
            setVisited({ [qs[0].id]: true });
          }

          // Target end calculation from server
          const remSecs = data.timeRemainingSecs ?? 3600;
          targetEndRef.current = Date.now() + remSecs * 1000;
          setRemainingSeconds(remSecs);

          // Initialize sync queue
          await cbtSyncQueue.init();
        } else {
          if (mounted) setLoadError(res.error?.message || "Failed to load attempt");
        }
      } catch (err: any) {
        if (mounted) setLoadError(err?.message || "Failed to connect to test environment");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAttempt();
    return () => {
      mounted = false;
    };
  }, [attemptId, retryNonce]);

  // Timer Tick & Background AppState handling
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

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        backgroundTimestampRef.current = Date.now();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
        if (backgroundTimestampRef.current) {
          const awaySeconds = Math.floor((Date.now() - backgroundTimestampRef.current) / 1000);
          if (awaySeconds > 5) {
            setIntegrityNotice(
              `Integrity Notice: You were away from the test window for ${awaySeconds} seconds. Please stay on the exam screen.`
            );
          }
          backgroundTimestampRef.current = null;
        }
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

  // Android Hardware Back button confirmation
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Exit Exam?",
        "Your answers are autosaved. Do you wish to leave the test window?",
        [
          { text: "Continue Test", style: "cancel" },
          { text: "Exit to Home", style: "destructive", onPress: () => router.replace("/(tabs)/tests" as any) },
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  // Filter questions by active section
  const visibleQuestions = useMemo(() => {
    if (activeSectionId === "ALL") return questions;
    return questions.filter((q) => q.sectionId === activeSectionId);
  }, [questions, activeSectionId]);

  // Never fall back to another section's question: an out-of-range index
  // renders the empty state below instead of silently targeting the wrong one.
  const currentQ = selectQuestionAtIndex(visibleQuestions, currentIndex);

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (!currentQ) return;
      const newAns = { ...answers, [currentQ.id]: optionId };
      setAnswers(newAns);

      // Monotonic sequence offline enqueue
      cbtSyncQueue.enqueueAnswer(
        attemptId!,
        currentQ.id,
        optionId,
        markedForReview[currentQ.id] || false,
        30
      );
    },
    [currentQ, answers, attemptId, markedForReview]
  );

  const handleClearResponse = useCallback(() => {
    if (!currentQ) return;
    const newAns = { ...answers };
    delete newAns[currentQ.id];
    setAnswers(newAns);

    cbtSyncQueue.enqueueAnswer(
      attemptId!,
      currentQ.id,
      null,
      markedForReview[currentQ.id] || false,
      30
    );
  }, [currentQ, answers, attemptId, markedForReview]);

  const handleToggleMarkForReview = useCallback(() => {
    if (!currentQ) return;
    const isMarked = !markedForReview[currentQ.id];
    setMarkedForReview({ ...markedForReview, [currentQ.id]: isMarked });

    cbtSyncQueue.enqueueAnswer(
      attemptId!,
      currentQ.id,
      answers[currentQ.id] || null,
      isMarked,
      30
    );
  }, [currentQ, markedForReview, answers, attemptId]);

  const goToNext = () => {
    if (currentIndex < visibleQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextQ = visibleQuestions[nextIdx];
      if (nextQ) setVisited((prev) => ({ ...prev, [nextQ.id]: true }));
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAutoSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await cbtSyncQueue.flush(attemptId!);
      const res = await api.submitAttempt(attemptId!);
      if (res.ok) {
        router.replace({
          pathname: "/tests/[id]/result",
          params: { id: testId!, attemptId: attemptId! },
        });
      } else {
        router.replace({
          pathname: "/tests/[id]/result",
          params: { id: testId!, attemptId: attemptId! },
        });
      }
    } catch {
      router.replace({
        pathname: "/tests/[id]/result",
        params: { id: testId!, attemptId: attemptId! },
      });
    }
  };

  const handleConfirmSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await cbtSyncQueue.flush(attemptId!);
      const res = await api.submitAttempt(attemptId!);
      if (res.ok) {
        setSubmitModalVisible(false);
        router.replace({
          pathname: "/tests/[id]/result",
          params: { id: testId!, attemptId: attemptId! },
        });
      } else {
        setSubmitError(res.error?.message || "Failed to finalize test submission.");
      }
    } catch {
      setSubmitError("Network connection failed during submission. Retrying...");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Metrics for summary
  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);

  if (loadError) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ErrorState
          title="Unable to Load Test"
          message={loadError}
          onRetry={handleRetry}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading examination environment...
        </Text>
      </View>
    );
  }

  if (!currentQ) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          No questions available in this section.
        </Text>
        <Button
          title="Back to Tests"
          variant="primary"
          size="md"
          onPress={() => router.replace("/(tabs)/tests" as any)}
        />
      </View>
    );
  }

  const isWarningTime = remainingSeconds < 300; // < 5 mins
  const isCriticalTime = remainingSeconds < 60; // < 1 min

  const qText = language === "HI" && currentQ.textHi ? currentQ.textHi : currentQ.textEn;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Top Header — height + paddingTop keep controls below the notch */}
      <View
        testID="cbt-header"
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
            height: 52 + insets.top,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Exit Exam?",
              "Your answers are saved. Are you sure you want to pause and exit?",
              [
                { text: "Resume", style: "cancel" },
                { text: "Exit", style: "destructive", onPress: () => router.replace("/(tabs)/tests" as any) },
              ]
            );
          }}
          style={styles.headerBtn}
          accessibilityLabel="Exit test"
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {testTitle}
          </Text>
        </View>

        {/* Timer Pill */}
        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: isCriticalTime
                ? "rgba(239, 68, 68, 0.15)"
                : isWarningTime
                ? "rgba(245, 158, 11, 0.15)"
                : colors.surfaceSecondary,
            },
          ]}
        >
          <Clock
            size={14}
            color={isCriticalTime ? colors.danger : isWarningTime ? colors.warning : colors.primary}
          />
          <Text
            style={[
              styles.timerText,
              {
                color: isCriticalTime ? colors.danger : isWarningTime ? colors.warning : colors.primary,
              },
            ]}
          >
            {formatTimeRemaining(remainingSeconds)}
          </Text>
        </View>

        {/* Language Toggle */}
        <TouchableOpacity
          onPress={() => setLanguage(language === "EN" ? "HI" : "EN")}
          style={[styles.langBtn, { backgroundColor: colors.surfaceSecondary }]}
        >
          <Text style={[styles.langText, { color: colors.primary }]}>{language}</Text>
        </TouchableOpacity>

        {/* Question Palette Trigger */}
        <TouchableOpacity
          onPress={() => setPaletteVisible(true)}
          style={[styles.paletteTrigger, { backgroundColor: colors.surfaceSecondary }]}
          accessibilityLabel="Open question palette"
        >
          <Grid size={16} color={colors.textPrimary} />
          <Text style={[styles.paletteTriggerCount, { color: colors.textPrimary }]}>
            {currentIndex + 1}/{visibleQuestions.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Non-durable warning banner if SQLite unavailable */}
      {!cbtSyncQueue.isDurable && (
        <View style={styles.durabilityBanner}>
          <AlertCircle size={15} color="#d97706" />
          <Text style={styles.durabilityBannerText}>
            Offline durability disabled: SQLite database unavailable. Answers are kept in memory for this session only.
          </Text>
        </View>
      )}

      {/* Sync Status Banner if answers are pending sync due to connection issues */}
      {Boolean(syncState.lastError && syncState.pendingCount > 0) && (
        <View style={styles.syncErrorBanner}>
          <AlertCircle size={15} color="#d97706" />
          <Text style={styles.syncErrorBannerText}>
            {syncState.pendingCount} answer{syncState.pendingCount > 1 ? "s" : ""} saved offline ({syncState.lastError})
          </Text>
        </View>
      )}

      {/* Integrity Monitoring Warning Banner */}
      {integrityNotice && (
        <View style={styles.integrityBanner}>
          <AlertCircle size={15} color="#dc2626" />
          <Text style={styles.integrityBannerText}>{integrityNotice}</Text>
          <TouchableOpacity onPress={() => setIntegrityNotice(null)}>
            <X size={15} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* Section Tabs (if multi-section) */}
      {sections.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.sectionTabs, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.sectionTabsContent}
        >
          <TouchableOpacity
            onPress={() => {
              setActiveSectionId("ALL");
              setCurrentIndex(0);
            }}
            style={[
              styles.sectionTabItem,
              activeSectionId === "ALL" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.sectionTabText,
                { color: activeSectionId === "ALL" ? colors.primary : colors.textSecondary },
              ]}
            >
              All Sections
            </Text>
          </TouchableOpacity>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => {
                setActiveSectionId(s.id);
                setCurrentIndex(0);
              }}
              style={[
                styles.sectionTabItem,
                activeSectionId === s.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  { color: activeSectionId === s.id ? colors.primary : colors.textSecondary },
                ]}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Main Question Body */}
      <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {/* Question Meta Row */}
        <View style={styles.qMetaRow}>
          <Text style={[styles.qNumLabel, { color: colors.textPrimary }]}>
            Question {currentQ.order}
          </Text>
          <View style={styles.markingPill}>
            <Text style={[styles.markingPillText, { color: colors.success }]}>
              +{currentQ.positiveMarks}
            </Text>
            <Text style={[styles.markingPillText, { color: colors.danger, marginLeft: 6 }]}>
              -{currentQ.negativeMarks}
            </Text>
          </View>
        </View>

        {/* Question Text with LaTeX rendering */}
        <View style={styles.questionStatementBox}>
          <MathRenderer text={qText} fontSize={16} />
        </View>

        {/* Option Radio Rows (>= 44px tap target each) */}
        <View style={styles.optionsList}>
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentQ.id] === opt.id;
            const optText = language === "HI" && opt.textHi ? opt.textHi : opt.textEn;

            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleSelectOption(opt.id)}
                activeOpacity={0.8}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: isSelected
                      ? "rgba(14, 165, 233, 0.1)"
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.radioLetter,
                      { color: isSelected ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {opt.id}
                  </Text>
                </View>
                <View style={styles.optionTextWrap}>
                  <MathRenderer text={optText} fontSize={15} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleToggleMarkForReview}
          style={[
            styles.actionIconButton,
            {
              backgroundColor: markedForReview[currentQ.id]
                ? "rgba(168, 85, 247, 0.15)"
                : colors.surfaceSecondary,
            },
          ]}
        >
          <Bookmark
            size={18}
            color={markedForReview[currentQ.id] ? "#A855F7" : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionIconLabel,
              {
                color: markedForReview[currentQ.id] ? "#A855F7" : colors.textSecondary,
              },
            ]}
          >
            {markedForReview[currentQ.id] ? "Marked" : "Review"}
          </Text>
        </TouchableOpacity>

        {answers[currentQ.id] ? (
          <TouchableOpacity
            onPress={handleClearResponse}
            style={[styles.actionIconButton, { backgroundColor: colors.surfaceSecondary }]}
          >
            <X size={18} color={colors.textSecondary} />
            <Text style={[styles.actionIconLabel, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.navButtonsGroup}>
          <Button
            title="Prev"
            variant="ghost"
            size="sm"
            disabled={currentIndex === 0}
            onPress={goToPrev}
          />

          {currentIndex === visibleQuestions.length - 1 ? (
            <Button
              title="Submit Test"
              variant="primary"
              size="sm"
              onPress={() => setSubmitModalVisible(true)}
            />
          ) : (
            <Button title="Save & Next" variant="primary" size="sm" onPress={goToNext} />
          )}
        </View>
      </View>

      {/* Question Palette Modal */}
      <Modal
        visible={paletteVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPaletteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.paletteSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.paletteHeader}>
              <Text style={[styles.paletteTitle, { color: colors.textPrimary }]}>
                Question Navigation Palette
              </Text>
              <TouchableOpacity onPress={() => setPaletteVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Summary Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {answeredCount} Answered
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#A855F7" }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {markedCount} Marked
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {unansweredCount} Unanswered
                </Text>
              </View>
            </View>

            {/* Grid of question buttons */}
            <ScrollView contentContainerStyle={styles.paletteGrid}>
              {visibleQuestions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = Boolean(markedForReview[q.id]);
                const isCurrent = idx === currentIndex;

                let itemBg = colors.surfaceSecondary;
                let textColor = colors.textPrimary;
                if (isAnswered) {
                  itemBg = colors.success;
                  textColor = "#FFFFFF";
                } else if (isMarked) {
                  itemBg = "#A855F7";
                  textColor = "#FFFFFF";
                }

                return (
                  <TouchableOpacity
                    key={q.id}
                    onPress={() => {
                      setCurrentIndex(idx);
                      setVisited((prev) => ({ ...prev, [q.id]: true }));
                      setPaletteVisible(false);
                    }}
                    style={[
                      styles.paletteGridItem,
                      {
                        backgroundColor: itemBg,
                        borderColor: isCurrent ? colors.primary : "transparent",
                        borderWidth: isCurrent ? 2 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.paletteGridItemText, { color: textColor }]}>
                      {q.order}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.paletteFooter}>
              <Button
                title="Submit Test"
                variant="primary"
                size="md"
                style={{ width: "100%" }}
                onPress={() => {
                  setPaletteVisible(false);
                  setSubmitModalVisible(true);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Dialog */}
      <Modal
        visible={submitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>Submit Mock Exam?</Text>
            <Text style={[styles.confirmSubtitle, { color: colors.textSecondary }]}>
              Please verify your responses summary before submitting:
            </Text>

            {submitError && (
              <View style={styles.submitErrorBanner}>
                <AlertCircle size={14} color="#dc2626" />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            )}

            <View style={styles.summaryTable}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Questions:</Text>
                <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{totalCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Answered:</Text>
                <Text style={[styles.summaryVal, { color: colors.success }]}>{answeredCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Marked for Review:</Text>
                <Text style={[styles.summaryVal, { color: "#A855F7" }]}>{markedCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Unanswered:</Text>
                <Text style={[styles.summaryVal, { color: colors.danger }]}>{unansweredCount}</Text>
              </View>
            </View>

            <View style={styles.confirmButtons}>
              <Button
                title="Resume Test"
                variant="ghost"
                size="md"
                onPress={() => setSubmitModalVisible(false)}
              />
              <Button
                title={submitting ? "Submitting..." : "Yes, Submit"}
                variant="primary"
                size="md"
                loading={submitting}
                onPress={handleConfirmSubmit}
              />
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
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
  },
  paletteTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  paletteTriggerCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTabs: {
    maxHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTabsContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sectionTabItem: {
    paddingVertical: 10,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 90,
  },
  qMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  qNumLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  markingPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  markingPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  questionStatementBox: {
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioLetter: {
    fontSize: 13,
    fontWeight: "700",
  },
  optionTextWrap: {
    flex: 1,
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  actionIconButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionIconLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  navButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  paletteSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 16,
  },
  paletteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 20,
  },
  paletteGridItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  paletteGridItemText: {
    fontSize: 14,
    fontWeight: "700",
  },
  paletteFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  confirmDialog: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    alignSelf: "center",
    width: "90%",
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  summaryTable: {
    gap: 8,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  durabilityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fef3c7",
  },
  durabilityBannerText: {
    fontSize: 12,
    color: "#92400e",
    flex: 1,
  },
  syncErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
  },
  syncErrorBannerText: {
    fontSize: 12,
    color: "#92400e",
    flex: 1,
  },
  integrityBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fee2e2",
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  integrityBannerText: {
    fontSize: 12,
    color: "#991b1b",
    flex: 1,
  },
  submitErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  submitErrorText: {
    fontSize: 12,
    color: "#991b1b",
    flex: 1,
  },
});
