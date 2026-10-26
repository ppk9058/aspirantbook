import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

import { test, expect } from "@playwright/test"
import crypto from "node:crypto"
import { createActor, newNonce, prisma } from "./test-series-e2e-helpers"
import { createAccessToken } from "@/lib/api/v1/tokens"

/**
 * B-011 regression: a revoked device session must be rejected on the very next
 * request. The old in-process viewer cache served the revoked viewer for up to 10s.
 */

const BASE = process.env.BASE_URL || "http://127.0.0.1:3045"

test.describe.configure({ mode: "serial" })

test.describe("B-011: API v1 viewer cache", () => {
  let userId = ""
  let email = ""
  let sessionId = ""

  test.beforeAll(async () => {
    const nonce = newNonce()
    const student = await createActor(nonce, "FREE", "viewer-cache")
    userId = student.id
    email = student.email

    const session = await prisma.deviceSession.create({
      data: {
        userId,
        refreshTokenHash: crypto.createHash("sha256").update(`refresh-${nonce}`).digest("hex"),
        familyId: `family-${nonce}`,
        platform: "android",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    sessionId = session.id
  })

  test.afterAll(async () => {
    try {
      await prisma.deviceSession.deleteMany({ where: { userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
    } catch (error) {
      console.error("[viewer-cache] cleanup failed", error)
    }
  })

  test("revoking a device session invalidates the viewer immediately", async ({ request }) => {
    const token = await createAccessToken({
      sub: userId,
      email,
      role: "FREE",
      sessionVersion: 1,
      familyId: `family-${userId}`,
      sessionId,
    })

    const call = () =>
      request.get(`${BASE}/api/v1/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })

    const before = await call()
    expect(before.status()).toBe(200)

    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })

    // No sleep: the revocation must take effect on the next request.
    const after = await call()
    expect(after.status()).toBe(401)
  })
})
