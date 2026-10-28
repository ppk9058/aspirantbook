import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"

import { sendEmail } from "@/lib/email"

/**
 * C2: `sendEmail` in production without RESEND_API_KEY used to treat itself as a
 * dev environment, append the message to logs/dev-email-outbox.jsonl (read-only
 * on serverless) and return `{ success: true }`. Password-reset and
 * verification mail therefore reported "sent" and never left the server.
 */

const OUTBOX = path.join(process.cwd(), "logs/dev-email-outbox.jsonl")
const originalEnv = { ...process.env }

/** `process.env.NODE_ENV` is typed readonly; the runtime value is what matters. */
function setNodeEnv(value: string) {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = value
}

async function outboxMtime(): Promise<number | null> {
  return fs
    .stat(OUTBOX)
    .then((s) => s.mtimeMs)
    .catch(() => null)
}

describe("C2 email transport fails closed in production", () => {
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("reports failure in production when no provider key is configured", async () => {
    delete process.env.RESEND_API_KEY
    setNodeEnv("production")
    delete process.env.APP_ENV

    const before = await outboxMtime()
    const result = await sendEmail({
      to: "c2-production@example.test",
      subject: "Should not be recorded",
      html: "<p>production</p>",
    })
    const after = await outboxMtime()

    assert.equal(result.success, false, "a mail that cannot be sent must not report success")
    assert.equal(after, before, "the production path must not append to the dev outbox")
  })

  it("still records to the outbox in the test environment", async () => {
    delete process.env.RESEND_API_KEY
    setNodeEnv("test")
    process.env.APP_ENV = "test"

    const result = await sendEmail({
      to: "c2-test@example.test",
      subject: "Recorded in the test outbox",
      html: '<p><a href="http://127.0.0.1:3045/reset-password?token=c2-token">reset</a></p>',
    })

    assert.equal(result.success, true)
    assert.ok(result.id, "the outbox record id is returned")

    const content = await fs.readFile(OUTBOX, "utf-8")
    assert.equal(content.includes("c2-test@example.test"), true)
  })
})
