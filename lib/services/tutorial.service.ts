import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import { resolveAccess } from "@/lib/authwall/resolveAccess";
import { TutorialSummaryDto, LessonDetailDto } from "@aspirantbook/shared";

export async function getTutorialsList(viewer: Viewer): Promise<TutorialSummaryDto[]> {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      thumbnailUrl: true,
      technology: true,
      isGated: true,
      _count: {
        select: {
          chapters: true,
        },
      },
      chapters: {
        select: {
          _count: {
            select: { lessons: true },
          },
        },
      },
    },
  });

  return courses.map((c) => {
    const totalLessons = c.chapters.reduce((sum, ch) => sum + ch._count.lessons, 0);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      icon: c.thumbnailUrl,
      category: c.technology || "General",
      chaptersCount: c._count.chapters,
      lessonsCount: totalLessons,
      isGated: Boolean(c.isGated),
    };
  });
}

export async function getTutorialDetail(
  viewer: Viewer,
  slug: string
): Promise<TutorialSummaryDto & { chapters: any[] }> {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              durationText: true,
              type: true,
              isTrial: true,
              gateMode: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("NOT_FOUND: Tutorial course not found");
  }

  const totalLessons = course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    icon: course.thumbnailUrl,
    category: course.technology || "General",
    chaptersCount: course.chapters.length,
    lessonsCount: totalLessons,
    isGated: Boolean(course.isGated),
    chapters: course.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      lessons: ch.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        duration: l.durationText,
        type: l.type,
        isTrial: l.isTrial,
        gateMode: l.gateMode,
      })),
    })),
  };
}

export async function getLessonDetail(
  viewer: Viewer,
  tutorialSlug: string,
  lessonId: string
): Promise<LessonDetailDto> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      chapter: {
        include: {
          course: true,
          lessons: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            select: { id: true },
          },
        },
      },
      currentPublishedVersion: true,
      progress: viewer.userId
        ? {
            where: { userId: viewer.userId },
            select: { completed: true },
          }
        : false,
    },
  });

  if (!lesson) {
    throw new Error("NOT_FOUND: Lesson not found");
  }

  const course = lesson.chapter.course;

  // Extract raw content or structured Rosera blocks
  let rawBlocks: any = [];
  if (lesson.currentPublishedVersion?.blocks) {
    rawBlocks = lesson.currentPublishedVersion.blocks;
  } else if (lesson.content) {
    rawBlocks = lesson.content;
  }

  // Authoritative server-side slicing via Authwall
  const access = resolveAccess({
    viewer: {
      userId: viewer.userId,
      role: viewer.role,
    },
    content: rawBlocks,
    containerGate: {
      isGated: course.isGated,
      previewPercentage: course.previewPercentage,
      gateTitle: course.gateTitle,
      gateSubtitle: course.gateSubtitle,
    },
    itemGate: {
      gateMode: lesson.gateMode,
      previewPercentage: lesson.previewPercentage,
    },
  });

  // Calculate next and previous lesson in chapter
  const siblings = lesson.chapter.lessons;
  const currentIndex = siblings.findIndex((s) => s.id === lesson.id);
  const prevLessonId = currentIndex > 0 ? siblings[currentIndex - 1].id : null;
  const nextLessonId =
    currentIndex !== -1 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1].id
      : null;

  const isCompleted =
    Array.isArray(lesson.progress) && lesson.progress.length > 0
      ? Boolean(lesson.progress[0].completed)
      : false;

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.id,
    tutorialSlug: course.slug,
    chapterTitle: lesson.chapter.title,
    isLockedForGuest: access.isLockedForGuest,
    totalItemsCount: access.totalItemsCount,
    previewCount: access.previewCount,
    blocks: access.previewBlocks,
    gateMetadata: {
      isGated: access.isGated,
      gateTitle: access.gateTitle,
      gateSubtitle: access.gateSubtitle,
      effectivePercentage: access.effectivePercentage,
    },
    navigation: {
      prevLessonId,
      nextLessonId,
    },
    isCompleted,
  };
}

export async function updateLessonProgress(
  viewer: Viewer,
  tutorialSlug: string,
  lessonId: string,
  data: { completed: boolean }
): Promise<boolean> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to update lesson progress");
  }

  const existing = await prisma.progress.findFirst({
    where: {
      userId: viewer.userId,
      lessonId,
    },
  });

  if (existing) {
    await prisma.progress.update({
      where: { id: existing.id },
      data: { completed: data.completed },
    });
  } else {
    await prisma.progress.create({
      data: {
        userId: viewer.userId,
        lessonId,
        completed: data.completed,
      },
    });
  }

  return true;
}
