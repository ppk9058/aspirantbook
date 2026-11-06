// @ts-nocheck
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp, Star, Users, BookOpenCheck, HelpCircle } from "lucide-react-native";
import type { CourseDetailDto } from "@aspirantbook/shared";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Additive v2 blocks for the mobile course detail screen.
 *
 * Every field is optional: a v1 course renders exactly as before because each
 * block returns null when its data is missing. No price or buy UI is added here —
 * the app stays a reader and checkout happens on the website.
 */
export function CourseDetailExtras({
  data,
  lang,
  showSections = true,
}: {
  data: CourseDetailDto;
  lang: "en" | "hi";
  showSections?: boolean;
}) {
  const { colors, tokens } = useTheme();
  const flags = data.sections;

  const pick = (en?: string | null, hi?: string | null) => {
    if (lang === "hi" && hi && hi.trim().length > 0) return hi;
    return en || "";
  };

  const highlights =
    lang === "hi" && (data.aboutHighlightsHi?.length || 0) > 0
      ? data.aboutHighlightsHi || []
      : data.aboutHighlights || [];

  const teachers = data.teachers || [];
  const faqs = data.faqs || [];
  const metrics = data.hero?.metrics || [];
  const rating = data.ratingSummary;
  const syllabus = data.syllabus;

  if (!showSections) return null;

  const showAbout = (flags?.about ?? true) && highlights.length > 0;
  const showHeroMetrics = metrics.length > 0;
  const showTeachers = (flags?.teachers ?? true) && teachers.length > 0;
  const showFaqs = (flags?.questions ?? true) && faqs.length > 0;
  const showRating = (flags?.questions ?? true) && Boolean(rating?.visible);
  const showSyllabus = (flags?.syllabus ?? true) && Boolean(syllabus?.hasSyllabus && syllabus.papers.length > 0);

  if (!showAbout && !showHeroMetrics && !showTeachers && !showFaqs && !showRating && !showSyllabus) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {showHeroMetrics && (
        <View style={styles.metricsGrid}>
          {metrics.slice(0, 4).map((metric, index) => (
            <View
              key={`${metric.label}-${index}`}
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: tokens.radius.lg,
                },
              ]}
            >
              <Text style={[styles.metricValue, { color: colors.primary }]} numberOfLines={1}>
                {pick(metric.value, metric.valueHi)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={2}>
                {pick(metric.label, metric.labelHi)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {showAbout && (
        <Section title="About this course" colors={colors}>
          {highlights.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </Section>
      )}

      {showRating && rating && (
        <Section title="Learner ratings" colors={colors} icon={<Star size={16} color={colors.primary} />}>
          <View style={styles.ratingHeader}>
            <Text style={[styles.ratingAverage, { color: colors.textPrimary }]}>
              {rating.average.toFixed(1)}
            </Text>
            <Text style={[styles.ratingTotal, { color: colors.textMuted }]}>
              / 5 · {rating.total} {rating.total === 1 ? "review" : "reviews"}
            </Text>
          </View>
          {rating.buckets.map((bucket) => (
            <View key={bucket.stars} style={styles.ratingRow}>
              <Text style={[styles.ratingStars, { color: colors.textMuted }]}>{bucket.stars}★</Text>
              <View style={[styles.ratingTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.ratingFill,
                    { width: `${bucket.percent}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={[styles.ratingCount, { color: colors.textMuted }]}>{bucket.count}</Text>
            </View>
          ))}
        </Section>
      )}

      {showSyllabus && syllabus && (
        <Section title="Exam syllabus" colors={colors} icon={<BookOpenCheck size={16} color={colors.primary} />}>
          {syllabus.papers.map((paper) => (
            <View key={paper.id} style={styles.paperBlock}>
              <Text style={[styles.paperTitle, { color: colors.textPrimary }]}>
                {pick(paper.title, paper.titleHi)}
                {paper.marks ? ` · ${paper.marks} marks` : ""}
              </Text>
              {paper.sections.map((section) => (
                <View
                  key={section.id}
                  style={[styles.syllabusRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.syllabusTitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {pick(section.title, section.titleHi)}
                  </Text>
                  <Text style={[styles.syllabusCount, { color: colors.textMuted }]}>
                    {section.totalQuestions > 0 ? `${section.totalQuestions} PYQs` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </Section>
      )}

      {showTeachers && (
        <Section title="Your teachers" colors={colors} icon={<Users size={16} color={colors.primary} />}>
          {teachers.map((teacher, index) => (
            <View
              key={`${teacher.name}-${index}`}
              style={[styles.teacherRow, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                  {(pick(teacher.name, teacher.nameHi) || "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.teacherInfo}>
                <Text style={[styles.teacherName, { color: colors.textPrimary }]}>
                  {pick(teacher.name, teacher.nameHi)}
                </Text>
                {(teacher.role || teacher.qualification) && (
                  <Text style={[styles.teacherMeta, { color: colors.textMuted }]} numberOfLines={2}>
                    {[pick(teacher.role, teacher.roleHi), pick(teacher.qualification, teacher.qualificationHi)]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </Section>
      )}

      {showFaqs && (
        <Section title="FAQs" colors={colors} icon={<HelpCircle size={16} color={colors.primary} />}>
          {faqs.map((faq, index) => (
            <FaqRow key={index} question={pick(faq.question, faq.questionHi)} answer={pick(faq.answer, faq.answerHi)} />
          ))}
        </Section>
      )}
    </View>
  );
}

function Section({
  title,
  children,
  colors,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FaqRow({ question, answer }: { question: string; answer: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faqRow, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => setOpen((value) => !value)}
        activeOpacity={0.7}
        style={styles.faqHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{question}</Text>
        {open ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>
      {open && <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{answer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, marginTop: 4 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, padding: 12 },
  metricValue: { fontSize: 18, fontWeight: "800" },
  metricLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 19 },
  ratingHeader: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  ratingAverage: { fontSize: 24, fontWeight: "800" },
  ratingTotal: { fontSize: 12, fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingStars: { width: 24, fontSize: 11, fontWeight: "700" },
  ratingTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  ratingFill: { height: 6, borderRadius: 3 },
  ratingCount: { width: 24, fontSize: 11, fontWeight: "700", textAlign: "right" },
  paperBlock: { gap: 6, marginBottom: 8 },
  paperTitle: { fontSize: 13, fontWeight: "800" },
  syllabusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  syllabusTitle: { flex: 1, fontSize: 12 },
  syllabusCount: { fontSize: 11, fontWeight: "700" },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 16, fontWeight: "800" },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 13, fontWeight: "800" },
  teacherMeta: { fontSize: 11, marginTop: 1 },
  faqRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 10,
    minHeight: 44,
  },
  faqQuestion: { flex: 1, fontSize: 13, fontWeight: "700" },
  faqAnswer: { fontSize: 12, lineHeight: 18, paddingBottom: 10 },
});
