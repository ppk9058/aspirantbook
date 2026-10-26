import { Storage } from "./storage";

export interface LessonProgressRecord {
  completed: boolean;
  updatedAt: number;
  timeSpent?: number;
}

export type CourseProgressMap = Record<string, LessonProgressRecord>;

export function getCourseProgressKey(courseId: string): string {
  return `ts_course_prog_${courseId}`;
}

export async function getLocalCourseProgress(courseId: string): Promise<CourseProgressMap> {
  try {
    const raw = await Storage.getItem(getCourseProgressKey(courseId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

export async function saveLocalLessonProgress(
  courseId: string,
  lessonId: string,
  completed: boolean,
  timeSpent?: number
): Promise<CourseProgressMap> {
  const current = await getLocalCourseProgress(courseId);
  const updated: CourseProgressMap = {
    ...current,
    [lessonId]: {
      completed,
      updatedAt: Date.now(),
      timeSpent,
    },
  };
  await Storage.setItem(getCourseProgressKey(courseId), JSON.stringify(updated));
  return updated;
}

export async function clearLocalCourseProgress(courseId: string): Promise<void> {
  await Storage.removeItem(getCourseProgressKey(courseId));
}

export function cleanDescriptionPreview(desc?: string | null): string {
  if (!desc) return "";
  return desc
    .replace(/^#+\s+/gm, "")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/-\s+\[[ xX]\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

