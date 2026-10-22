import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_DIR = path.resolve(__dirname, "../src/app");

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("T9 Fake Data Scan & Real API Integration Audit", () => {
  const screenFiles = getFilesRecursively(APP_DIR);

  test("Screen files must exist and be discovered", () => {
    assert.ok(screenFiles.length >= 25, `Expected >= 25 screen files, got ${screenFiles.length}`);
  });

  test("Zero screens import from mock/fixture paths", () => {
    const forbiddenImports = ["/mocks", "/fixtures", "__mocks__", "mock-data"];
    const violations: { file: string; line: string }[] = [];

    for (const file of screenFiles) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (const line of lines) {
        if (/^\s*import\s+/.test(line)) {
          for (const forbidden of forbiddenImports) {
            if (line.includes(forbidden)) {
              violations.push({ file: path.relative(APP_DIR, file), line: line.trim() });
            }
          }
        }
      }
    }

    assert.deepEqual(violations, [], `Discovered mock imports in screens: ${JSON.stringify(violations)}`);
  });

  test("Zero screens declare mock/fake data arrays (mockQuestions, sampleCourses, fakeProgress)", () => {
    const mockPatterns = [
      /\bconst\s+(?:mock|fake|sample|dummy)[A-Za-z0-9_]*\s*=\s*\[/i,
      /\blet\s+(?:mock|fake|sample|dummy)[A-Za-z0-9_]*\s*=\s*\[/i,
      /\bconst\s+[A-Za-z0-9_]*(?:MockData|FakeData|DummyData|SampleData)\s*=\s*\[/i,
      /\bconst\s+(?:mockQuestions|sampleCourses|fakeProgress|dummyQuestions)\b/i,
    ];

    const violations: { file: string; match: string }[] = [];

    for (const file of screenFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const pattern of mockPatterns) {
        const match = content.match(pattern);
        if (match) {
          violations.push({ file: path.relative(APP_DIR, file), match: match[0] });
        }
      }
    }

    assert.deepEqual(violations, [], `Found declared mock data arrays: ${JSON.stringify(violations)}`);
  });

  test("Data screens wire into real API client or WebOnlyScreen", () => {
    const coreDataScreens = [
      "courses/[id].tsx",
      "courses/[id]/lesson/[lessonId].tsx",
      "current-affairs/index.tsx",
      "my-learning.tsx",
      "my-tests.tsx",
      "pyqs/index.tsx",
      "search.tsx",
      "subscription.tsx",
      "tests/[id]/index.tsx",
      "tests/[id]/runner.tsx",
      "tests/[id]/result.tsx",
      "tests/[id]/solutions.tsx",
      "tests/series/[id].tsx",
      "(tabs)/courses.tsx",
      "(tabs)/home.tsx",
      "(tabs)/tests.tsx",
    ];

    for (const screenRel of coreDataScreens) {
      const fullPath = path.join(APP_DIR, screenRel);
      assert.ok(fs.existsSync(fullPath), `Expected screen to exist: ${screenRel}`);
      const content = fs.readFileSync(fullPath, "utf8");

      const hasApiWiring =
        content.includes("api.") ||
        content.includes("apiClient.") ||
        content.includes("useQuery(") ||
        content.includes("WebOnlyScreen");

      assert.ok(hasApiWiring, `Screen ${screenRel} has no real API client wiring or WebOnlyScreen`);
    }
  });

  test("Subscription screen wires into real GET /api/v1/subscriptions via getPurchases", () => {
    const subFile = path.join(APP_DIR, "subscription.tsx");
    const content = fs.readFileSync(subFile, "utf8");
    assert.ok(content.includes("api.getPurchases()"), "subscription.tsx must call api.getPurchases()");
    assert.ok(content.includes("historyList"), "subscription.tsx must render real subscription/payment history");
  });

  test("app.config.ts has no hardcoded IP or localhost fallbacks", () => {
    const configPath = path.resolve(__dirname, "../app.config.ts");
    const content = fs.readFileSync(configPath, "utf8");
    assert.ok(!content.includes("10.0.2.2"), "app.config.ts must not contain 10.0.2.2 fallback");
    assert.ok(!content.includes("localhost"), "app.config.ts must not contain localhost fallback");
  });
});
