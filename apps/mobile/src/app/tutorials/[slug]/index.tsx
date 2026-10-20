import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  PlayCircle,
  CheckCircle,
  Clock,
  Layers,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { apiClient } from '../../../lib/api';
import { AvailableOnWebsiteModal } from '../../../components/common/AvailableOnWebsiteModal';

export default function TutorialOutlineScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tutorial, setTutorial] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadTutorial() {
      try {
        setLoading(true);
        if (!slug) return;
        const res = await apiClient.getTutorial(slug);
        if (!mounted) return;
        if (res.ok && res.data) {
          setTutorial(res.data);
        } else {
          Alert.alert('Error', res.error?.message || 'Could not load tutorial', [
            { text: 'Go Back', onPress: () => router.back() },
          ]);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to fetch tutorial', [
          { text: 'Go Back', onPress: () => router.back() },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTutorial();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Loading course syllabus...
        </Text>
      </View>
    );
  }

  if (!tutorial) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>Tutorial not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const chapters = tutorial.chapters || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtnHeader} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {tutorial.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Card */}
        <View style={[styles.bannerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.tutorialTitle, { color: theme.colors.text }]}>{tutorial.title}</Text>
          {tutorial.description ? (
            <Text style={[styles.tutorialDesc, { color: theme.colors.textMuted }]}>
              {tutorial.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Layers size={14} color={theme.colors.primary} />
              <Text style={[styles.metaBadgeText, { color: theme.colors.primary }]}>
                {chapters.length} Chapters
              </Text>
            </View>
            {tutorial.category ? (
              <View style={[styles.metaBadge, { backgroundColor: 'rgba(156, 163, 175, 0.12)' }]}>
                <Text style={[styles.metaBadgeText, { color: theme.colors.textMuted }]}>
                  {tutorial.category}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Chapters and Lessons */}
        <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Table of Contents</Text>

        {chapters.map((chapter: any, cIdx: number) => {
          const lessons = chapter.lessons || [];

          return (
            <View key={chapter.id || cIdx} style={styles.chapterGroup}>
              <View style={styles.chapterHeader}>
                <Text style={[styles.chapterNumber, { color: theme.colors.textMuted }]}>
                  CHAPTER {cIdx + 1}
                </Text>
                <Text style={[styles.chapterName, { color: theme.colors.text }]}>
                  {chapter.title}
                </Text>
              </View>

              <View style={[styles.lessonsList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {lessons.map((lesson: any, lIdx: number) => {
                  const isLocked = lesson.isLocked && !tutorial.isEnrolled;

                  return (
                    <TouchableOpacity
                      key={lesson.id || lIdx}
                      style={[
                        styles.lessonRow,
                        lIdx < lessons.length - 1 && [styles.lessonRowBorder, { borderBottomColor: theme.colors.border }],
                      ]}
                      onPress={() => {
                        if (isLocked) {
                          setModalVisible(true);
                        } else {
                          router.push({
                            pathname: `/tutorials/${slug}/${lesson.id}`,
                          });
                        }
                      }}
                    >
                      <View style={styles.lessonLeft}>
                        {isLocked ? (
                          <Lock size={18} color="#9ca3af" />
                        ) : (
                          <PlayCircle size={18} color={theme.colors.primary} />
                        )}
                        <View style={styles.lessonTextCol}>
                          <Text
                            style={[
                              styles.lessonTitle,
                              { color: isLocked ? theme.colors.textMuted : theme.colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {lesson.title}
                          </Text>
                          {lesson.duration ? (
                            <Text style={[styles.durationText, { color: theme.colors.textMuted }]}>
                              {lesson.duration} mins
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {isLocked ? (
                        <View style={styles.lockBadge}>
                          <Text style={styles.lockBadgeText}>Premium</Text>
                        </View>
                      ) : (
                        <ChevronRight size={18} color={theme.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Available on Website Modal */}
      <AvailableOnWebsiteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={tutorial.title}
        reason="Enroll in this course on our website to unlock all chapters, quizzes, and full video lessons."
      />
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
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
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
  backBtnHeader: {
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
  bannerCard: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  tutorialDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chapterGroup: {
    marginBottom: 18,
  },
  chapterHeader: {
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  chapterName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  lessonsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lessonRowBorder: {
    borderBottomWidth: 1,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  lessonTextCol: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationText: {
    fontSize: 11,
    marginTop: 2,
  },
  lockBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
});
