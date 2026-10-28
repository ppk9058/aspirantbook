import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "../src");
const APP_DIR = path.resolve(__dirname, "../src/app");

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Checks if a given route pattern can be resolved to a file on disk under src/app.
 * Supports static routes, Expo route groups `(group)`, and dynamic parameters `[param]`.
 */
export function routeExistsOnDisk(targetRoute: string): boolean {
  if (!targetRoute) return false;
  if (targetRoute.startsWith("http://") || targetRoute.startsWith("https://")) return true;

  // Strip query params or hash
  const clean = targetRoute.split("?")[0].split("#")[0].trim();
  if (clean === "" || clean === "/") {
    return fs.existsSync(path.join(APP_DIR, "index.tsx"));
  }

  const segments = clean.split("/").filter(Boolean);

  function matchSegments(currentDir: string, segIdx: number): boolean {
    if (segIdx >= segments.length) {
      // Reached the end: check if there's an index.tsx in currentDir
      return fs.existsSync(path.join(currentDir, "index.tsx"));
    }

    const curSeg = segments[segIdx];
    const isLastSeg = segIdx === segments.length - 1;

    // Direct file match at last segment: <currentDir>/<curSeg>.tsx
    if (isLastSeg && fs.existsSync(path.join(currentDir, `${curSeg}.tsx`))) {
      return true;
    }

    // Direct directory match: <currentDir>/<curSeg>
    const directDir = path.join(currentDir, curSeg);
    if (fs.existsSync(directDir) && fs.statSync(directDir).isDirectory()) {
      if (matchSegments(directDir, segIdx + 1)) return true;
    }

    // Dynamic param match on current segment: e.g. [id], [slug], [lessonId]
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      // Dynamic folder: [param]
      if (entry.isDirectory() && entry.name.startsWith("[") && entry.name.endsWith("]")) {
        if (matchSegments(path.join(currentDir, entry.name), segIdx + 1)) return true;
      }
      // Dynamic file: [param].tsx (if last segment)
      if (isLastSeg && entry.isFile() && entry.name.startsWith("[") && entry.name.endsWith("].tsx")) {
        return true;
      }
      // Route group folder: (groupName) -> does not consume a route segment!
      if (entry.isDirectory() && entry.name.startsWith("(") && entry.name.endsWith(")")) {
        const groupDir = path.join(currentDir, entry.name);
        // Check if group folder has direct file match: (group)/<curSeg>.tsx
        if (isLastSeg && fs.existsSync(path.join(groupDir, `${curSeg}.tsx`))) {
          return true;
        }
        // Recurse into group directory without advancing segIdx
        if (matchSegments(groupDir, segIdx)) return true;
      }
    }

    return false;
  }

  return matchSegments(APP_DIR, 0);
}

describe("T10 Route Manifest Integrity & Mutation Test", () => {
  const allSrcFiles = getAllFiles(SRC_DIR);

  test("routeExistsOnDisk resolves all canonical static routes", () => {
    assert.equal(routeExistsOnDisk("/"), true, "Root route");
    assert.equal(routeExistsOnDisk("/search"), true, "Search");
    assert.equal(routeExistsOnDisk("/settings"), true, "Settings");
    assert.equal(routeExistsOnDisk("/subscription"), true, "Subscription");
    assert.equal(routeExistsOnDisk("/my-tests"), true, "My Tests");
    assert.equal(routeExistsOnDisk("/my-learning"), true, "My Learning");
    assert.equal(routeExistsOnDisk("/career-tracks"), true, "Career Tracks index");
    assert.equal(routeExistsOnDisk("/pyqs"), true, "PYQ index");
    assert.equal(routeExistsOnDisk("/current-affairs"), true, "Current Affairs");
    assert.equal(routeExistsOnDisk("/practice"), true, "Practice");
    assert.equal(routeExistsOnDisk("/(tabs)/home"), true, "(tabs)/home");
    assert.equal(routeExistsOnDisk("/(tabs)/tests"), true, "(tabs)/tests");
    assert.equal(routeExistsOnDisk("/(tabs)/courses"), true, "(tabs)/courses");
    assert.equal(routeExistsOnDisk("/(tabs)/pass"), true, "(tabs)/pass");
    assert.equal(routeExistsOnDisk("/(auth)/login"), true, "(auth)/login");
    assert.equal(routeExistsOnDisk("/(auth)/register"), true, "(auth)/register");
    assert.equal(routeExistsOnDisk("/(auth)/forgot-password"), true, "(auth)/forgot-password");
    assert.equal(routeExistsOnDisk("/(auth)/reset-password"), true, "(auth)/reset-password");
  });

  test("routeExistsOnDisk resolves all dynamic routes", () => {
    assert.equal(routeExistsOnDisk("/tests/[id]"), true, "/tests/[id]");
    assert.equal(routeExistsOnDisk("/tests/sample-test-id"), true, "/tests/:id");
    assert.equal(routeExistsOnDisk("/tests/sample-test-id/runner"), true, "/tests/:id/runner");
    assert.equal(routeExistsOnDisk("/tests/sample-test-id/result"), true, "/tests/:id/result");
    assert.equal(routeExistsOnDisk("/tests/sample-test-id/solutions"), true, "/tests/:id/solutions");
    assert.equal(routeExistsOnDisk("/tests/sample-test-id/leaderboard"), true, "/tests/:id/leaderboard");
    assert.equal(routeExistsOnDisk("/tests/series/sample-series-id"), true, "/tests/series/:id");
    assert.equal(routeExistsOnDisk("/courses/sample-course-id"), true, "/courses/:id");
    assert.equal(routeExistsOnDisk("/courses/course-1/lesson/lesson-10"), true, "/courses/:id/lesson/:lessonId");
    assert.equal(routeExistsOnDisk("/career-tracks/track-upsc"), true, "/career-tracks/:id");
    assert.equal(routeExistsOnDisk("/tutorials/python-basics"), true, "/tutorials/:slug");
    assert.equal(routeExistsOnDisk("/tutorials/python-basics/intro"), true, "/tutorials/:slug/:lessonId");
    assert.equal(routeExistsOnDisk("/reader/book-123"), true, "/reader/:id");
  });

  test("Every router navigation target across src/** maps to a real route on disk", () => {
    const routeRegexes = [
      /router\.(?:push|replace|navigate)\(\s*["'`]([^"'`$]+)["'`]/g,
      /router\.(?:push|replace|navigate)\(\s*\{\s*pathname:\s*["'`]([^"'`$]+)["'`]/g,
      /<Link[^>]*href=["'`]([^"'`$]+)["'`]/g,
      /<Link[^>]*href=\{\{\s*pathname:\s*["'`]([^"'`$]+)["'`]/g,
    ];

    const invalidTargets: { file: string; target: string }[] = [];
    const scannedTargets = new Set<string>();

    for (const filePath of allSrcFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const relPath = path.relative(SRC_DIR, filePath);

      for (const reg of routeRegexes) {
        reg.lastIndex = 0;
        let match;
        while ((match = reg.exec(content)) !== null) {
          const rawTarget = match[1].trim();
          scannedTargets.add(rawTarget);

          if (!routeExistsOnDisk(rawTarget)) {
            invalidTargets.push({ file: relPath, target: rawTarget });
          }
        }
      }
    }

    assert.ok(scannedTargets.size >= 15, `Expected >= 15 unique static routes scanned, got ${scannedTargets.size}`);
    assert.deepEqual(invalidTargets, [], `Found broken navigation targets: ${JSON.stringify(invalidTargets)}`);
  });

  test("MUTATION PROOF: Deliberately broken route targets are caught and fail routeExistsOnDisk", () => {
    const brokenRoutes = [
      "/nonexistent-screen-path",
      "/tests/mock-1/broken-subroute",
      "/courses/react-101/invalid/deep/path",
      "/admin/secret-dashboard",
      "/checkout/instant-pay",
    ];

    for (const broken of brokenRoutes) {
      const exists = routeExistsOnDisk(broken);
      assert.equal(exists, false, `Broken route "${broken}" MUST NOT exist on disk`);
    }
  });
});
