import { test, expect } from "@playwright/test"
import { sanitizeHtml, escapeHtml } from "../../lib/security/sanitizer"
import { validateUpload } from "../../lib/security/upload-validator"
import { sanitizeReturnPath } from "../../lib/utils/return-path"

test.describe("Security Hardening & Headers", () => {
    test("HTTP response contains required security headers", async ({ request }) => {
        const response = await request.get("/")
        expect(response.status()).toBe(200)

        const headers = response.headers()
        expect(headers["x-content-type-options"]).toBe("nosniff")
        expect(headers["x-frame-options"]).toBe("SAMEORIGIN")
        expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
        expect(headers["content-security-policy"]).toBeDefined()
        expect(headers["content-security-policy"]).toContain("default-src 'self'")
        expect(headers["content-security-policy"]).toContain("https://api.razorpay.com")
    })

    test("Open-redirect attack vectors are strictly sanitized by return path sanitizer", () => {
        const fallback = "/dashboard"
        // External URLs
        expect(sanitizeReturnPath("https://attacker.example.com/steal-creds", fallback)).toBe(fallback)
        expect(sanitizeReturnPath("http://evil.com", fallback)).toBe(fallback)

        // Protocol-relative URLs
        expect(sanitizeReturnPath("//attacker.example.com", fallback)).toBe(fallback)
        expect(sanitizeReturnPath("/\\evil.com", fallback)).toBe(fallback)

        // JavaScript schemes & control characters
        expect(sanitizeReturnPath("javascript:alert(1)", fallback)).toBe(fallback)
        expect(sanitizeReturnPath("/dashboard\r\nSet-Cookie: evil=true", fallback)).toBe(fallback)

        // Legitimate relative paths are preserved
        expect(sanitizeReturnPath("/courses/upsc", fallback)).toBe("/courses/upsc")
        expect(sanitizeReturnPath("/dashboard?tab=overview", fallback)).toBe("/dashboard?tab=overview")
    })

    test("Login page preserves internal navigation without external redirect", async ({ page }) => {
        await page.goto("/login?callbackUrl=https://attacker.example.com")
        await page.waitForLoadState("domcontentloaded")

        // Should not redirect offsite
        expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3045")
    })

    test("IDOR attack: unauthenticated / unauthorized access to protected eBook downloads is rejected", async ({ request }) => {
        const res = await request.get("/api/books/cbse-10-pyqs-past-10-years-2027/download")
        expect(res.status()).toBe(403)
        const body = await res.json()
        expect(body.error).toContain("Access Denied")
    })

    test("IDOR attack: unauthenticated access to exam attempt details is rejected", async ({ request }) => {
        const res = await request.get("/api/exam/attempt/random-attempt-uuid")
        expect(res.status()).toBe(401)
    })

    test("Unauthenticated access to protected admin and teacher endpoints is rejected", async ({ request }) => {
        const adminRes = await request.get("/api/admin/users/export")
        expect([401, 403]).toContain(adminRes.status())

        const uploadRes = await request.post("/api/upload")
        expect([401, 400]).toContain(uploadRes.status())

        const teacherRes = await request.get("/api/teacher/courses")
        expect([401, 403]).toContain(teacherRes.status())
    })

    test("XSS sanitizer strips malicious tags and scripts while preserving safe text", () => {
        const dirtyPayload = "<p>Welcome to <strong>TrillionSkill</strong><script>alert('xss')</script><img src=x onerror=alert(1)><a href='javascript:void(0)'>Click</a></p>"
        const clean = sanitizeHtml(dirtyPayload)

        expect(clean).not.toContain("<script")
        expect(clean).not.toContain("alert('xss')")
        expect(clean).not.toContain("onerror")
        expect(clean).not.toContain("javascript:")
        expect(clean).toContain("Welcome to")
        expect(clean).toContain("<strong>TrillionSkill</strong>")

        const escaped = escapeHtml("<script>alert(1)</script>")
        expect(escaped).toBe("&lt;script&gt;alert(1)&lt;/script&gt;")
    })

    test("Upload security validator rejects malicious extensions and spoofed MIME types", () => {
        // Executable extension rejection
        const exeResult = validateUpload(
            { name: "malware.exe", size: 1024, type: "application/x-msdownload" },
            Buffer.from("MZfakeexe"),
            "image"
        )
        expect(exeResult.valid).toBe(false)
        expect(exeResult.error).toContain("prohibited")

        // PHP shell rejection
        const phpResult = validateUpload(
            { name: "shell.php", size: 1024, type: "image/jpeg" },
            Buffer.from("<?php echo 'hacked'; ?>"),
            "image"
        )
        expect(phpResult.valid).toBe(false)
        expect(phpResult.error).toContain("prohibited")

        // Magic bytes mismatch (pretending to be PNG but actually plain text)
        const fakePng = validateUpload(
            { name: "spoofed.png", size: 1024, type: "image/png" },
            Buffer.from("This is not a png file"),
            "image"
        )
        expect(fakePng.valid).toBe(false)
        expect(fakePng.error).toContain("File signature does not match")
    })

    test("Test health endpoint is active only in test environment", async ({ request }) => {
        const res = await request.get("/api/test/health")
        expect(res.status()).toBe(200)
        const data = await res.json()
        expect(data.ok).toBe(true)
        expect(data.isTestDb).toBe(true)
    })

    test("Dev debug routes and dev bypasses are disabled or return 404", async ({ request }) => {
        // Debug route is strictly disabled/404
        const debugRes = await request.get("/api/auth/debug")
        expect([200, 404]).toContain(debugRes.status())
        if (debugRes.status() === 200) {
            const data = await debugRes.json()
            expect(data.status).toBe("debug_disabled")
        }

        // Random non-existent test endpoints return 404
        const nonExistentTestRes = await request.get("/api/test/non-existent-probe")
        expect(nonExistentTestRes.status()).toBe(404)
    })
})
