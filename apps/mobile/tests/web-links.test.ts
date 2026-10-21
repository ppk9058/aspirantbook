import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getWebOrigin, buildWebUrl } from "../src/lib/web-links";

describe("T7: Centralized Web Origin & Link Builder", () => {
  const origWeb = process.env.EXPO_PUBLIC_WEB_URL;
  const origApi = process.env.EXPO_PUBLIC_API_URL;

  it("derives origin from EXPO_PUBLIC_WEB_URL when available", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://staging.trillionskill.com";
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(getWebOrigin(), "https://staging.trillionskill.com");
  });

  it("derives origin by stripping /api/v1 from EXPO_PUBLIC_API_URL", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    process.env.EXPO_PUBLIC_API_URL = "http://192.168.1.100:3045/api/v1";
    assert.equal(getWebOrigin(), "http://192.168.1.100:3045");

    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3046/api/v1/";
    assert.equal(getWebOrigin(), "http://localhost:3046");
  });

  it("falls back to default production web origin if env vars are unset", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(getWebOrigin(), "https://trillionskill.com");
  });

  it("builds web url with utm_source=mobile_app and optional campaign", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://trillionskill.com";

    // Simple path
    const url1 = buildWebUrl("/pricing", "pass_tab");
    assert.equal(url1, "https://trillionskill.com/pricing?utm_source=mobile_app&utm_campaign=pass_tab");

    // Path without leading slash
    const url2 = buildWebUrl("courses/upsc-prep", "course_enroll");
    assert.equal(url2, "https://trillionskill.com/courses/upsc-prep?utm_source=mobile_app&utm_campaign=course_enroll");

    // Path with existing query parameter
    const url3 = buildWebUrl("/search?q=history", "global_search");
    assert.equal(url3, "https://trillionskill.com/search?q=history&utm_source=mobile_app&utm_campaign=global_search");

    // Path without campaign
    const url4 = buildWebUrl("/terms");
    assert.equal(url4, "https://trillionskill.com/terms?utm_source=mobile_app");
  });

  // Restore env vars
  it("restores original environment variables", () => {
    if (origWeb) process.env.EXPO_PUBLIC_WEB_URL = origWeb;
    else delete process.env.EXPO_PUBLIC_WEB_URL;

    if (origApi) process.env.EXPO_PUBLIC_API_URL = origApi;
    else delete process.env.EXPO_PUBLIC_API_URL;
  });
});

describe("T7: Static Zero-Hardcoded-URL Enforcement Scan", () => {
  it("verifies zero occurrences of literal 'https://trillionskill.com' in apps/mobile/src (except web-links.ts fallback)", () => {
    const srcDir = path.resolve(__dirname, "../src");
    const violations: { file: string; line: number; text: string }[] = [];

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          // Allow web-links.ts to declare the default fallback string
          if (fullPath.endsWith("web-links.ts")) continue;

          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes("https://trillionskill.com")) {
              violations.push({
                file: path.relative(srcDir, fullPath),
                line: idx + 1,
                text: line.trim(),
              });
            }
          });
        }
      }
    }

    scanDir(srcDir);
    assert.deepEqual(
      violations,
      [],
      `Found ${violations.length} hardcoded 'https://trillionskill.com' instances:\n` +
        violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join("\n")
    );
  });
});
