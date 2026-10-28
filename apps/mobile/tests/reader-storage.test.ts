import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveDownloadedFileUri,
  resolveReaderStorageTarget,
} from "../src/lib/reader-storage";

describe("Bug #7: reader storage must handle a null documentDirectory", () => {
  it("returns null paths instead of a bogus relative path", () => {
    const target = resolveReaderStorageTarget(null, "doc-1");
    assert.equal(target.directory, null);
    assert.equal(target.filePath, null);

    const undefinedTarget = resolveReaderStorageTarget(undefined, "doc-1");
    assert.equal(undefinedTarget.directory, null);
    assert.equal(undefinedTarget.filePath, null);
  });

  it("builds the app-private secure_docs path when storage is available", () => {
    const target = resolveReaderStorageTarget("file:///data/app/files/", "doc-1");
    assert.equal(target.directory, "file:///data/app/files/secure_docs");
    assert.equal(target.filePath, "file:///data/app/files/secure_docs/doc_doc-1.pdf");
  });

  it("sanitizes route ids so they cannot escape secure_docs", () => {
    const target = resolveReaderStorageTarget("file:///data/app/files/", "../../etc/passwd");
    assert.ok(target.filePath?.startsWith("file:///data/app/files/secure_docs/"));
    assert.equal(target.filePath?.includes(".."), false);
  });
});

describe("Bug #8: a failed download must never expose a local file URI", () => {
  it("resolves a missing download URI to null", () => {
    assert.equal(resolveDownloadedFileUri(undefined), null);
    assert.equal(resolveDownloadedFileUri(null), null);
    assert.equal(resolveDownloadedFileUri(""), null);
  });

  it("keeps a real downloaded URI", () => {
    const uri = "file:///data/app/files/secure_docs/doc_1.pdf";
    assert.equal(resolveDownloadedFileUri(uri), uri);
  });
});
