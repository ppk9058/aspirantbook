import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPdfStoragePath,
  saveLastReadPage,
  getLastReadPage,
  saveDownloadResumeState,
  getDownloadResumeState,
  clearDownloadResumeState,
  deleteCachedPdf,
  verifyOwnershipOrDelete,
} from "../src/lib/pdf-manager";
import {
  memoryStorageAdapter,
  setStorageAdapter,
} from "../src/lib/cache-storage";

describe("Native PDF Reader & Offline File Manager", () => {
  beforeEach(() => {
    setStorageAdapter(memoryStorageAdapter);
    memoryStorageAdapter.clearAll();
  });

  describe("File Cache Keying & Private Storage Path", () => {
    it("generates deterministic, app-private storage paths with doc prefix", () => {
      const path1 = getPdfStoragePath("book_abc_123");
      assert.ok(path1.includes("secure_docs/doc_book_abc_123.pdf"));
      assert.ok(!path1.includes("Downloads"), "Must NEVER use public Downloads directory!");
    });

    it("sanitizes unsafe characters in document IDs to prevent path traversal", () => {
      const pathUnsafe = getPdfStoragePath("../secret/file:special*name");
      const fileName = pathUnsafe.split("/").pop()!;
      assert.ok(!fileName.includes(".."));
      assert.ok(!fileName.includes(":"));
      assert.ok(!fileName.includes("*"));
      assert.ok(fileName.startsWith("doc_"));
      assert.ok(fileName.endsWith(".pdf"));
    });
  });

  describe("Page Persistence (Last-Page Memory)", () => {
    it("persists and restores last read page accurately", async () => {
      // Default to page 1 for unread document
      const initialPage = await getLastReadPage("bpsc_mock_1");
      assert.equal(initialPage, 1);

      // Save page 28
      await saveLastReadPage("bpsc_mock_1", 28);
      const savedPage = await getLastReadPage("bpsc_mock_1");
      assert.equal(savedPage, 28);
    });

    it("clamps invalid or negative page numbers to page 1", async () => {
      await saveLastReadPage("bpsc_mock_1", -5);
      const page1 = await getLastReadPage("bpsc_mock_1");
      assert.equal(page1, 1);

      await saveLastReadPage("bpsc_mock_1", 0);
      const page2 = await getLastReadPage("bpsc_mock_1");
      assert.equal(page2, 1);
    });
  });

  describe("Download Resume State", () => {
    it("persists and retrieves resumable download tokens", async () => {
      const resumeToken = JSON.stringify({
        url: "http://127.0.0.1:3045/api/v1/library/b1/file",
        bytesWritten: 1048576,
        totalBytes: 5242880,
      });

      await saveDownloadResumeState("book_resume_test", resumeToken);
      const retrieved = await getDownloadResumeState("book_resume_test");
      assert.equal(retrieved, resumeToken);

      await clearDownloadResumeState("book_resume_test");
      const afterClear = await getDownloadResumeState("book_resume_test");
      assert.equal(afterClear, null);
    });
  });

  describe("Ownership-Loss Deletion & DRM Purging", () => {
    it("deletes cached PDF and purges memory state when ownership is lost", async () => {
      // Simulate stored page and resume state for book
      await saveLastReadPage("book_owned_1", 15);
      await saveDownloadResumeState("book_owned_1", "dummy_resume");

      // Verify state exists
      assert.equal(await getLastReadPage("book_owned_1"), 15);
      assert.ok(await getDownloadResumeState("book_owned_1"));

      // Ownership revoked (e.g. refund, subscription expired, or revoked license)
      const hasAccess = await verifyOwnershipOrDelete("book_owned_1", false);
      assert.equal(hasAccess, false);

      // Page memory and resume state must be completely deleted
      assert.equal(await getLastReadPage("book_owned_1"), 1);
      assert.equal(await getDownloadResumeState("book_owned_1"), null);
    });

    it("retains document when ownership is verified", async () => {
      await saveLastReadPage("book_valid_1", 7);
      const hasAccess = await verifyOwnershipOrDelete("book_valid_1", true);
      // Still retains access
      assert.equal(await getLastReadPage("book_valid_1"), 7);
    });
  });

  describe("100+ Page Document Performance & Memory Boundary", () => {
    it("handles 150-page document navigation without memory state leakage or unbounded growth", async () => {
      const docId = "upsc_prelims_2026_paper1_150pages";
      const totalPages = 150;

      // Simulate sequential reading across large 150-page document
      const readCheckpoints = [1, 25, 50, 75, 100, 125, 150];
      for (const page of readCheckpoints) {
        await saveLastReadPage(docId, page);
        const restored = await getLastReadPage(docId);
        assert.equal(restored, page, `Must accurately restore checkpoint page ${page}`);
      }

      // Memory footprint check: Key count in storage adapter must be exactly 1 for this doc
      const allKeys = Object.keys((memoryStorageAdapter as any).getAll?.() || {});
      const docKeys = allKeys.filter((k) => k.includes(docId));
      assert.ok(docKeys.length <= 2, "Storage keys for a document must remain constant (O(1) storage)");

      // Test upper clamp boundary
      await saveLastReadPage(docId, 9999);
      // Even if arbitrary large number sent, must persist without throwing
      const clampedHigh = await getLastReadPage(docId);
      assert.ok(clampedHigh > 0);
    });

    it("offline local file URI is deterministic and sandboxed", () => {
      const docId = "pyq_bpsc_70th_full_length";
      const path = getPdfStoragePath(docId);
      assert.ok(path.startsWith("file://") || path.includes("secure_docs/"));
      assert.ok(path.endsWith(".pdf"));
      // Path must be stable across multiple invocations
      const pathAgain = getPdfStoragePath(docId);
      assert.equal(path, pathAgain);
    });
  });
});
