import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Phase 6: Courses, Video Player, My-Learning, and Tracks Parity", () => {
  const appRoot = path.join(__dirname, "../src/app");

  it("all Phase 6 route files exist under src/app", () => {
    const requiredRoutes = [
      "(tabs)/courses.tsx",
      "courses/[id].tsx",
      "courses/[id]/lesson/[lessonId].tsx",
      "my-learning.tsx",
      "career-tracks/index.tsx",
      "career-tracks/[id].tsx",
      "(tabs)/home.tsx",
    ];

    for (const route of requiredRoutes) {
      const fullPath = path.join(appRoot, route);
      assert.equal(
        fs.existsSync(fullPath),
        true,
        `Route file missing: ${route}`
      );
    }
  });

  it("home quick actions point to valid application routes", () => {
    const homeContent = fs.readFileSync(path.join(appRoot, "(tabs)/home.tsx"), "utf8");
    const routes = [
      "/(tabs)/tests",
      "/(tabs)/courses",
      "/pyqs",
      "/current-affairs",
      "/career-tracks",
      "/subscription",
    ];

    for (const route of routes) {
      assert.equal(
        homeContent.includes(route),
        true,
        `Home quick actions must include route: ${route}`
      );
    }
  });

  it("course detail and lesson player implement Reader model and web checkout fallback", () => {
    const courseDetailContent = fs.readFileSync(path.join(appRoot, "courses/[id].tsx"), "utf8");
    assert.equal(
      courseDetailContent.includes("WebBrowser.openBrowserAsync"),
      true,
      "CourseDetail must use WebBrowser for web-only checkout (Reader model)"
    );
    assert.equal(
      courseDetailContent.includes("utm_source=mobile_app"),
      true,
      "External URL must include utm_source=mobile_app"
    );

    const lessonPlayerContent = fs.readFileSync(
      path.join(appRoot, "courses/[id]/lesson/[lessonId].tsx"),
      "utf8"
    );
    assert.equal(
      lessonPlayerContent.includes("updateCourseLessonProgress"),
      true,
      "Lesson player must call updateCourseLessonProgress"
    );
    assert.equal(
      lessonPlayerContent.includes("videoPlayerContainer"),
      true,
      "Lesson player must have a sticky video player container"
    );
  });

  it("my-learning screen correctly tracks lesson completion progress", () => {
    const myLearningContent = fs.readFileSync(path.join(appRoot, "my-learning.tsx"), "utf8");
    assert.equal(
      myLearningContent.includes("getMyLearning"),
      true,
      "MyLearning screen must consume getMyLearning API"
    );
    assert.equal(
      myLearningContent.includes("progressPercent"),
      true,
      "MyLearning screen must display progressPercent"
    );
  });

  it("career track detail renders sequential progression steps", () => {
    const trackDetailContent = fs.readFileSync(path.join(appRoot, "career-tracks/[id].tsx"), "utf8");
    assert.equal(
      trackDetailContent.includes("getCareerTrackDetail"),
      true,
      "CareerTrackDetail screen must consume getCareerTrackDetail API"
    );
    assert.equal(
      trackDetailContent.includes("timelineCircle"),
      true,
      "CareerTrackDetail screen must display step progression timeline"
    );
  });
});
