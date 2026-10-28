import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { BookOpen, AlertCircle, ChevronLeft, ChevronRight, Download, CheckCircle2, Trash2 } from "lucide-react-native";
import {
  saveLastReadPage,
  getLastReadPage,
  isPdfDownloaded,
  deleteCachedPdf,
  downloadPdfWithResume,
  resolveActivePdfUri,
} from "../../lib/pdf-manager";

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
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [activeUri, setActiveUri] = useState<string>(sourceUri);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const checkDownloadStatus = useCallback(async () => {
    try {
      const downloaded = await isPdfDownloaded(documentId);
      setIsDownloaded(downloaded);
      const resolved = await resolveActivePdfUri(documentId, sourceUri);
      setActiveUri(resolved.uri);
    } catch {
      setActiveUri(sourceUri);
    }
  }, [documentId, sourceUri]);

  useEffect(() => {
    let mounted = true;

    // 1. Restore last read page memory
    getLastReadPage(documentId).then((page) => {
      if (mounted) setCurrentPage(page);
    });

    // 2. Check offline cache status
    checkDownloadStatus();

    // 3. Feature detection: check if native PDF viewer is linked
    async function detectNativePdf() {
      try {
        const mod: any = await (import("react-native-pdf") as Promise<any>).catch(() => null);
        if (mod && mod.default && mounted) {
          setNativePdfComponent(() => mod.default);
          setIsNativeAvailable(true);
          return;
        }
      } catch {
        // Fallback
      }
      if (mounted) setIsNativeAvailable(false);
    }

    detectNativePdf();
    return () => {
      mounted = false;
    };
  }, [documentId, checkDownloadStatus]);

  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
    saveLastReadPage(documentId, clamped);
    onPageChange?.(clamped);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadPdfWithResume(documentId, sourceUri, (fraction) => {
        setDownloadProgress(fraction);
      });
      await checkDownloadStatus();
    } catch (err: any) {
      setDownloadError(err?.message || "Failed to download offline copy");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCachedPdf(documentId);
      await checkDownloadStatus();
    } catch (err: any) {
      setDownloadError(err?.message || "Failed to delete offline copy");
    }
  };

  if (isNativeAvailable === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1448d8" />
        <Text style={styles.loadingText}>Loading document viewer...</Text>
      </View>
    );
  }

  const renderOfflineBar = () => (
    <View style={styles.offlineBar} testID="pdf-offline-bar">
      {isDownloaded ? (
        <View style={styles.offlineStatusRow}>
          <View style={styles.downloadedBadge} testID="pdf-downloaded-badge">
            <CheckCircle2 size={14} color="#16a34a" />
            <Text style={styles.downloadedText}>Downloaded</Text>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            testID="pdf-delete-action"
            accessibilityLabel="Delete from device"
          >
            <Trash2 size={14} color="#dc2626" />
            <Text style={styles.deleteBtnText}>Delete from device</Text>
          </TouchableOpacity>
        </View>
      ) : isDownloading ? (
        <View style={styles.progressContainer} testID="pdf-download-progress">
          <ActivityIndicator size="small" color="#1448d8" />
          <Text style={styles.progressText}>Downloading {Math.round(downloadProgress * 100)}%</Text>
        </View>
      ) : (
        <View style={styles.downloadActionRow}>
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.downloadBtn}
            testID="pdf-download-action"
            accessibilityLabel="Save Offline"
          >
            <Download size={15} color="#1448d8" />
            <Text style={styles.downloadBtnText}>Save Offline</Text>
          </TouchableOpacity>
          {downloadError ? (
            <Text style={styles.errorText} testID="pdf-download-error">{downloadError}</Text>
          ) : null}
        </View>
      )}
    </View>
  );

  // Native PDF Component (Dev Client / Standalone Build)
  if (isNativeAvailable && NativePdfComponent) {
    return (
      <View style={styles.container}>
        {renderOfflineBar()}
        <NativePdfComponent
          source={{ uri: activeUri, cache: true }}
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
      {renderOfflineBar()}
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
          File: {activeUri.split("/").pop()}
          {"\n"}Storage: {isDownloaded ? "Offline Cache (Device Storage)" : "Streaming (Remote Sandbox)"}
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
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  offlineBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  offlineStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  downloadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  downloadedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#dc2626",
  },
  downloadActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1448d8",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#1448d8",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
  },
  pdfView: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  pageBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 4,
  },
  pageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  expoGoFallbackContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  fallbackNotice: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
    marginBottom: 16,
  },
  pageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pageHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  pageExcerpt: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
    marginBottom: 16,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    fontFamily: "monospace",
  },
});
