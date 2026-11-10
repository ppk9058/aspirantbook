import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  Lightbulb,
  Check,
  X,
  Languages,
} from "lucide-react-native";
import { useTheme } from "../../../theme/ThemeProvider";
import { api } from "../../../lib/api";
import { Card } from "../../../components/primitives/Card";
import { Chip } from "../../../components/primitives/Chip";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import { Skeleton } from "../../../components/primitives/Skeleton";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { ErrorState } from "../../../components/primitives/ErrorState";
import { MathRenderer } from "../../../components/exam/MathRenderer";
import { AttemptSolutionsDto, QuestionSolutionDto } from "@aspirantbook/shared";

type SolutionFilter = "ALL" | "CORRECT" | "INCORRECT" | "SKIPPED";

export default function SolutionsScreen() {
  const { id: testId, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solutionsData, setSolutionsData] = useState<AttemptSolutionsDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<SolutionFilter>("ALL");
  const [lang, setLang] = useState<"EN" | "HI">("EN");

  const fetchSolutions = async () => {
    if (!attemptId) {
      setErrorMsg("Missing attempt identifier");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getAttemptSolutions(attemptId);
      if (res.ok && res.data) {
        setSolutionsData(res.data);
      } else {
        setErrorMsg(res.error?.message || "Could not retrieve solutions");
      }
    } catch {
      setErrorMsg("Network connection error. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [attemptId]);

  const allQuestions = solutionsData?.questions || [];

  const filteredQuestions = useMemo(() => {
    if (filter === "ALL") return allQuestions;
    if (filter === "CORRECT") return allQuestions.filter((q) => q.isCorrect);
    if (filter === "INCORRECT")
      return allQuestions.filter((q) => Boolean(q.selectedOption) && !q.isCorrect);
    if (filter === "SKIPPED") return allQuestions.filter((q) => !q.selectedOption);
    return allQuestions;
  }, [allQuestions, filter]);

  const currentQ = filteredQuestions[currentIndex] || filteredQuestions[0];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, paddingTop: insets.top, height: 52 + insets.top },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Solutions</Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={60} borderRadius={10} />
          <Skeleton height={140} borderRadius={16} />
          <Skeleton height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (errorMsg || !solutionsData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, paddingTop: insets.top, height: 52 + insets.top },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Solutions</Text>
        </View>
        <ErrorState
          message={errorMsg || "Solutions are available only after submitting the test"}
          onRetry={fetchSolutions}
        />
      </View>
    );
  }

  const qText = lang === "HI" && currentQ?.textHi ? currentQ.textHi : currentQ?.textEn || "";
  const explanationText =
    lang === "HI" && currentQ?.explanationHi ? currentQ.explanationHi : currentQ?.explanationEn || "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 52px Top Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, paddingTop: insets.top, height: 52 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Solutions & Explanations
        </Text>
        {currentQ?.textHi ? (
          <TouchableOpacity
            onPress={() => setLang(lang === "EN" ? "HI" : "EN")}
            style={[styles.langBtn, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Text style={[styles.langText, { color: colors.primary }]}>{lang}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips Bar — horizontally scrollable so all chips stay reachable
          on 320-360px devices instead of being pushed off-screen. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterBarContent}
      >
        <Chip
          label="All"
          selected={filter === "ALL"}
          onPress={() => {
            setFilter("ALL");
            setCurrentIndex(0);
          }}
        />
        <Chip
          label="Correct"
          selected={filter === "CORRECT"}
          onPress={() => {
            setFilter("CORRECT");
            setCurrentIndex(0);
          }}
        />
        <Chip
          label="Incorrect"
          selected={filter === "INCORRECT"}
          onPress={() => {
            setFilter("INCORRECT");
            setCurrentIndex(0);
          }}
        />
        <Chip
          label="Skipped"
          selected={filter === "SKIPPED"}
          onPress={() => {
            setFilter("SKIPPED");
            setCurrentIndex(0);
          }}
        />
      </ScrollView>

      {filteredQuestions.length === 0 ? (
        <EmptyState
          title="No Questions Match Filter"
          description="There are no questions in this attempt matching your filter selection."
          actionTitle="Show All Questions"
          onAction={() => {
            setFilter("ALL");
            setCurrentIndex(0);
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 80 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Status Banner */}
          <View style={styles.qHeaderRow}>
            <Text
              style={[styles.qNumLabel, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              Question {currentQ.questionNumber} of {allQuestions.length}
            </Text>
            {currentQ.isCorrect ? (
              <Badge label="CORRECT (+marks)" variant="success" size="sm" />
            ) : currentQ.selectedOption ? (
              <Badge label="INCORRECT" variant="danger" size="sm" />
            ) : (
              <Badge label="NOT ATTEMPTED" variant="neutral" size="sm" />
            )}
          </View>

          {/* Question Statement */}
          <Card style={styles.questionCard}>
            <MathRenderer text={qText} fontSize={16} />
          </Card>

          {/* Options with Answer Verification */}
          <View style={styles.optionsList}>
            {currentQ.optionsEn.map((optTextEn, idx) => {
              const optId = String.fromCharCode(65 + idx);
              const isCorrectOpt = optId === currentQ.correctOption;
              const isUserChoice = optId === currentQ.selectedOption;
              const optText =
                lang === "HI" && currentQ.optionsHi && currentQ.optionsHi[idx]
                  ? currentQ.optionsHi[idx]
                  : optTextEn;

              let borderColor = colors.border;
              let bgColor = colors.surface;
              if (isCorrectOpt) {
                borderColor = colors.success;
                bgColor = "rgba(16, 185, 129, 0.1)";
              } else if (isUserChoice && !currentQ.isCorrect) {
                borderColor = colors.danger;
                bgColor = "rgba(239, 68, 68, 0.1)";
              }

              return (
                <View
                  key={optId}
                  style={[
                    styles.optionItem,
                    {
                      borderColor,
                      backgroundColor: bgColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionBadge,
                      {
                        backgroundColor: isCorrectOpt
                          ? colors.success
                          : isUserChoice
                          ? colors.danger
                          : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetter,
                        {
                          color: isCorrectOpt || isUserChoice ? "#FFFFFF" : colors.textSecondary,
                        },
                      ]}
                    >
                      {optId}
                    </Text>
                  </View>

                  <View style={styles.optionTextWrap}>
                    <MathRenderer text={optText} fontSize={15} />
                  </View>

                  {isCorrectOpt && (
                    <View style={styles.resultIconWrap}>
                      <Check size={18} color={colors.success} />
                    </View>
                  )}
                  {isUserChoice && !isCorrectOpt && (
                    <View style={styles.resultIconWrap}>
                      <X size={18} color={colors.danger} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Detailed Solution / Explanation Card */}
          <Card style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <Lightbulb size={20} color={colors.warning} />
              <Text style={[styles.explanationTitle, { color: colors.textPrimary }]}>
                Detailed Solution & Explanation
              </Text>
            </View>

            {explanationText ? (
              <MathRenderer text={explanationText} fontSize={14} style={styles.explanationBody} />
            ) : (
              <Text style={[styles.noExplanation, { color: colors.textMuted }]}>
                No extended explanation was provided for this question.
              </Text>
            )}
          </Card>
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      {filteredQuestions.length > 0 && (
        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: 56 + insets.bottom,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <Button
            title="Previous"
            variant="ghost"
            size="md"
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          />

          <Text style={[styles.navCounter, { color: colors.textSecondary }]}>
            {currentIndex + 1} / {filteredQuestions.length}
          </Text>

          <Button
            title="Next"
            variant="primary"
            size="md"
            disabled={currentIndex >= filteredQuestions.length - 1}
            onPress={() =>
              setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))
            }
          />
        </View>
      )}
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
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  filterBar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterBarContent: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  qHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  qNumLabel: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  questionCard: {
    padding: 16,
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: "700",
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  resultIconWrap: {
    marginLeft: 8,
    marginTop: 3,
    flexShrink: 0,
  },
  explanationCard: {
    padding: 16,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  explanationBody: {
    lineHeight: 22,
  },
  noExplanation: {
    fontSize: 13,
    fontStyle: "italic",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  navCounter: {
    fontSize: 13,
    fontWeight: "600",
  },
});
