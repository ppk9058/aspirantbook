import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, CheckCircle2 } from "lucide-react-native";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { AvailableOnWebsiteModal } from "@/components/common/AvailableOnWebsiteModal";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";
import { pluralize } from "../../lib/formatters";

type PracticeTab = "tests" | "pyq" | "ca";

export default function PracticeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PracticeTab>("tests");
  const [modalItem, setModalItem] = useState<{ visible: boolean; title: string }>({
    visible: false,
    title: "",
  });

  // 1. Tests Query
  const testsQuery = useQuery({
    queryKey: ["practice-tests"],
    queryFn: async () => {
      const res = await api.getTests();
      return res.ok ? res.data?.items || [] : [];
    },
  });

  // 2. PYQ Query
  const pyqQuery = useQuery({
    queryKey: ["practice-pyq"],
    queryFn: async () => {
      const res = await api.getPyqExams();
      return res.ok ? res.data || [] : [];
    },
  });

  // 3. Current Affairs Query
  const caQuery = useQuery({
    queryKey: ["practice-ca"],
    queryFn: async () => {
      const res = await api.getCurrentAffairs();
      return res.ok ? res.data || [] : [];
    },
  });

  const isLoading =
    activeTab === "tests"
      ? testsQuery.isLoading
      : activeTab === "pyq"
      ? pyqQuery.isLoading
      : caQuery.isLoading;

  const isRefetching =
    activeTab === "tests"
      ? testsQuery.isRefetching
      : activeTab === "pyq"
      ? pyqQuery.isRefetching
      : caQuery.isRefetching;

  const handleRefresh = () => {
    if (activeTab === "tests") testsQuery.refetch();
    else if (activeTab === "pyq") pyqQuery.refetch();
    else caQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Practice Hub</Text>
        <Text style={styles.screenSubtitle}>
          Take full mock examinations, previous year papers, and quizzes.
        </Text>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "tests" && styles.tabItemActive]}
            onPress={() => setActiveTab("tests")}
          >
            <Text
              style={[styles.tabText, activeTab === "tests" && styles.tabTextActive]}
            >
              Mock Tests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "pyq" && styles.tabItemActive]}
            onPress={() => setActiveTab("pyq")}
          >
            <Text
              style={[styles.tabText, activeTab === "pyq" && styles.tabTextActive]}
            >
              PYQ Papers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "ca" && styles.tabItemActive]}
            onPress={() => setActiveTab("ca")}
          >
            <Text
              style={[styles.tabText, activeTab === "ca" && styles.tabTextActive]}
            >
              Current Affairs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <Skeleton height={90} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={90} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={90} borderRadius={16} />
          </View>
        ) : activeTab === "tests" ? (
          testsQuery.data && testsQuery.data.length > 0 ? (
            testsQuery.data.map((t) => (
              <Card key={t.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.seriesLabel}>{t.seriesTitle || "MOCK EXAM"}</Text>
                  {t.isFree ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE TEST</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.itemTitle}>{t.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={13} color="#64748B" />
                    <Text style={styles.metaText}>{pluralize(t.durationMinutes, "min")}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <CheckCircle2 size={13} color="#64748B" />
                    <Text style={styles.metaText}>{pluralize(t.totalQuestions, "Question")}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaText}>{pluralize(t.totalMarks, "Mark")}</Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => router.push(`/tests/${t.id}`)}
                  >
                    <Text style={styles.detailsBtnText}>Start Test</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No mock tests available.</Text>
            </View>
          )
        ) : activeTab === "pyq" ? (
          pyqQuery.data && pyqQuery.data.length > 0 ? (
            pyqQuery.data.map((exam) => (
              <Card key={exam.id} style={styles.card}>
                <Text style={styles.seriesLabel}>PREVIOUS YEAR EXAM</Text>
                <Text style={styles.itemTitle}>{exam.name}</Text>
                <Text style={styles.metaText}>
                  {exam.totalPapers} Official Papers with Answers
                </Text>
                <TouchableOpacity
                  style={[styles.detailsBtn, { marginTop: 12 }]}
                  onPress={() => {
                    // Open reader or paper detail
                    router.push(`/reader/${exam.id}`);
                  }}
                >
                  <Text style={styles.detailsBtnText}>Explore Papers</Text>
                </TouchableOpacity>
              </Card>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No PYQ exams found.</Text>
            </View>
          )
        ) : caQuery.data && caQuery.data.length > 0 ? (
          caQuery.data.map((ca) => (
            <Card key={ca.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.seriesLabel}>MONTHLY DIGEST</Text>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>READ FREE</Text>
                </View>
              </View>
              <Text style={styles.itemTitle}>{ca.title}</Text>
              <Text style={styles.metaText}>
                Month {ca.month}, {ca.year} • {ca.quizCount} Practice Questions
              </Text>
              <TouchableOpacity
                style={[styles.detailsBtn, { marginTop: 12 }]}
                onPress={() => router.push(`/reader/${ca.id}`)}
              >
                <Text style={styles.detailsBtnText}>Read Magazine PDF</Text>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No current affairs issues found.</Text>
          </View>
        )}
      </ScrollView>

      <AvailableOnWebsiteModal
        visible={modalItem.visible}
        onClose={() => setModalItem({ visible: false, title: "" })}
        itemTitle={modalItem.title}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  scroll: {
    padding: 16,
  },
  loadingBox: {
    marginTop: 8,
  },
  card: {
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  seriesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  freeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    alignItems: "flex-end",
  },
  detailsBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});
