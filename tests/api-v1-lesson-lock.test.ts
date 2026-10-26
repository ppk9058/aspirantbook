import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { GET as getCourseDetailRoute } from "../app/api/v1/courses/[id]/route";
import { GET as getLessonRoute } from "../app/api/v1/courses/[id]/lessons/[lessonId]/route";
import { POST as enrollCourseRoute } from "../app/api/v1/courses/[id]/enroll/route";

describe("API v1: Lesson Lock and Video Stream Security", () => {
  let unenrolledUser: { id: string; email: string; token: string };
  let enrolledUser: { id: string; email: string; token: string };
  let courseId: string;
  let chapterId: string;
  let trialLessonId: string;
  let lockedLessonId: string;

  before(async () => {
    // 1. Setup users
    const email1 = `lock_unenrolled_${Date.now()}@example.com`;
    const res1 = await registerUser({
      email: email1,
      password: "Secret123#",
      name: "Unenrolled User",
      consent: true,
      platform: "android",
    });
    unenrolledUser = { id: res1.user.id, email: res1.user.email || email1, token: res1.tokens.accessToken };

    const email2 = `lock_enrolled_${Date.now()}@example.com`;
    const res2 = await registerUser({
      email: email2,
      password: "Secret123#",
      name: "Enrolled User",
      consent: true,
      platform: "android",
    });
    enrolledUser = { id: res2.user.id, email: res2.user.email || email2, token: res2.tokens.accessToken };

    // 2. Setup paid premium course with a chapter, trial lesson, and locked lesson
    const course = await prisma.course.create({
      data: {
        title: "Security Test Locked Course",
        slug: `sec-course-lock-${Date.now()}`,
        description: "Course for verifying lesson locking invariants",
        difficulty: "BEGINNER",
        duration: 360,
        price: 999,
        isPremium: true,
        isPublished: true,
      },
    });
    courseId = course.id;

    const chapter = await prisma.chapter.create({
      data: {
        title: "Security Chapter",
        courseId: course.id,
        order: 1,
      },
    });
    chapterId = chapter.id;

    const trialLesson = await prisma.lesson.create({
      data: {
        title: "Free Preview Lesson",
        chapterId: chapter.id,
        type: "VIDEO",
        order: 1,
        isTrial: true,
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        content: "Preview content",
        duration: 120,
      },
    });
    trialLessonId = trialLesson.id;

    const lockedLesson = await prisma.lesson.create({
      data: {
        title: "Premium Locked Lesson",
        chapterId: chapter.id,
        type: "VIDEO",
        order: 2,
        isTrial: false,
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        content: "Classified premium content",
        duration: 600,
      },
    });
    lockedLessonId = lockedLesson.id;

    // Enroll enrolledUser
    await prisma.enrollment.create({
      data: {
        userId: enrolledUser.id,
        courseId: course.id,
      },
    });
  });

  after(async () => {
    try {
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.progress.deleteMany({ where: { lessonId: { in: [trialLessonId, lockedLessonId] } } });
      await prisma.lesson.deleteMany({ where: { id: { in: [trialLessonId, lockedLessonId] } } });
      await prisma.chapter.deleteMany({ where: { id: chapterId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: { in: [unenrolledUser.id, enrolledUser.id] } } });
    } catch (e) {
      // cleanup best effort
    }
  });

  it("Course detail marks locked lesson as isLocked=true and trial lesson as isLocked=false for unenrolled user", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${unenrolledUser.token}` },
    });
    const res = await getCourseDetailRoute(req, {
      params: Promise.resolve({ id: courseId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);

    const chapter = json.data.chapters[0];
    const trial = chapter.lessons.find((l: any) => l.id === trialLessonId);
    const locked = chapter.lessons.find((l: any) => l.id === lockedLessonId);

    assert.equal(trial.isLocked, false);
    assert.equal(locked.isLocked, true);
  });

  it("Unenrolled user can access trial preview lesson without restriction", async () => {
    const req = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${trialLessonId}`,
      { headers: { Authorization: `Bearer ${unenrolledUser.token}` } }
    );
    const res = await getLessonRoute(req, {
      params: Promise.resolve({ id: courseId, lessonId: trialLessonId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, trialLessonId);
    assert.ok(json.data.videoUrl);
  });

  it("Unenrolled user receives 403 FORBIDDEN when attempting to access locked lesson streamUrl", async () => {
    const req = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${lockedLessonId}`,
      { headers: { Authorization: `Bearer ${unenrolledUser.token}` } }
    );
    const res = await getLessonRoute(req, {
      params: Promise.resolve({ id: courseId, lessonId: lockedLessonId }),
    });
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.ok, false);
    assert.equal(json.error?.code, "FORBIDDEN");
    assert.equal(json.data, undefined);
  });

  it("Enrolled user receives 200 and valid streamUrl for previously locked lesson", async () => {
    const req = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${lockedLessonId}`,
      { headers: { Authorization: `Bearer ${enrolledUser.token}` } }
    );
    const res = await getLessonRoute(req, {
      params: Promise.resolve({ id: courseId, lessonId: lockedLessonId }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.id, lockedLessonId);
    assert.ok(json.data.videoUrl);
  });
});
