// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { CourseDetailExtras } from "../../components/course/CourseDetailExtras";
import type { CourseDetailDto } from "@aspirantbook/shared";
import { useTheme } from "../../theme/ThemeProvider";

export default function CourseDetailScreen({
  route,
  navigation,
}: {
  route?: { params?: { id?: string } };
  navigation?: any;
}) {
  const courseId = route?.params?.id || "";
  const [data, setData] = useState<CourseDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [activeTab, setActiveTab] = useState<string>("plan");
  const { colors } = useTheme();

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchCourse() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/courses/${courseId}?lang=${lang}`);
        if (!res.ok) throw new Error(`Course fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json.data || json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load course");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCourse();
    return () => {
      cancelled = true;
    };
  }, [courseId, lang]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Course not found</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textMuted }]}>
            {error || "Unable to display this course."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { course, units, chapters } = data;
  const isHi = lang === "hi";
  const title = (isHi && course.titleHi) || course.title;
  const subtitle = (isHi && course.subtitleHi) || course.subtitle;

  // Course theme tokens with defaults
  const theme = {
    navy: data.theme?.navy || "#1B1F4A",
    navyLight: data.theme?.navyLight || "#252B5C",
    gold: data.theme?.gold || "#F5C842",
    cream: data.theme?.cream || "#F0EAD9",
    creamDark: data.theme?.creamDark || "#FAF5E8",
    olive: data.theme?.olive || "#3A3510",
    ink: data.theme?.ink || "#1E1A0F",
  };

  const isFree = course.isFree || course.price === 0;
  const priceDisplay = isFree ? (isHi ? "निःशुल्क" : "FREE") : `₹${(course.price || 0).toLocaleString("en-IN")}`;
  const enrollLabel = isHi
    ? data.enrollCtaLabelHi || data.enrollCtaLabel || "अभी जुड़ें"
    : data.enrollCtaLabel || (isFree ? "Start free" : "Enroll now");

  const tabList = [
    { id: "about", label: isHi ? "परिचय" : "About" },
    { id: "plan", label: isHi ? "प्लान" : "Course plan" },
    { id: "lectures", label: isHi ? "लेक्चर्स" : "Lectures" },
    { id: "syllabus", label: isHi ? "सिलेबस" : "Syllabus" },
    { id: "teachers", label: isHi ? "शिक्षक" : "Teachers" },
    { id: "faqs", label: isHi ? "सवाल" : "Questions" },
  ];

  const brandName = data.brand || data.metadata?.brand || process.env.EXPO_PUBLIC_BRAND_NAME || "TrillionSkill";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.cream }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.navy }]}>
          <View style={styles.langSwitchRow}>
            <Text style={[styles.brandText, { color: theme.gold }]}>{brandName}</Text>
            <TouchableOpacity
              onPress={() => setLang(lang === "en" ? "hi" : "en")}
              style={styles.langPill}
            >
              <Text style={styles.langPillText}>{lang === "en" ? "हिन्दी" : "English"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}

          {data.hero?.instructor && (
            <View style={styles.heroTeacherRow}>
              <View style={[styles.heroTeacherAvatar, { backgroundColor: theme.gold }]}>
                <Text style={[styles.heroTeacherAvatarText, { color: theme.navy }]}>
                  {data.hero.instructor.name?.charAt(0) || "T"}
                </Text>
              </View>
              <View>
                <Text style={styles.heroTeacherName}>
                  {isHi ? "शिक्षक: " : "Taught by "}
                  {isHi && data.hero.instructor.nameHi ? data.hero.instructor.nameHi : data.hero.instructor.name}
                </Text>
                {data.hero.instructor.role && (
                  <Text style={styles.heroTeacherRole}>{data.hero.instructor.role}</Text>
                )}
              </View>
            </View>
          )}

          {data.hero?.lateJoinerText && (
            <View style={styles.lateJoinBox}>
              <Text style={[styles.lateJoinGold, { color: theme.gold }]}>
                {isHi ? "देर से जुड़ रहे हैं? " : "Joining late? "}
              </Text>
              <Text style={styles.lateJoinText}>
                {isHi && data.hero.lateJoinerTextHi ? data.hero.lateJoinerTextHi : data.hero.lateJoinerText}
              </Text>
            </View>
          )}
        </View>

        {/* Tab Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabList.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabPill,
                activeTab === tab.id
                  ? { backgroundColor: theme.olive, borderColor: theme.olive }
                  : { backgroundColor: theme.creamDark, borderColor: "#EAE3CC" },
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === tab.id ? styles.tabPillTextActive : { color: theme.olive },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Vertical Snake Plan */}
        {activeTab === "plan" && (
          <View style={styles.planSection}>
            <Text style={[styles.planHeading, { color: theme.ink }]}>
              {isHi ? "कोर्स प्लान" : "Course plan"}
            </Text>
            <Text style={styles.planSubheading}>
              {units?.length || chapters?.length || 0} {isHi ? "यूनिट्स" : "units"}
            </Text>

            <View style={styles.verticalTimeline}>
              {(units && units.length > 0 ? units : chapters).map((unit: any, idx: number) => (
                <View key={unit.id || idx} style={styles.unitTimelineRow}>
                  <View style={styles.timelineNumberCol}>
                    <View style={[styles.timelineCircle, { backgroundColor: theme.creamDark, borderColor: theme.ink }]}>
                      <Text style={[styles.timelineCircleText, { color: theme.ink }]}>
                        {String(idx + 1).padStart(2, "0")}
                      </Text>
                    </View>
                    {idx < (units?.length || chapters?.length || 0) - 1 && (
                      <View style={[styles.timelineDottedLine, { borderColor: theme.olive }]} />
                    )}
                  </View>
                  <View style={[styles.unitTimelineCard, { backgroundColor: theme.creamDark, borderColor: "#EAE3CC" }]}>
                    <Text style={[styles.unitTimelineTitle, { color: theme.ink }]}>
                      {(isHi && unit.titleHi) || unit.title}
                    </Text>
                    {unit.tag && (
                      <View style={styles.tagBadge}>
                        <Text style={[styles.tagBadgeText, { color: theme.olive }]}>{unit.tag}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Lectures Tab View */}
        {activeTab === "lectures" && (
          <View style={styles.planSection}>
            <Text style={[styles.planHeading, { color: theme.ink }]}>
              {isHi ? "लेक्चर्स" : "Course Lectures"}
            </Text>
            <Text style={styles.planSubheading}>
              {chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0)} {isHi ? "कक्षाएं" : "lectures"}
            </Text>

            <View style={{ gap: 12 }}>
              {chapters.map((ch, chIdx) => (
                <View key={ch.id || chIdx} style={[styles.unitTimelineCard, { backgroundColor: theme.creamDark }]}>
                  <Text style={[styles.unitTimelineTitle, { color: theme.ink, marginBottom: 8 }]}>
                    {(isHi && ch.titleHi) || ch.title}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {(ch.lessons || []).map((lesson, lIdx) => (
                      <View key={lesson.id || lIdx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: theme.ink, flex: 1 }}>
                          {(isHi && lesson.titleHi) || lesson.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#71717A", marginLeft: 8 }}>
                          {lesson.isTrial ? (isHi ? "मुफ्त" : "Trial") : lesson.isLocked ? "🔒" : "▶"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Extras: About, Syllabus, Teachers, FAQs, Ratings */}
        {activeTab !== "plan" && activeTab !== "lectures" && (
          <CourseDetailExtras data={data} lang={lang} activeTab={activeTab} />
        )}
      </ScrollView>

      {/* Sticky Bottom Bar with Price + Enroll Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.creamDark, borderTopColor: "#EAE3CC" }]}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#71717A", textTransform: "uppercase" }}>
            {isHi ? "कुल शुल्क" : "Total Fee"}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.ink }}>
            {priceDisplay}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.enrollButton, { backgroundColor: theme.gold }]}
          onPress={() => {
            // Mobile navigation to checkout / trial
            if (navigation) {
              navigation.navigate("Checkout", { courseId: course.id });
            }
          }}
        >
          <Text style={[styles.enrollButtonText, { color: theme.ink }]}>
            {enrollLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: "600" },
  errorTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  errorSubtitle: { fontSize: 13, textAlign: "center" },
  scrollContent: { paddingBottom: 100 },
  heroCard: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  langSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  langPill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", lineHeight: 30 },
  heroSubtitle: { color: "#E0E3F0", fontSize: 13, marginTop: 6, lineHeight: 18 },
  heroTeacherRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  heroTeacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroTeacherAvatarText: { fontWeight: "800", fontSize: 16 },
  heroTeacherName: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  heroTeacherRole: { color: "#BAC1DF", fontSize: 11 },
  lateJoinBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  lateJoinGold: { fontWeight: "800", fontSize: 12 },
  lateJoinText: { color: "#FFFFFF", fontSize: 12 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: { fontSize: 12, fontWeight: "700" },
  tabPillTextActive: { color: "#FFFFFF" },
  planSection: { padding: 16 },
  planHeading: { fontSize: 20, fontWeight: "800" },
  planSubheading: { fontSize: 12, color: "#71717A", marginTop: 2, marginBottom: 16 },
  verticalTimeline: { paddingLeft: 8 },
  unitTimelineRow: { flexDirection: "row", gap: 12, minHeight: 64 },
  timelineNumberCol: { alignItems: "center", width: 32 },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCircleText: { fontSize: 11, fontWeight: "800" },
  timelineDottedLine: {
    flex: 1,
    width: 2,
    borderStyle: "dashed",
    borderWidth: 1,
    marginVertical: 4,
  },
  unitTimelineCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  unitTimelineTitle: { fontSize: 14, fontWeight: "700" },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EAE3CC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  tagBadgeText: { fontSize: 10, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  enrollButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  enrollButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
