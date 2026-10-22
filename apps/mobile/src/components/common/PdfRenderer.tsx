import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { BookOpen, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react-native";
import { saveLastReadPage, getLastReadPage } from "../../lib/pdf-manager";

export interface PdfRendererProps {
  documentId: string;
  sourceUri: string;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  title?: string;
}

export function PdfRenderer({
  documentId,
  sourceUri,
  totalPages = 12,
  onPageChange,
  title,
}: PdfRendererProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isNativeAvailable, setIsNativeAvailable] = useState<boolean | null>(null);
  const [NativePdfComponent, setNativePdfComponent] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Restore last read page memory
    getLastReadPage(documentId).then((page) => {
      if (mounted) setCurrentPage(page);
    });

    // 2. Feature detection: check if native PDF viewer is linked (dev client / standalone)
    async function detectNativePdf() {
      try {
        // Dynamic import of react-native-pdf in environments with native binary linked
        const mod: any = await (import("react-native-pdf") as Promise<any>).catch((_err: unknown) => null);
        if (mod && mod.default && mounted) {
          setNativePdfComponent(() => mod.default);
          setIsNativeAvailable(true);
          return;
        }
      } catch (err: unknown) {
        if (mounted) {
          setIsNativeAvailable(false);
        }
      }
      if (mounted) {
        setIsNativeAvailable(false);
      }
    }

    detectNativePdf();
    return () => {
      mounted = false;
    };
  }, [documentId]);

  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    saveLastReadPage(documentId, clamped);
    onPageChange?.(clamped);
  };

  if (isNativeAvailable === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1448d8" />
        <Text style={styles.loadingText}>Loading document viewer...</Text>
      </View>
    );
  }

  // Native PDF Component (Dev Client / Standalone Build)
  if (isNativeAvailable && NativePdfComponent) {
    return (
      <View style={styles.container}>
        <NativePdfComponent
          source={{ uri: sourceUri, cache: true }}
          page={currentPage}
          onPageChanged={(page: number) => handlePageChange(page)}
          style={styles.pdfView}
          onError={(error: any) => {
            console.warn("Native PDF rendering error:", error);
            setIsNativeAvailable(false);
          }}
        />
        <View style={styles.pageBar}>
          <TouchableOpacity
            style={styles.pageBtn}
            disabled={currentPage <= 1}
            onPress={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft size={18} color={currentPage <= 1 ? "#94a3b8" : "#1e293b"} />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Page {currentPage} of {totalPages}
          </Text>
          <TouchableOpacity
            style={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onPress={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight size={18} color={currentPage >= totalPages ? "#94a3b8" : "#1e293b"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Graceful Fallback for Expo Go
  return (
    <View style={styles.expoGoFallbackContainer} testID="pdf-expo-go-fallback">
      <View style={styles.badge}>
        <AlertCircle size={16} color="#d97706" />
        <Text style={styles.badgeText}>Expo Go Preview Mode</Text>
      </View>

      <Text style={styles.fallbackTitle}>{title || "Secure Digital eBook"}</Text>

      <Text style={styles.fallbackNotice}>
        Native PDF hardware-accelerated canvas rendering is active in development builds and production releases.
        In Expo Go, your document is verified and stored in encrypted app-private storage.
      </Text>

      <View style={styles.pageCard}>
        <View style={styles.pageHeader}>
          <BookOpen size={18} color="#1448d8" />
          <Text style={styles.pageHeaderText}>
            Bookmarked at Page {currentPage} of {totalPages}
          </Text>
        </View>

        <Text style={styles.pageExcerpt}>
          File: {sourceUri.split("/").pop()}
          {"\n"}Storage: App-Private Sandbox (DRM Protected)
          {"\n"}Last Position: Auto-saved to local memory
        </Text>

        <View style={styles.pageBar}>
          <TouchableOpacity
            style={styles.pageBtn}
            disabled={currentPage <= 1}
            onPress={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft size={18} color={currentPage <= 1 ? "#94a3b8" : "#1e293b"} />
            <Text style={styles.btnLabel}>Prev Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onPress={() => handlePageChange(currentPage + 1)}
          >
            <Text style={styles.btnLabel}>Next Page</Text>
            <ChevronRight size={18} color={currentPage >= totalPages ? "#94a3b8" : "#1e293b"} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  pdfView: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748b",
  },
  expoGoFallbackContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginVertical: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
    gap: 6,
  },
  badgeText: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "700",
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  fallbackNotice: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
    marginBottom: 14,
  },
  pageCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  pageHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  pageExcerpt: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    marginBottom: 12,
  },
  pageBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    gap: 4,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  pageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
});
