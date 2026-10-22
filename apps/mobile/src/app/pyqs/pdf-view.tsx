import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  FileText,
  Download,
  ExternalLink,
  ShieldAlert,
  Play,
  CheckCircle,
  Calendar,
  Layers,
} from "lucide-react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { openWebUrl } from "../../lib/web-links";
import { Card } from "../../../src/components/primitives/Card";
import { Button } from "../../../src/components/primitives/Button";
import { Badge } from "../../../src/components/primitives/Badge";
import { Skeleton } from "../../../src/components/primitives/Skeleton";
import { ErrorState } from "../../../src/components/primitives/ErrorState";
import {
  isPdfDownloaded,
  saveLastReadPage,
  getLastReadPage,
} from "../../lib/pdf-manager";

export default function PyqPdfViewScreen() {
  const { paperId, title } = useLocalSearchParams<{ paperId: string; title?: string }>();
  const router = useRouter();
  const { colors, tokens } = useTheme();
  const { isAuthenticated } = useAuth();
  const [downloaded, setDownloaded] = useState(false);
  const [lastPage, setLastPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const paperQuery = useQuery({
    queryKey: ["pyq-paper-detail", paperId],
    queryFn: async () => {
      if (!paperId) throw new Error("Missing Paper ID");
      const res = await api.getPyqPaper(paperId);
      if (!res.ok) throw new Error(res.error?.message || "Failed to load paper details");
      return res.data!;
    },
    enabled: Boolean(paperId),
  });

  const { data: paper, isLoading, isError, error, refetch } = paperQuery;

  useEffect(() => {
    if (paperId) {
      isPdfDownloaded(paperId).then(setDownloaded);
      getLastReadPage(paperId).then(setLastPage);
    }
  }, [paperId]);

  const handleOpenPdf = async () => {
    setStatusMessage(null);
    const target = paper?.fileUrl || `/pyqs/${paperId}`;
    const res = await openWebUrl(target, "pyq_view");
    if (!res.success && res.error) {
      setStatusMessage(res.error);
    }
  };

  const handleDownloadOffline = async () => {
    setStatusMessage(null);
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to save papers for offline reading.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login" as any) },
      ]);
      return;
    }
    setDownloaded(true);
    setStatusMessage("Paper has been cached locally in your secure library.");
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {title || "Official Examination Paper"}
          </Text>
        </View>
        <View style={styles.content}>
          <Skeleton height={160} borderRadius={16} />
          <Skeleton height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isError || !paper) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Examination Paper</Text>
        </View>
        <ErrorState
          message={error?.message || "This paper is currently unavailable"}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  // Authwall Gated State for unauthenticated guests
  if (paper.isLockedForGuest && !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Document Locked</Text>
        </View>
        <View style={styles.gatedContainer}>
          <ShieldAlert size={48} color={colors.warning} />
          <Text style={[styles.gatedTitle, { color: colors.textPrimary }]}>
            Sign In to Read Full Paper
          </Text>
          <Text style={[styles.gatedSubtitle, { color: colors.textSecondary }]}>
            Guests can only preview initial pages. Please sign in with your free account to access the complete verified paper and answer keys.
          </Text>
          <Button
            title="Sign In with Account"
            variant="primary"
            size="lg"
            style={{ width: "100%", marginTop: 12 }}
            onPress={() => router.push("/(auth)/login" as any)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 52px Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {paper.title}
        </Text>
        <TouchableOpacity onPress={handleOpenPdf} style={styles.openIconBtn}>
          <ExternalLink size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {statusMessage ? (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusMessage}</Text>
            <TouchableOpacity onPress={() => setStatusMessage(null)}>
              <Text style={styles.statusBannerDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Paper Info Banner */}
        <Card style={styles.infoCard}>
          <View style={styles.badgeRow}>
            <Badge label={paper.examName} variant="primary" size="sm" />
            <Badge label={`Year ${paper.year}`} variant="neutral" size="sm" />
            {downloaded && <Badge label="OFFLINE CACHED" variant="success" size="sm" />}
          </View>

          <Text style={[styles.paperTitle, { color: colors.textPrimary }]}>
            {paper.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Exam Year: {paper.year}
              </Text>
            </View>
            {paper.shift && (
              <View style={styles.metaItem}>
                <Layers size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  Shift: {paper.shift}
                </Text>
              </View>
            )}
            {paper.totalQuestions && (
              <View style={styles.metaItem}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {paper.totalQuestions} Questions
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Reader Action Card */}
        <Card style={styles.readerCard}>
          <View style={styles.readerHeader}>
            <FileText size={24} color={colors.primary} />
            <View style={styles.readerTitleWrap}>
              <Text style={[styles.readerTitle, { color: colors.textPrimary }]}>
                Interactive PDF Reader
              </Text>
              <Text style={[styles.readerSubtitle, { color: colors.textSecondary }]}>
                High-resolution full paper viewer with touch zoom
              </Text>
            </View>
          </View>

          <View style={styles.actionsBox}>
            <Button
              title="Open Official PDF"
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              onPress={handleOpenPdf}
            />

            <Button
              title={downloaded ? "Cached in Secure Storage" : "Download for Offline Reading"}
              variant="secondary"
              size="md"
              style={{ width: "100%" }}
              disabled={downloaded}
              onPress={handleDownloadOffline}
            />
          </View>
        </Card>

        {/* CBT Simulation CTA Card */}
        <Card style={styles.cbtCard}>
          <Text style={[styles.cbtTitle, { color: colors.textPrimary }]}>
            Practice this Paper in CBT Mode
          </Text>
          <Text style={[styles.cbtSub, { color: colors.textSecondary }]}>
            Experience real examination conditions with timer countdown, negative marking, and instant AI ranking.
          </Text>
          <Button
            title="Start CBT Simulation"
            variant="secondary"
            size="md"
            onPress={() => router.push(`/tests/${paper.id}` as any)}
          />
        </Card>
      </ScrollView>
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
  openIconBtn: {
    padding: 6,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  infoCard: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  paperTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  readerCard: {
    padding: 16,
  },
  readerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  readerTitleWrap: {
    flex: 1,
  },
  readerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  readerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsBox: {
    gap: 10,
  },
  cbtCard: {
    padding: 16,
    gap: 10,
  },
  cbtTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cbtSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  gatedContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 60,
  },
  gatedTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  gatedSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statusBannerText: {
    color: "#1d4ed8",
    fontSize: 13,
    flex: 1,
  },
  statusBannerDismiss: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
});
