import React from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Clock, Award, ShieldAlert, CheckCircle2 } from "lucide-react-native";
import { Header } from "@/components/common/Header";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Skeleton } from "@/components/common/Skeleton";
import { api } from "@/lib/api";
import { Storage } from "@/lib/storage";
import { COLORS } from "@/lib/theme";

export default function TestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: test, isLoading } = useQuery({
    queryKey: ["test-detail", id],
    queryFn: async () => {
      const res = await api.getTestDetail(id);
      return res.ok ? res.data : null;
    },
    enabled: Boolean(id),
  });

  const handleStartExam = async () => {
    const token = await Storage.getAccessToken();
    if (!token) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to take this test examination and record your score.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        ]
      );
      return;
    }

    try {
      const res = await api.startAttempt(id);
      if (res.ok && res.data) {
        router.replace({
          pathname: `/tests/[id]/runner`,
          params: { id, attemptId: res.data.attemptId },
        });
      } else {
        Alert.alert("Unable to Start", res.error?.message || "Could not initialize exam attempt.");
      }
    } catch {
      Alert.alert("Error", "Network connection failed. Please retry.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Exam Instructions" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading || !test ? (
          <View>
            <Skeleton height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton height={200} borderRadius={16} />
          </View>
        ) : (
          <>
            <Card style={styles.infoCard}>
              <Text style={styles.seriesName}>{test.series.title}</Text>
              <Text style={styles.testTitle}>{test.title}</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Clock size={18} color={COLORS.primary} />
                  <Text style={styles.statVal}>{test.durationMinutes}m</Text>
                  <Text style={styles.statLbl}>Duration</Text>
                </View>
                <View style={styles.statBox}>
                  <CheckCircle2 size={18} color={COLORS.accent} />
                  <Text style={styles.statVal}>{test.totalQuestions}</Text>
                  <Text style={styles.statLbl}>Questions</Text>
                </View>
                <View style={styles.statBox}>
                  <Award size={18} color="#D97706" />
                  <Text style={styles.statVal}>{test.totalMarks}</Text>
                  <Text style={styles.statLbl}>Total Marks</Text>
                </View>
              </View>

              <View style={styles.markingScheme}>
                <Text style={styles.markingText}>
                  Correct: <Text style={styles.positive}>+{test.positiveMarksPerQuestion}</Text> marks • Incorrect:{" "}
                  <Text style={styles.negative}>-{test.negativeMarksPerQuestion}</Text> marks
                </Text>
              </View>
            </Card>

            <Card style={styles.rulesCard}>
              <View style={styles.rulesHeader}>
                <ShieldAlert size={18} color="#D97706" />
                <Text style={styles.rulesTitle}>Important Instructions</Text>
              </View>
              <Text style={styles.ruleItem}>
                1. The examination timer runs continuously from the server once started.
              </Text>
              <Text style={styles.ruleItem}>
                2. Your selected answers are automatically saved to your device and synchronized in real-time.
              </Text>
              <Text style={styles.ruleItem}>
                3. If network drops occur, you can continue answering offline. Answers will sync automatically when reconnected.
              </Text>
              <Text style={styles.ruleItem}>
                4. Switching apps or backgrounding the test for more than 5 seconds will be recorded as an interruption.
              </Text>
            </Card>

            <Button
              title="I am Ready to Begin"
              onPress={handleStartExam}
              size="lg"
              style={styles.startBtn}
            />
          </>
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
  scroll: {
    padding: 18,
  },
  infoCard: {
    marginBottom: 16,
  },
  seriesName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  statLbl: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  markingScheme: {
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  markingText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "600",
  },
  positive: {
    color: "#16A34A",
    fontWeight: "700",
  },
  negative: {
    color: "#DC2626",
    fontWeight: "700",
  },
  rulesCard: {
    marginBottom: 24,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 6,
  },
  ruleItem: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 8,
  },
  startBtn: {
    marginBottom: 30,
  },
});
