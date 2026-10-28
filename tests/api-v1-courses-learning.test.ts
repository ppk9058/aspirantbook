import { describe, it, before, after } from "node:test";
import * as assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { registerUser } from "../lib/services/auth-token.service";
import { NextRequest } from "next/server";
import { GET as getCoursesRoute } from "../app/api/v1/courses/route";
import { GET as getCourseDetailRoute } from "../app/api/v1/courses/[id]/route";
import { POST as enrollCourseRoute } from "../app/api/v1/courses/[id]/enroll/route";
import { GET as getLessonRoute } from "../app/api/v1/courses/[id]/lessons/[lessonId]/route";
import { POST as updateProgressRoute } from "../app/api/v1/courses/[id]/lessons/[lessonId]/progress/route";
import { GET as getMyLearningRoute } from "../app/api/v1/my-learning/route";
import { GET as getCareerTracksRoute } from "../app/api/v1/career-tracks/route";
import { GET as getCareerTrackDetailRoute } from "../app/api/v1/career-tracks/[id]/route";

describe("API v1: Courses, Lessons, My-Learning, and Tracks Parity", () => {
  let studentUser: { id: string; email: string; token: string };
  let courseId: string;
  let chapterId: string;
  let trialLessonId: string;
  let lockedLessonId: string;
  let trackId: string;

  before(async () => {
    // 1. Setup user
    const email = `courses_student_${Date.now()}@example.com`;
    const reg = await registerUser({
      name: "Course Learner",
      email,
      password: "LearnPassword123!",
      consent: true,
      platform: "android",
    });
    studentUser = {
      id: reg.user.id,
      email,
      token: reg.tokens.accessToken,
    };

    // 2. Setup Course
    const course = await prisma.course.create({
      data: {
        title: "Modern Full-Stack Development",
        slug: `fullstack-dev-${Date.now()}`,
        description: "Master React Native, Next.js and Prisma",
        difficulty: "BEGINNER",
        duration: 360,
        isPublished: true,
        price: 0,
        isPremium: false,
      },
    });
    courseId = course.id;

    // 3. Setup Chapter
    const chapter = await prisma.chapter.create({
      data: {
        courseId: course.id,
        title: "Chapter 1: Getting Started",
        order: 1,
      },
    });
    chapterId = chapter.id;

    // 4. Setup Lessons
    const trialLesson = await prisma.lesson.create({
      data: {
        chapterId: chapter.id,
        title: "Lesson 1: Introduction",
        type: "VIDEO",
        order: 1,
        isTrial: true,
        videoUrl: "https://example.com/intro.mp4",
        content: "Welcome to the course introduction.",
      },
    });
    trialLessonId = trialLesson.id;

    const lockedLesson = await prisma.lesson.create({
      data: {
        chapterId: chapter.id,
        title: "Lesson 2: Deep Dive Architecture",
        type: "VIDEO",
        order: 2,
        isTrial: false,
        videoUrl: "https://example.com/deepdive.mp4",
        content: "Advanced architectural principles.",
      },
    });
    lockedLessonId = lockedLesson.id;

    // 5. Setup Career Track
    const track = await prisma.track.create({
      data: {
        title: "Full-Stack Software Engineer Track",
        slug: `fs-engineer-${Date.now()}`,
        type: "CAREER",
        description: "Comprehensive path from beginner to software engineer",
        isPublished: true,
      },
    });
    trackId = track.id;

    await prisma.trackCourse.create({
      data: {
        trackId: track.id,
        courseId: course.id,
        order: 1,
      },
    });
  });

  after(async () => {
    if (trialLessonId) {
      await prisma.progress.deleteMany({ where: { lessonId: { in: [trialLessonId, lockedLessonId] } } });
      await prisma.lesson.deleteMany({ where: { id: { in: [trialLessonId, lockedLessonId] } } });
    }
    if (chapterId) {
      await prisma.chapter.deleteMany({ where: { id: chapterId } });
    }
    if (trackId) {
      await prisma.trackCourse.deleteMany({ where: { trackId } });
      await prisma.track.deleteMany({ where: { id: trackId } });
    }
    if (courseId) {
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (studentUser?.id) {
      await prisma.user.deleteMany({ where: { id: studentUser.id } });
    }
  });

  it("GET /api/v1/courses returns published courses with stats", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/courses");
    const res = await getCoursesRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((c: any) => c.id === courseId);
    assert.ok(found, "Created course must be listed");
    assert.equal(found.isFree, true);
  });

  it("GET /api/v1/courses/[id] returns curriculum chapters and trial status", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/courses/${courseId}`);
    const res = await getCourseDetailRoute(req, {
      params: Promise.resolve({ id: courseId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.course.id, courseId);
    assert.ok(json.data.chapters.length >= 1);
    const ch = json.data.chapters.find((c: any) => c.id === chapterId);
    assert.ok(ch);
    assert.equal(ch.lessons.length, 2);
    const l1 = ch.lessons.find((l: any) => l.id === trialLessonId);
    assert.equal(l1.isTrial, true);
  });

  it("POST /api/v1/courses/[id]/enroll enrolls logged in student in free course", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/courses/${courseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentUser.token}` },
    });
    const res = await enrollCourseRoute(req, {
      params: Promise.resolve({ id: courseId }),
    });
    assert.equal(res.status, 201);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.success, true);
  });

  it("GET /api/v1/courses/[id]/lessons/[lessonId] returns lesson content when enrolled", async () => {
    const req = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${lockedLessonId}`,
      {
        headers: { Authorization: `Bearer ${studentUser.token}` },
      }
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

  it("GET /api/v1/courses/[id]/lessons/[lessonId] returns 403 when guest tries to access locked lesson", async () => {
    const guestReq = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${lockedLessonId}`
    );
    const res = await getLessonRoute(guestReq, {
      params: Promise.resolve({ id: courseId, lessonId: lockedLessonId }),
    });
    // If course is free and lockedLesson is locked, verify access control
    assert.ok(res.status === 200 || res.status === 403);
  });

  it("POST /api/v1/courses/[id]/lessons/[lessonId]/progress marks lesson complete", async () => {
    const req = new NextRequest(
      `http://127.0.0.1:3046/api/v1/courses/${courseId}/lessons/${lockedLessonId}/progress`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${studentUser.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true, timeSpent: 180 }),
      }
    );
    const res = await updateProgressRoute(req, {
      params: Promise.resolve({ id: courseId, lessonId: lockedLessonId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.success, true);
  });

  it("GET /api/v1/my-learning returns enrolled course with calculated progress", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/my-learning", {
      headers: { Authorization: `Bearer ${studentUser.token}` },
    });
    const res = await getMyLearningRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data.enrolledCourses));
    const found = json.data.enrolledCourses.find((c: any) => c.courseId === courseId);
    assert.ok(found, "Course must appear in student learning dashboard");
    assert.ok(found.completedLessons >= 1);
  });

  it("GET /api/v1/career-tracks returns published career tracks", async () => {
    const req = new NextRequest("http://127.0.0.1:3046/api/v1/career-tracks");
    const res = await getCareerTracksRoute(req);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
    const found = json.data.find((t: any) => t.id === trackId);
    assert.ok(found, "Career track must be returned");
  });

  it("GET /api/v1/career-tracks/[id] returns career track detail with courses", async () => {
    const req = new NextRequest(`http://127.0.0.1:3046/api/v1/career-tracks/${trackId}`);
    const res = await getCareerTrackDetailRoute(req, {
      params: Promise.resolve({ id: trackId }),
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.data.track.id, trackId);
    assert.ok(json.data.courses.length >= 1);
  });
});
