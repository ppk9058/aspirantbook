import assert from "node:assert/strict"
import { test, describe, before, after } from "node:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const root = path.join(os.tmpdir(), `audit2-bookroot-${Date.now()}`)

let mod: typeof import("../../lib/books/book-file-storage")
let validation: typeof import("../../lib/books/book-validation")

before(async () => {
  await fs.mkdir(root, { recursive: true })
  await fs.writeFile(path.join(root, "real.pdf"), "%PDF-1.4 real")
  await fs.writeFile(path.join(os.tmpdir(), "audit2-outside.pdf"), "%PDF-1.4 outside")
  await fs.symlink(
    path.join(os.tmpdir(), "audit2-outside.pdf"),
    path.join(root, "escape.pdf")
  )
  process.env.BOOK_STORAGE_ROOT = root
  mod = await import("../../lib/books/book-file-storage")
  validation = await import("../../lib/books/book-validation")
})

after(async () => {
  await fs.rm(root, { recursive: true, force: true })
  await fs.rm(path.join(os.tmpdir(), "audit2-outside.pdf"), { force: true })
})

describe("A5 book storage key policy", () => {
  test("rejects traversal, absolute paths and remote URLs", () => {
    const bad = [
      "../../etc/passwd",
      "../secret.pdf",
      "/etc/passwd",
      "/uploads/../../etc/passwd",
      "uploads/../../etc/passwd",
      "a/../../b.pdf",
      "..\\..\\windows\\win.ini",
      "http://evil.test/x.pdf",
      "https://evil.test/x.pdf",
      "uploads/\0/x.pdf",
    ]
    for (const value of bad) {
      assert.equal(mod.normalizeBookStorageKey(value), null, `should reject: ${value}`)
    }
  })

  test("accepts storage keys and legacy public paths", () => {
    assert.equal(mod.normalizeBookStorageKey("uploads/books/a.pdf"), "uploads/books/a.pdf")
    assert.equal(mod.normalizeBookStorageKey("/uploads/books/a.pdf"), "uploads/books/a.pdf")
    assert.equal(mod.normalizeBookStorageKey("/images/books/a.pdf"), "images/books/a.pdf")
    assert.equal(mod.normalizeBookStorageKey("books/a.pdf"), "books/a.pdf")
  })

  test("resolves a real key inside the configured root", async () => {
    const resolved = await mod.resolveBookFilePath("real.pdf")
    assert.equal(resolved, await fs.realpath(path.join(root, "real.pdf")))
    const buf = await mod.readBookFile("real.pdf")
    assert.ok(buf.toString().startsWith("%PDF-1.4 real"))
  })

  test("rejects a symlink that escapes the root", async () => {
    await assert.rejects(
      () => mod.resolveBookFilePath("escape.pdf"),
      (err: any) => err?.status === 403
    )
  })

  test("a missing file is a 404, never a fabricated PDF", async () => {
    await assert.rejects(
      () => mod.readBookFile("missing.pdf"),
      (err: any) => err?.status === 404 && /not found/i.test(err.message)
    )
  })

  test("traversal input to readBookFile is rejected before touching disk", async () => {
    await assert.rejects(
      () => mod.readBookFile("../../etc/passwd"),
      (err: any) => err?.status === 400
    )
  })
})

describe("A5/A12 book update allowlist", () => {
  test("strips unknown fields such as createdBy", () => {
    const parsed = validation.bookUpdateSchema.parse({
      title: "Safe title",
      createdBy: { id: "attacker" },
      id: "hacked",
      fullPdfUrl: "uploads/books/a.pdf",
    } as any)
    assert.equal((parsed as any).createdBy, undefined)
    assert.equal((parsed as any).id, undefined)
    assert.equal(parsed.fullPdfUrl, "uploads/books/a.pdf")
  })

  test("rejects a traversal fullPdfUrl", () => {
    const result = validation.bookUpdateSchema.safeParse({ fullPdfUrl: "../../etc/passwd" })
    assert.equal(result.success, false)
  })

  test("rejects an absolute fullPdfUrl", () => {
    const result = validation.bookUpdateSchema.safeParse({ fullPdfUrl: "/etc/passwd" })
    assert.equal(result.success, false)
  })
})
