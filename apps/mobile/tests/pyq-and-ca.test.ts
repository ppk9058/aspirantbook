import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { getPdfStoragePath } from "../src/lib/pdf-manager";

describe("Phase 5: PYQ and Current Affairs Screens & PDF Reader Parity", () => {
  const routes = [
    "src/app/pyqs/index.tsx",
    "src/app/pyqs/pdf-view.tsx",
    "src/app/current-affairs/index.tsx",
  ];

  it("P4(c) Route Manifest: PYQ and Current Affairs routes exist and export valid screens", () => {
    const baseDir = process.cwd().endsWith("apps/mobile") ? process.cwd() : path.resolve(process.cwd(), "apps/mobile");
    for (const relPath of routes) {
      const fullPath = path.resolve(baseDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Route file must exist: ${relPath}`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("export default function"),
        `Route file must define default export: ${relPath}`
      );
    }
  });

  it("PDF Storage Path: sanitizes special characters to avoid path traversal", () => {
    const safePath = getPdfStoragePath("upsc_prelims_2026");
    assert.ok(safePath.endsWith("doc_upsc_prelims_2026.pdf"));

    const unsafePath = getPdfStoragePath("../../etc/passwd");
    assert.ok(!unsafePath.includes(".."));
    assert.ok(unsafePath.endsWith("doc_______etc_passwd.pdf"));
  });
});
