import assert from "node:assert/strict"
import { test, describe } from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import {
  assertSafeUploadName,
  validateUploadForStorage,
  storeUpload,
  UploadError,
  DANGEROUS_EXTENSIONS,
} from "../../lib/security/upload-policy"

function fakeFile(name: string, type: string, bytes: Buffer): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 0),
])
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (t) >>\nendobj\ntrailer\n%%EOF\n", "utf8")
const HTML = Buffer.from("<html><script>alert(1)</script></html>", "utf8")

describe("A6 upload name policy", () => {
  test("rejects traversal and path segments", () => {
    for (const name of [
      "../x.png",
      "../../etc/passwd",
      "a/b.png",
      "a\\b.png",
      "/etc/passwd.png",
      "..\\..\\x.png",
    ]) {
      assert.throws(() => assertSafeUploadName(name), (err: any) => err.status === 400, `should reject ${name}`)
    }
  })

  test("rejects svg, html, php and double extensions", () => {
    for (const name of [
      "logo.svg",
      "logo.SVG",
      "page.html",
      "page.htm",
      "shell.php",
      "shell.php.jpg",
      "shell.phtml.png",
      "x.html.png",
      "x.svg.png",
      "x.js.pdf",
    ]) {
      assert.throws(() => assertSafeUploadName(name), (err: any) => err.status === 400, `should reject ${name}`)
    }
  })

  test("rejects hidden files and missing extensions", () => {
    assert.throws(() => assertSafeUploadName(".env"), /Invalid file name|extension/)
    assert.throws(() => assertSafeUploadName("noextension"), /extension/)
  })

  test("accepts ordinary image and document names", () => {
    assert.doesNotThrow(() => assertSafeUploadName("cover.png"))
    assert.doesNotThrow(() => assertSafeUploadName("chapter-1.pdf"))
    assert.doesNotThrow(() => assertSafeUploadName("lesson video.mp4"))
  })

  test("the dangerous list covers executable and markup types", () => {
    for (const ext of [".svg", ".html", ".php", ".js", ".exe"]) {
      assert.ok(DANGEROUS_EXTENSIONS.includes(ext), `${ext} must be blocked`)
    }
  })
})

describe("A6 upload content validation", () => {
  test("uses a server-generated name, never the caller name", () => {
    const file = fakeFile("my holiday photo.png", "image/png", PNG)
    const out = validateUploadForStorage(file, PNG, "image")
    assert.match(out.fileName, /^[0-9a-f-]{36}\.png$/)
    assert.ok(!out.fileName.includes("holiday"))
  })

  test("rejects html content disguised as an image", () => {
    const file = fakeFile("evil.png", "image/png", HTML)
    assert.throws(() => validateUploadForStorage(file, HTML, "image"), (err: any) => err.status === 400)
  })

  test("rejects svg content even with an image mime", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>', "utf8")
    const file = fakeFile("x.png", "image/png", svg)
    assert.throws(() => validateUploadForStorage(file, svg, "image"), (err: any) => err.status === 400)
  })

  test("oversized uploads are a 413", () => {
    const file = fakeFile("big.pdf", "application/pdf", PDF)
    assert.throws(
      () => validateUploadForStorage(file, PDF, "pdf", 10),
      (err: any) => err.status === 413
    )
  })

  test("a valid PDF is accepted", () => {
    const file = fakeFile("paper.pdf", "application/pdf", PDF)
    const out = validateUploadForStorage(file, PDF, "pdf")
    assert.equal(out.mimeType, "application/pdf")
    assert.match(out.fileName, /\.pdf$/)
  })
})

describe("A6 storage fallback", () => {
  test("test environment stores under public/uploads with a generated name", async () => {
    const file = fakeFile("cover.png", "image/png", PNG)
    const stored = await storeUpload({ file, buffer: PNG, category: "image", folder: "audit2-tests" })
    assert.equal(stored.storage, "local")
    assert.match(stored.url, /^\/uploads\/audit2-tests\/[0-9a-f-]{36}\.png$/)
    const onDisk = path.join(process.cwd(), "public", stored.url.replace(/^\//, ""))
    const bytes = await fs.readFile(onDisk)
    assert.deepEqual(bytes, PNG)
    await fs.rm(onDisk, { force: true })
  })

  test("private visibility stays outside /public", async () => {
    const file = fakeFile("paper.pdf", "application/pdf", PDF)
    const stored = await storeUpload({
      file,
      buffer: PDF,
      category: "pdf",
      folder: "audit2-private",
      visibility: "private",
    })
    assert.equal(stored.url, `/uploads/audit2-private/${stored.fileName}`)
    const privatePath = path.join(process.cwd(), "uploads", "audit2-private", stored.fileName)
    const bytes = await fs.readFile(privatePath)
    assert.deepEqual(bytes, PDF)
    await fs.rm(privatePath, { force: true })
  })

  test("a rejected upload never reaches storage", async () => {
    const file = fakeFile("x.svg", "image/svg+xml", Buffer.from("<svg/>"))
    await assert.rejects(
      () => storeUpload({ file, buffer: Buffer.from("<svg/>"), category: "image", folder: "audit2-tests" }),
      (err: any) => err instanceof UploadError || err.status === 400
    )
  })
})
