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
import { BookCheck, FileText } from "lucide-react-native";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function LibraryScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["library-books"],
    queryFn: async () => {
      const res = await api.getLibrary();
      return res.ok ? res.data || [] : [];
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Library</Text>
        <Text style={styles.screenSubtitle}>
          Your digital eBooks and revision materials.
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
            <Skeleton height={80} borderRadius={16} style={{ marginBottom: 12 }} />
            <Skeleton height={80} borderRadius={16} />
          </View>
        ) : data && data.length > 0 ? (
          data.map((book) => (
            <Card key={book.id} style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.iconCircle}>
                  <FileText size={22} color={COLORS.primary} />
                </View>
                <View style={styles.textDetails}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={styles.authorText}>{book.author}</Text>
                  <Text style={styles.sizeText}>
                    {(book.fileSize / 1024 / 1024).toFixed(1)} MB • Digital Edition
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.readBtn}
                  onPress={() => router.push(`/reader/${book.id}`)}
                >
                  <Text style={styles.readBtnText}>Read PDF</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <BookCheck size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptySubtitle}>
              Acquired and free books will appear here for fast reading.
            </Text>
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
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  authorText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  sizeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  readBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 10,
  },
  readBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
});
