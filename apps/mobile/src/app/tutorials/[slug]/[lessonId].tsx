import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Code,
  Check,
  BookOpen,
} from 'lucide-react-native';
import { useTheme } from '../../../lib/theme';
import { apiClient } from '../../../lib/api';
import { AuthwallGate } from '../../../components/common/AuthwallGate';
import { AvailableOnWebsiteModal } from '../../../components/common/AvailableOnWebsiteModal';
import { RoseraErrorBoundary } from '../../../components/common/RoseraRenderer';

interface RoseraBlock {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  language?: string;
  code?: string;
  calloutType?: 'info' | 'warning' | 'tip';
  url?: string;
  caption?: string;
  headers?: string[];
  rows?: string[][];
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
}

export default function TutorialLessonScreen() {
  const { slug, lessonId } = useLocalSearchParams<{ slug: string; lessonId: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadLesson() {
      if (!slug || !lessonId) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const res = await apiClient.getTutorialLesson(slug, lessonId);
        if (!mounted) return;

        if (res.ok && res.data) {
          setLesson(res.data);
        } else {
          setErrorMessage(res.error?.message || 'Could not load lesson');
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err?.message || 'Failed to fetch lesson');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLesson();
    return () => {
      mounted = false;
    };
  }, [slug, lessonId]);

  // Parse Rosera blocks
  const blocks: RoseraBlock[] = useMemo(() => {
    if (!lesson) return [];
    if (Array.isArray(lesson.blocks)) return lesson.blocks;
    if (typeof lesson.content === 'string') {
      try {
        const parsed = JSON.parse(lesson.content);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback: parse raw markdown lines into basic blocks
        const lines = lesson.content.split('\n');
        const generated: RoseraBlock[] = [];
        let paragraphAcc: string[] = [];

        const flushPara = () => {
          if (paragraphAcc.length > 0) {
            generated.push({ type: 'paragraph', text: paragraphAcc.join(' ') });
            paragraphAcc = [];
          }
        };

        lines.forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            flushPara();
            generated.push({ type: 'heading', level: 1, text: trimmed.substring(2) });
          } else if (trimmed.startsWith('## ')) {
            flushPara();
            generated.push({ type: 'heading', level: 2, text: trimmed.substring(3) });
          } else if (trimmed.startsWith('### ')) {
            flushPara();
            generated.push({ type: 'heading', level: 3, text: trimmed.substring(4) });
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            flushPara();
            generated.push({ type: 'list', items: [trimmed.substring(2)] });
          } else if (trimmed.startsWith('> ')) {
            flushPara();
            generated.push({ type: 'callout', calloutType: 'info', text: trimmed.substring(2) });
          } else if (trimmed.length === 0) {
            flushPara();
          } else {
            paragraphAcc.push(trimmed);
          }
        });
        flushPara();
        return generated;
      }
    }
    return [];
  }, [lesson]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
          Loading lesson content...
        </Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          {errorMessage || 'Lesson not found.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLocked = lesson.isLockedForGuest || (lesson.previewCount != null && lesson.previewCount < lesson.totalItemsCount);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {lesson.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Lesson Title */}
        <Text style={[styles.mainTitle, { color: theme.colors.text }]}>{lesson.title}</Text>

        {/* Rosera Block Renderer */}
        <RoseraErrorBoundary>
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'heading': {
              const level = block.level || 2;
              const size = level === 1 ? 24 : level === 2 ? 20 : 17;
              return (
                <Text
                  key={idx}
                  style={[styles.headingBlock, { fontSize: size, color: theme.colors.text }]}
                >
                  {block.text}
                </Text>
              );
            }

            case 'paragraph': {
              return (
                <Text key={idx} style={[styles.paragraphBlock, { color: theme.colors.text }]}>
                  {block.text}
                </Text>
              );
            }

            case 'list': {
              return (
                <View key={idx} style={styles.listContainer}>
                  {block.items?.map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.listItemRow}>
                      <View style={[styles.listBullet, { backgroundColor: theme.colors.primary }]} />
                      <Text style={[styles.listItemText, { color: theme.colors.text }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            }

            case 'code': {
              return (
                <View key={idx} style={styles.codeContainer}>
                  {block.language ? (
                    <View style={styles.codeHeader}>
                      <Text style={styles.codeLang}>{block.language}</Text>
                    </View>
                  ) : null}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Text style={styles.codeContent}>{block.code || block.text}</Text>
                  </ScrollView>
                </View>
              );
            }

            case 'callout': {
              const type = block.calloutType || 'info';
              let borderCol = '#3b82f6';
              let bgCol = 'rgba(59, 130, 246, 0.08)';
              let icon = <Info size={18} color="#3b82f6" />;

              if (type === 'warning') {
                borderCol = '#eab308';
                bgCol = 'rgba(234, 179, 8, 0.08)';
                icon = <AlertTriangle size={18} color="#eab308" />;
              } else if (type === 'tip') {
                borderCol = '#16a34a';
                bgCol = 'rgba(22, 163, 74, 0.08)';
                icon = <Lightbulb size={18} color="#16a34a" />;
              }

              return (
                <View
                  key={idx}
                  style={[styles.calloutCard, { borderLeftColor: borderCol, backgroundColor: bgCol }]}
                >
                  <View style={styles.calloutIconWrapper}>{icon}</View>
                  <Text style={[styles.calloutText, { color: theme.colors.text }]}>{block.text}</Text>
                </View>
              );
            }

            case 'image': {
              if (!block.url) return null;
              return (
                <View key={idx} style={styles.imageWrapper}>
                  <ExpoImage
                    source={{ uri: block.url }}
                    style={styles.imageBlock}
                    contentFit="contain"
                    transition={300}
                  />
                  {block.caption ? (
                    <Text style={[styles.imageCaption, { color: theme.colors.textMuted }]}>
                      {block.caption}
                    </Text>
                  ) : null}
                </View>
              );
            }

            case 'table': {
              return (
                <ScrollView key={idx} horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                  <View style={[styles.tableContainer, { borderColor: theme.colors.border }]}>
                    {block.headers && (
                      <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: theme.colors.border }]}>
                        {block.headers.map((h, hIdx) => (
                          <View key={hIdx} style={styles.tableCell}>
                            <Text style={[styles.tableHeaderText, { color: theme.colors.text }]}>{h}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {block.rows?.map((row, rIdx) => (
                      <View key={rIdx} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
                        {row.map((cell, cIdx) => (
                          <View key={cIdx} style={styles.tableCell}>
                            <Text style={[styles.tableCellText, { color: theme.colors.text }]}>{cell}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            }

            case 'quiz': {
              const selected = selectedQuizAnswers[idx];
              const isSubmitted = selected !== undefined;

              return (
                <View key={idx} style={[styles.quizCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={[styles.quizQuestion, { color: theme.colors.text }]}>{block.question}</Text>
                  <View style={styles.quizOptions}>
                    {block.options?.map((opt, optIdx) => {
                      const isOptionSelected = selected === optIdx;
                      const isCorrect = isSubmitted && block.correctOptionIndex === optIdx;
                      const isWrong = isSubmitted && isOptionSelected && !isCorrect;

                      let optBorder = theme.colors.border;
                      let optBg = theme.colors.background;
                      if (isCorrect) {
                        optBorder = '#16a34a';
                        optBg = 'rgba(22, 163, 74, 0.1)';
                      } else if (isWrong) {
                        optBorder = '#dc2626';
                        optBg = 'rgba(220, 38, 38, 0.1)';
                      }

                      return (
                        <TouchableOpacity
                          key={optIdx}
                          style={[styles.quizOptionBtn, { borderColor: optBorder, backgroundColor: optBg }]}
                          disabled={isSubmitted}
                          onPress={() => {
                            setSelectedQuizAnswers((prev) => ({ ...prev, [idx]: optIdx }));
                          }}
                        >
                          <Text style={[styles.quizOptionText, { color: theme.colors.text }]}>{opt}</Text>
                          {isCorrect && <Check size={16} color="#16a34a" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }

            default:
              return (
                <Text key={idx} style={[styles.paragraphBlock, { color: theme.colors.text }]}>
                  {block.text}
                </Text>
              );
          }
        })}
        </RoseraErrorBoundary>

        {/* Authwall Gate if Sliced / Locked */}
        {isLocked && (
          <AuthwallGate
            title={lesson.title}
            totalCount={lesson.totalItemsCount || 10}
            previewCount={lesson.previewCount || 2}
            onUnlock={() => setModalVisible(true)}
          />
        )}
      </ScrollView>

      {/* Bottom Lesson Navigation */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        {lesson.prevLessonId ? (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.replace(`/tutorials/${slug}/${lesson.prevLessonId}`)}
          >
            <ChevronLeft size={20} color={theme.colors.text} />
            <Text style={[styles.navBtnText, { color: theme.colors.text }]}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}

        {lesson.nextLessonId ? (
          <TouchableOpacity
            style={[styles.navBtnNext, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.replace(`/tutorials/${slug}/${lesson.nextLessonId}`)}
          >
            <Text style={styles.navBtnNextText}>Next Lesson</Text>
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtnNext, { backgroundColor: '#16a34a' }]}
            onPress={() => router.replace(`/tutorials/${slug}`)}
          >
            <CheckCircle size={18} color="#ffffff" />
            <Text style={styles.navBtnNextText}>Complete Course</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Available on Website Modal */}
      <AvailableOnWebsiteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={lesson.title}
        reason="Enroll in this course on our website to access full lesson text, downloadable notes, and interactive quizzes."
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
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 240,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  headingBlock: {
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraphBlock: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
  },
  listContainer: {
    marginBottom: 14,
    gap: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  codeContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  codeHeader: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  codeLang: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  codeContent: {
    color: '#f8fafc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  calloutIconWrapper: {
    marginTop: 2,
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  imageWrapper: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imageBlock: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  imageCaption: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  tableScroll: {
    marginBottom: 16,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    borderBottomWidth: 1.5,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableCellText: {
    fontSize: 13,
  },
  quizCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  quizQuestion: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  quizOptions: {
    gap: 8,
  },
  quizOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quizOptionText: {
    fontSize: 14,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  navBtnNextText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
