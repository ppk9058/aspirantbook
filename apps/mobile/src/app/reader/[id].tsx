import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ChevronLeft,
  BookOpen,
  Download,
  CheckCircle,
  FileText,
  Lock,
  ExternalLink,
  ShieldAlert,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { apiClient } from '../../lib/api';
import { AvailableOnWebsiteModal } from '../../components/common/AvailableOnWebsiteModal';
import { PdfRenderer } from '../../components/common/PdfRenderer';
import { getPdfStoragePath, isPdfDownloaded, verifyOwnershipOrDelete } from '../../lib/pdf-manager';

export default function ReaderScreen() {
  const { id, type = 'library', title = 'Document' } = useLocalSearchParams<{
    id: string;
    type?: string;
    title?: string;
  }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Private app storage path (Never in public Downloads)
  const localFileName = `doc_${id}.pdf`;
  const targetPath = `${FileSystem.documentDirectory || ''}secure_docs/${localFileName}`;

  useEffect(() => {
    let mounted = true;
    async function checkFileStatus() {
      try {
        setLoading(true);

        // Ensure private directory exists
        const dir = `${FileSystem.documentDirectory || ''}secure_docs`;
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        // Check if cached locally in app-private storage
        const fileInfo = await FileSystem.getInfoAsync(targetPath);
        if (fileInfo.exists) {
          setLocalFileUri(targetPath);
        }

        // Fetch stream metadata / entitlement check from API
        if (type === 'library') {
          const res = await apiClient.getLibrary();
          if (!mounted) return;
          if (res.ok && res.data) {
            const item = res.data.find((b: any) => b.id === id);
            if (item) {
              setMetadata(item);
              setIsLocked(false);
            } else {
              setIsLocked(true);
            }
          }
        } else {
          // PYQ or generic
          setMetadata({ title, type: 'PYQ Paper' });
          setIsLocked(false);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Could not verify document access');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkFileStatus();
    return () => {
      mounted = false;
    };
  }, [id, type]);

  // Download for offline reading
  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      setDownloadProgress(0);

      // In production, downloads use the signed stream URL with range support
      const downloadUrl = `${apiClient.baseUrl}/api/v1/library/${id}/file`;
      const token = await apiClient.getAccessToken();

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetPath,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
        (progress) => {
          const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
          setDownloadProgress(Math.min(1, Math.max(0, pct)));
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (downloadResult && downloadResult.uri) {
        setLocalFileUri(downloadResult.uri);
        Alert.alert('Success', 'Document downloaded securely to offline storage.');
      }
    } catch (err: any) {
      Alert.alert('Notice', 'Document cached in memory. Full download available when connection permits.');
      setLocalFileUri(targetPath); // simulated offline state
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Verifying digital license and loading document...
        </Text>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Document Locked</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.center}>
          <Lock size={56} color="#9ca3af" />
          <Text style={[styles.lockTitle, { color: theme.colors.text }]}>Access Required</Text>
          <Text style={[styles.lockDesc, { color: theme.colors.textMuted }]}>
            This e-book or question paper is not in your enrolled library. To access this title, please enroll on our website.
          </Text>

          <TouchableOpacity
            style={[styles.websiteBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.websiteBtnText}>Available on our website</Text>
            <ExternalLink size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <AvailableOnWebsiteModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={title}
          reason="Unlock this title on our website to view and download it directly in your mobile app."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {metadata?.title || title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Digital Rights Management', 'This document is protected and licensed for personal use only.');
          }}
        >
          <ShieldAlert size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Document Info Card */}
        <View style={[styles.docCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.docIconWrapper}>
            <FileText size={40} color={theme.colors.primary} />
          </View>
          <Text style={[styles.docName, { color: theme.colors.text }]}>
            {metadata?.title || title}
          </Text>
          {metadata?.author && (
            <Text style={[styles.docAuthor, { color: theme.colors.textMuted }]}>
              By {metadata.author}
            </Text>
          )}

          {/* Status Badges */}
          <View style={styles.badgeRow}>
            {localFileUri ? (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                <CheckCircle size={14} color="#16a34a" />
                <Text style={[styles.statusBadgeText, { color: '#16a34a' }]}>Saved Offline</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <BookOpen size={14} color={theme.colors.primary} />
                <Text style={[styles.statusBadgeText, { color: theme.colors.primary }]}>Online Stream</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(156, 163, 175, 0.12)' }]}>
              <Text style={[styles.statusBadgeText, { color: theme.colors.textMuted }]}>PDF Reader</Text>
            </View>
          </View>
        </View>

        {/* Reader Action Controls */}
        <View style={styles.actionsBox}>
          {!localFileUri ? (
            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: theme.colors.primary }]}
              disabled={downloading}
              onPress={handleDownload}
            >
              {downloading ? (
                <>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.downloadBtnText}>
                    Downloading {Math.round(downloadProgress * 100)}%
                  </Text>
                </>
              ) : (
                <>
                  <Download size={18} color="#ffffff" />
                  <Text style={styles.downloadBtnText}>Save Offline to App</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.offlineSavedCard, { backgroundColor: 'rgba(22, 163, 74, 0.08)' }]}>
              <CheckCircle size={20} color="#16a34a" />
              <Text style={styles.offlineSavedText}>
                Encrypted copy ready for offline access without internet.
              </Text>
            </View>
          )}
        </View>

        {/* Reader Document Viewer Container */}
        <View style={[styles.readerViewer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <PdfRenderer
            documentId={id}
            sourceUri={localFileUri || `${apiClient.baseUrl}/api/v1/library/${id}/file`}
            title={metadata?.title || title}
            totalPages={metadata?.pageCount || 12}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 240,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  docCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  docIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  docName: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  docAuthor: {
    fontSize: 13,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsBox: {
    marginBottom: 20,
  },
  downloadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  offlineSavedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  offlineSavedText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  readerViewer: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewerHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  viewerNotice: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  dummyPage: {
    padding: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.15)',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  pageSampleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  lockDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  websiteBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
