import { test, expect } from "@playwright/test"

/**
 * A6: every upload route must reject dangerous types, traversal names,
 * double extensions and oversize payloads, and must store a valid file under a
 * server-generated name. Runs against the isolated 3045 test server.
 */

const ADMIN_HEADERS = { Cookie: "ts_demo_role=ADMIN" }

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(128, 0),
])
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (audit2) >>\nendobj\ntrailer\n%%EOF\n", "utf8")

const ROUTES = [
  "/api/books/upload",
  "/api/admin/courses/upload",
  "/api/admin/pyqs/upload",
  "/api/admin/current-affairs/upload",
  "/api/courses/teacher-photo-upload",
  "/api/upload",
]

test.describe("A6 upload hardening", () => {
  for (const route of ROUTES) {
    test(`${route}: rejects .svg, .html and double extensions`, async ({ request }) => {
      for (const [name, mimeType] of [
        ["logo.svg", "image/svg+xml"],
        ["page.html", "text/html"],
        ["shell.php.png", "image/png"],
        ["shell.html.jpg", "image/jpeg"],
      ] as const) {
        const res = await request.post(route, {
          headers: ADMIN_HEADERS,
          multipart: {
            file: { name, mimeType, buffer: PNG },
            type: "image",
          },
        })
        expect(
          res.status(),
          `${route} must reject ${name} (got ${res.status()}: ${await res.text()})`
        ).toBeGreaterThanOrEqual(400)
        expect(res.status()).toBeLessThan(500)
      }
    })
  }

  test("traversal file names are rejected", async ({ request }) => {
    for (const name of ["../../etc/passwd.png", "..\\..\\windows\\x.png", "/tmp/x.png"]) {
      const res = await request.post("/api/admin/courses/upload", {
        headers: ADMIN_HEADERS,
        multipart: { file: { name, mimeType: "image/png", buffer: PNG } },
      })
      expect(res.status(), `traversal ${name}`).toBe(400)
    }
  })

  test("oversized uploads return 413", async ({ request }) => {
    const big = Buffer.concat([PNG, Buffer.alloc(16 * 1024 * 1024, 0)])
    const res = await request.post("/api/courses/teacher-photo-upload", {
      headers: ADMIN_HEADERS,
      multipart: { file: { name: "huge.png", mimeType: "image/png", buffer: big } },
    })
    expect(res.status()).toBe(413)
  })

  test("a valid image is stored under a generated name and is served back", async ({ request }) => {
    const res = await request.post("/api/admin/courses/upload", {
      headers: ADMIN_HEADERS,
      multipart: { file: { name: "my cover photo.png", mimeType: "image/png", buffer: PNG } },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.url).toMatch(/^\/uploads\/courses\/[0-9a-f-]{36}\.png$/)
    expect(body.url).not.toContain("my cover photo")
    expect(body.fileName).not.toContain("my cover photo")

    const fetched = await request.get(body.url)
    expect(fetched.status()).toBe(200)
    expect(fetched.headers()["content-type"]).toContain("image/png")
  })

  test("pyq and current-affairs accept a real PDF and reject a disguised one", async ({ request }) => {
    for (const route of ["/api/admin/pyqs/upload", "/api/admin/current-affairs/upload"]) {
      const ok = await request.post(route, {
        headers: ADMIN_HEADERS,
        multipart: { file: { name: "paper-2026.pdf", mimeType: "application/pdf", buffer: PDF } },
      })
      expect(ok.status(), route).toBe(200)
      const body = await ok.json()
      expect(body.url).toMatch(/\.pdf$/)

      const bad = await request.post(route, {
        headers: ADMIN_HEADERS,
        multipart: { file: { name: "paper.pdf", mimeType: "application/pdf", buffer: PNGBufferAsPdf() } },
      })
      expect(bad.status(), `${route} fake pdf`).toBe(400)
    }
  })

  test("anonymous callers cannot upload", async ({ request }) => {
    for (const route of ["/api/admin/courses/upload", "/api/books/upload", "/api/upload"]) {
      const res = await request.post(route, {
        multipart: { file: { name: "x.png", mimeType: "image/png", buffer: PNG } },
      })
      expect([401, 403], `${route} anonymous`).toContain(res.status())
    }
  })
})

function PNGBufferAsPdf() {
  return Buffer.from("<html>not a pdf</html>", "utf8")
}
