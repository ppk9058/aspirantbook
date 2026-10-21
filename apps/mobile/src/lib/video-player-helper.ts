/**
 * Video Player Helper & Resolvers
 * Supports native HLS / direct MP4 via expo-video, Mux streams, external YouTube/Vimeo embeds,
 * strict locked lesson protection, playback speeds, and sequential curriculum navigation.
 */

export const ALLOWED_PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof ALLOWED_PLAYBACK_SPEEDS)[number];

export function isValidPlaybackSpeed(speed: number): speed is PlaybackSpeed {
  return (ALLOWED_PLAYBACK_SPEEDS as readonly number[]).includes(speed);
}

export type VideoProviderType = "native" | "embed_youtube" | "embed_vimeo" | "none";

export interface LessonVideoSourceInput {
  videoUrl?: string | null;
  muxPlaybackId?: string | null;
  isLocked?: boolean;
}

export interface ResolvedVideoState {
  isPlayable: boolean;
  isLocked: boolean;
  provider: VideoProviderType;
  streamUrl: string | null;
  externalUrl: string | null;
  embedLabel?: string;
  errorMessage?: string;
}

/**
 * Resolves the playback source and classifies the provider.
 * CRITICAL SECURITY INVARIANT: If isLocked is true, NEVER leak or return streamUrl or externalUrl.
 */
export function resolveVideoState(input: LessonVideoSourceInput): ResolvedVideoState {
  if (input.isLocked) {
    return {
      isPlayable: false,
      isLocked: true,
      provider: "none",
      streamUrl: null,
      externalUrl: null,
      errorMessage: "Enroll in the full course to view this lesson",
    };
  }

  // 1. Mux Playback ID explicit field or mux: URI
  const explicitMux = input.muxPlaybackId?.trim();
  if (explicitMux) {
    return {
      isPlayable: true,
      isLocked: false,
      provider: "native",
      streamUrl: `https://stream.mux.com/${explicitMux}.m3u8`,
      externalUrl: null,
    };
  }

  const rawUrl = (input.videoUrl || "").trim();
  if (!rawUrl) {
    return {
      isPlayable: false,
      isLocked: false,
      provider: "none",
      streamUrl: null,
      externalUrl: null,
      errorMessage: "No video available for this lesson",
    };
  }

  if (rawUrl.startsWith("mux:")) {
    const muxId = rawUrl.replace(/^mux:/, "").trim();
    return {
      isPlayable: true,
      isLocked: false,
      provider: "native",
      streamUrl: `https://stream.mux.com/${muxId}.m3u8`,
      externalUrl: null,
    };
  }

  // 2. YouTube Embeds (open in external browser)
  if (
    rawUrl.includes("youtube.com") ||
    rawUrl.includes("youtu.be") ||
    rawUrl.includes("youtube-nocookie.com")
  ) {
    return {
      isPlayable: false,
      isLocked: false,
      provider: "embed_youtube",
      streamUrl: null,
      externalUrl: rawUrl,
      embedLabel: "Opens YouTube",
    };
  }

  // 3. Vimeo Embeds (open in external browser)
  if (rawUrl.includes("vimeo.com")) {
    return {
      isPlayable: false,
      isLocked: false,
      provider: "embed_vimeo",
      streamUrl: null,
      externalUrl: rawUrl,
      embedLabel: "Opens Vimeo",
    };
  }

  // 4. Direct video URL (S3, cloud storage, direct mp4/m3u8)
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return {
      isPlayable: true,
      isLocked: false,
      provider: "native",
      streamUrl: rawUrl,
      externalUrl: null,
    };
  }

  // Unknown format
  return {
    isPlayable: false,
    isLocked: false,
    provider: "none",
    streamUrl: null,
    externalUrl: null,
    errorMessage: "Unsupported video format",
  };
}

export interface CurriculumChapter {
  id: string;
  title: string;
  lessons?: Array<{ id: string; title: string; isLocked?: boolean; [key: string]: any }>;
}

export interface FlattenedLesson {
  id: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  isLocked?: boolean;
}

export function flattenCurriculumLessons(
  chapters: CurriculumChapter[] = []
): FlattenedLesson[] {
  const result: FlattenedLesson[] = [];
  for (const chapter of chapters) {
    if (!Array.isArray(chapter.lessons)) continue;
    for (const lesson of chapter.lessons) {
      result.push({
        id: lesson.id,
        title: lesson.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        isLocked: Boolean(lesson.isLocked),
      });
    }
  }
  return result;
}

export function computeCurriculumNavigation(
  currentLessonId: string,
  chapters: CurriculumChapter[] = []
): { prevLessonId: string | null; nextLessonId: string | null } {
  const flat = flattenCurriculumLessons(chapters);
  const idx = flat.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) {
    return { prevLessonId: null, nextLessonId: null };
  }
  const prevLessonId = idx > 0 ? flat[idx - 1].id : null;
  const nextLessonId = idx < flat.length - 1 ? flat[idx + 1].id : null;
  return { prevLessonId, nextLessonId };
}
