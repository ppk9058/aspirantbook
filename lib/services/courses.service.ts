import { prisma } from "@/lib/prisma";
import { Viewer } from "@/lib/api/v1/viewer";
import {
  CourseSummaryDto,
  CourseDetailDto,
  CourseChapterDto,
  CourseLessonItemDto,
  CourseLessonDetailDto,
  MyLearningDto,
  MyLearningItemDto,
  CareerTrackDto,
  CareerTrackDetailDto,
} from "@aspirantbook/shared";

export async function getCoursesList(
  viewer: Viewer,
  query?: { category?: string; search?: string; cursor?: string; limit?: number }
): Promise<CourseSummaryDto[]> {
  const where: any = { isPublished: true };
  if (query?.category && query.category !== "All") {
    where.difficulty = query.category;
  }
  if (query?.search) {
    where.title = { contains: query.search, mode: "insensitive" };
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      chapters: {
        include: {
          lessons: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: query?.limit ? Math.min(query.limit, 50) : 50,
  });

  let enrolledSet = new Set<string>();
  if (viewer.userId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: viewer.userId },
      select: { courseId: true },
    });
    enrolledSet = new Set(enrollments.map((e) => e.courseId));
  }

  return courses.map((c) => {
    const chaptersCount = c.chapters.length;
    let lessonsCount = 0;
    c.chapters.forEach((ch) => {
      lessonsCount += ch.lessons.length;
    });

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      difficulty: c.difficulty,
      duration: c.duration,
      rating: c.rating,
      enrollmentCount: c.enrollmentCount,
      isFree: (c.price ?? 0) === 0 || !c.isPremium,
      price: c.price ?? 0,
      chaptersCount,
      lessonsCount,
      isEnrolled: enrolledSet.has(c.id),
    };
  });
}

export async function getCourseDetail(
  viewer: Viewer,
  courseIdOrSlug: string
): Promise<CourseDetailDto> {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
      isPublished: true,
    },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("NOT_FOUND: Course not found");
  }

  let isEnrolled = false;
  let completedLessonIds = new Set<string>();

  if (viewer.userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: viewer.userId,
          courseId: course.id,
        },
      },
    });
    isEnrolled = Boolean(enrollment);

    const lessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
    const progresses = await prisma.progress.findMany({
      where: {
        userId: viewer.userId,
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { lessonId: true },
    });
    completedLessonIds = new Set(progresses.map((p) => p.lessonId));
  }

  const isCourseFree = (course.price ?? 0) === 0 || !course.isPremium;

  const chapters: CourseChapterDto[] = course.chapters.map((ch) => {
    const lessons: CourseLessonItemDto[] = ch.lessons.map((l) => {
      const isLocked = !isEnrolled && !isCourseFree && !l.isTrial;
      return {
        id: l.id,
        title: l.title,
        durationText: l.durationText || `${l.duration || 10} mins`,
        duration: l.duration,
        isTrial: l.isTrial,
        order: l.order,
        isLocked,
        isCompleted: completedLessonIds.has(l.id),
      };
    });

    return {
      id: ch.id,
      title: ch.title,
      order: ch.order,
      lessons,
    };
  });

  let totalLessons = 0;
  chapters.forEach((ch) => {
    totalLessons += ch.lessons.length;
  });

  const courseSummary: CourseSummaryDto = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    difficulty: course.difficulty,
    duration: course.duration,
    rating: course.rating,
    enrollmentCount: course.enrollmentCount,
    isFree: isCourseFree,
    price: course.price ?? 0,
    chaptersCount: chapters.length,
    lessonsCount: totalLessons,
    isEnrolled,
  };

  return {
    course: courseSummary,
    chapters,
    isEnrolled,
  };
}

export async function enrollFreeCourse(
  viewer: Viewer,
  courseId: string
): Promise<{ success: boolean; enrolledAt: string }> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to enroll in course");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, isPremium: true, isPublished: true },
  });

  if (!course || !course.isPublished) {
    throw new Error("NOT_FOUND: Course not found or not published");
  }

  const isFree = (course.price ?? 0) === 0 || !course.isPremium;
  if (!isFree) {
    throw new Error("FORBIDDEN: Paid courses must be purchased on website");
  }

  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: viewer.userId,
        courseId,
      },
    },
    update: {},
    create: {
      userId: viewer.userId,
      courseId,
    },
  });

  await prisma.course.update({
    where: { id: courseId },
    data: { enrollmentCount: { increment: 1 } },
  });

  return {
    success: true,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  };
}

export async function getCourseLesson(
  viewer: Viewer,
  courseSlug: string,
  lessonId: string
): Promise<CourseLessonDetailDto> {
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseSlug }, { slug: courseSlug }],
      isPublished: true,
    },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error("NOT_FOUND: Course not found");
  }

  // Find target lesson
  let targetLesson: any = null;
  let targetChapterTitle = "";
  let allOrderedLessons: any[] = [];

  for (const ch of course.chapters) {
    for (const l of ch.lessons) {
      allOrderedLessons.push(l);
      if (l.id === lessonId) {
        targetLesson = l;
        targetChapterTitle = ch.title;
      }
    }
  }

  if (!targetLesson) {
    throw new Error("NOT_FOUND: Lesson not found");
  }

  // Check enrollment
  let isEnrolled = false;
  let isCompleted = false;

  if (viewer.userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: viewer.userId,
          courseId: course.id,
        },
      },
    });
    isEnrolled = Boolean(enrollment);

    const progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: viewer.userId,
          lessonId,
        },
      },
    });
    isCompleted = Boolean(progress?.completed);

    // Update lastAccessed
    await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: viewer.userId,
          lessonId,
        },
      },
      update: { lastAccessed: new Date() },
      create: {
        userId: viewer.userId,
        lessonId,
        completed: false,
        timeSpent: 0,
      },
    });
  }

  const isCourseFree = (course.price ?? 0) === 0 || !course.isPremium;
  const isLocked = !isEnrolled && !isCourseFree && !targetLesson.isTrial;

  if (isLocked) {
    throw new Error("FORBIDDEN: Lesson is locked. Please enroll in this course to watch.");
  }

  const targetIdx = allOrderedLessons.findIndex((l) => l.id === lessonId);
  const prevLessonId = targetIdx > 0 ? allOrderedLessons[targetIdx - 1].id : null;
  const nextLessonId =
    targetIdx < allOrderedLessons.length - 1 ? allOrderedLessons[targetIdx + 1].id : null;

  return {
    id: targetLesson.id,
    title: targetLesson.title,
    courseTitle: course.title,
    courseSlug: course.slug,
    chapterTitle: targetChapterTitle,
    videoUrl: targetLesson.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    content: targetLesson.content,
    durationText: targetLesson.durationText || `${targetLesson.duration || 10} mins`,
    isCompleted,
    isLocked: false,
    navigation: {
      prevLessonId,
      nextLessonId,
    },
  };
}

export async function updateCourseLessonProgress(
  viewer: Viewer,
  lessonId: string,
  completed: boolean,
  timeSpent?: number
): Promise<{ success: boolean }> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to update lesson progress");
  }

  await prisma.progress.upsert({
    where: {
      userId_lessonId: {
        userId: viewer.userId,
        lessonId,
      },
    },
    update: {
      completed,
      lastAccessed: new Date(),
      ...(timeSpent ? { timeSpent: { increment: timeSpent } } : {}),
    },
    create: {
      userId: viewer.userId,
      lessonId,
      completed,
      timeSpent: timeSpent || 0,
    },
  });

  return { success: true };
}

export async function getMyLearning(viewer: Viewer): Promise<MyLearningDto> {
  if (!viewer.userId) {
    throw new Error("UNAUTHORIZED: Must be logged in to access My Learning");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: viewer.userId },
    include: {
      course: {
        include: {
          chapters: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const allLessonIds = enrollments.flatMap((e) =>
    e.course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id))
  );

  const completedProgresses = await prisma.progress.findMany({
    where: {
      userId: viewer.userId,
      lessonId: { in: allLessonIds },
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedSet = new Set(completedProgresses.map((p) => p.lessonId));

  const enrolledCourses: MyLearningItemDto[] = enrollments.map((e) => {
    const courseLessons = e.course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
    const totalLessons = courseLessons.length;
    const completedCount = courseLessons.filter((id) => completedSet.has(id)).length;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      courseId: e.course.id,
      title: e.course.title,
      slug: e.course.slug,
      thumbnailUrl: e.course.thumbnailUrl,
      totalLessons,
      completedLessons: completedCount,
      progressPercent,
      enrolledAt: e.enrolledAt.toISOString(),
      lastLessonId: courseLessons[0] || null,
    };
  });

  return { enrolledCourses };
}

export async function getCareerTracks(viewer: Viewer): Promise<CareerTrackDto[]> {
  const tracks = await prisma.track.findMany({
    where: { isPublished: true },
    include: {
      courses: { select: { courseId: true } },
    },
    orderBy: { order: "asc" },
  });

  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    type: t.type,
    description: t.description,
    thumbnail: t.thumbnail,
    totalCourses: t.courses.length,
  }));
}

export async function getCareerTrackDetail(
  viewer: Viewer,
  trackIdOrSlug: string
): Promise<CareerTrackDetailDto> {
  const track = await prisma.track.findFirst({
    where: {
      OR: [{ id: trackIdOrSlug }, { slug: trackIdOrSlug }],
      isPublished: true,
    },
    include: {
      courses: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!track) {
    throw new Error("NOT_FOUND: Career track not found");
  }

  let enrolledSet = new Set<string>();
  if (viewer.userId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: viewer.userId },
      select: { courseId: true },
    });
    enrolledSet = new Set(enrollments.map((e) => e.courseId));
  }

  const courses = track.courses.map((tc) => ({
    id: tc.course.id,
    title: tc.course.title,
    slug: tc.course.slug,
    thumbnailUrl: tc.course.thumbnailUrl,
    difficulty: tc.course.difficulty,
    duration: tc.course.duration,
    isEnrolled: enrolledSet.has(tc.course.id),
  }));

  return {
    track: {
      id: track.id,
      title: track.title,
      slug: track.slug,
      type: track.type,
      description: track.description,
      thumbnail: track.thumbnail,
      totalCourses: courses.length,
    },
    courses,
  };
}
