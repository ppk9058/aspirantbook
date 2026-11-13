import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getWebOrigin,
  buildWebUrl,
  openWebUrl,
  buildWhatsAppSupportUrl,
  SUPPORT_WHATSAPP_NUMBER,
} from "../src/lib/web-links";

describe("T5: Centralized Web Origin & Link Builder", () => {
  const origWeb = process.env.EXPO_PUBLIC_WEB_URL;
  const origApi = process.env.EXPO_PUBLIC_API_URL;

  it("derives origin from EXPO_PUBLIC_WEB_URL when available", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://staging.example.com";
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(getWebOrigin(), "https://staging.example.com");
  });

  it("derives origin by stripping /api/v1 from EXPO_PUBLIC_API_URL", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    process.env.EXPO_PUBLIC_API_URL = "http://192.168.1.100:3045/api/v1";
    assert.equal(getWebOrigin(), "http://192.168.1.100:3045");

    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3046/api/v1/";
    assert.equal(getWebOrigin(), "http://localhost:3046");
  });

  it("falls back to null if env vars are unset", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(getWebOrigin(), null);
  });

  it("returns null for buildWebUrl when origin is null", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(buildWebUrl("/pricing"), null);
  });

  it("builds web url with utm_source=mobile_app and optional campaign when origin is configured", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://example.com";

    // Simple path
    const url1 = buildWebUrl("/pricing", "pass_tab");
    assert.equal(url1, "https://example.com/pricing?utm_source=mobile_app&utm_campaign=pass_tab");

    // Path without leading slash
    const url2 = buildWebUrl("courses/upsc-prep", "course_enroll");
    assert.equal(url2, "https://example.com/courses/upsc-prep?utm_source=mobile_app&utm_campaign=course_enroll");

    // Path with existing query parameter
    const url3 = buildWebUrl("/search?q=history", "global_search");
    assert.equal(url3, "https://example.com/search?q=history&utm_source=mobile_app&utm_campaign=global_search");

    // Path without campaign
    const url4 = buildWebUrl("/terms");
    assert.equal(url4, "https://example.com/terms?utm_source=mobile_app");
  });

  it("openWebUrl returns error when web origin is unconfigured", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    const res = await openWebUrl("/pricing");
    assert.equal(res.success, false);
    assert.equal(res.error, "Web address not configured.");
  });

  it("builds the WhatsApp support deep link with a pre-filled message", () => {
    assert.equal(SUPPORT_WHATSAPP_NUMBER, "8340665934");
    assert.equal(
      buildWhatsAppSupportUrl(),
      "https://wa.me/918340665934?text=" +
        encodeURIComponent("Hi AspirantBook team, I need help with my preparation.")
    );
    assert.equal(
      buildWhatsAppSupportUrl("Need help with BPSC batch"),
      "https://wa.me/918340665934?text=Need%20help%20with%20BPSC%20batch"
    );
  });

  // Restore env vars
  it("restores original environment variables", () => {
    if (origWeb) process.env.EXPO_PUBLIC_WEB_URL = origWeb;
    else delete process.env.EXPO_PUBLIC_WEB_URL;

    if (origApi) process.env.EXPO_PUBLIC_API_URL = origApi;
    else delete process.env.EXPO_PUBLIC_API_URL;
  });
});

describe("T5: Static Zero-Hardcoded-Domain Enforcement Scan", () => {
  it("verifies zero occurrences of literal domain in apps/mobile/src and apps/mobile/tests", () => {
    const forbidden = ["trillion", "skill.com"].join("");
    const mobileRoot = path.resolve(__dirname, "..");
    const dirsToScan = [path.join(mobileRoot, "src"), path.join(mobileRoot, "tests")];
    const violations: { file: string; line: number; text: string }[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes(forbidden)) {
              violations.push({
                file: path.relative(mobileRoot, fullPath),
                line: idx + 1,
                text: line.trim(),
              });
            }
          });
        }
      }
    }

    dirsToScan.forEach(scanDir);
    assert.deepEqual(
      violations,
      [],
      `Found ${violations.length} forbidden '${forbidden}' instances in apps/mobile:\n` +
        violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join("\n")
    );
  });
});
