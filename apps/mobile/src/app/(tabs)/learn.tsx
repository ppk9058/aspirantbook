import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers } from "lucide-react-native";
import { pluralize } from "../../lib/formatters";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function LearnScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["learn-tutorials"],
    queryFn: async () => {
      const res = await api.getTutorials();
      return res.ok ? res.data || [] : [];
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Tutorials & Courses</Text>
        <Text style={styles.screenSubtitle}>
          Structured, interactive learning guides and chapters.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View>
            <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={110} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={110} borderRadius={16} />
          </View>
        ) : data && data.length > 0 ? (
          data.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View style={styles.badgeRow}>
                <Text style={styles.categoryBadge}>{item.category}</Text>
                {item.isGated ? (
                  <Text style={styles.gatedTag}>FREE PREVIEW</Text>
                ) : (
                  <Text style={styles.freeTag}>FREE</Text>
                )}
              </View>

              <Text style={styles.tutorialTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.tutorialDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.footerRow}>
                <View style={styles.metaInfo}>
                  <Layers size={13} color="#64748B" />
                  <Text style={styles.metaText}>
                    {pluralize(item.chaptersCount, "Chapter")} • {pluralize(item.lessonsCount, "Lesson")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => router.push(`/tutorials/${item.slug}`)}
                >
                  <Text style={styles.openBtnText}>Start Reading</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <BookOpen size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No tutorials available</Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 14,
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
  },
  scroll: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  gatedTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  tutorialDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 5,
  },
  openBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
});
