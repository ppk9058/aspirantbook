import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"

import { assertTestDatabase } from "@/lib/test-db-guard"
import { prisma } from "@/lib/prisma"
import { consumeReauthToken, isReauthTokenUsed } from "@/lib/api/v1/tokens"

/**
 * B-007 class regression: single-use re-auth tokens are recorded in the
 * database, not in a per-instance Map. Two parallel consumptions of the same
 * jti must yield exactly one success, and a second verify must be rejected.
 */

const created: string[] = []

function jti() {
  const value = `test-reauth-${crypto.randomUUID()}`
  created.push(value)
  return value
}

describe("re-auth token single use (database backed)", () => {
  before(() => {
    assertTestDatabase({ context: "tests/unit/reauth-token-single-use.test.ts" })
  })

  after(async () => {
    if (created.length > 0) {
      await prisma.reauthTokenUse.deleteMany({ where: { jti: { in: created } } })
    }
  })

  it("consumes a token once and rejects the second use", async () => {
    const tokenJti = jti()
    assert.equal(await isReauthTokenUsed(tokenJti), false)
    assert.equal(await consumeReauthToken(tokenJti), true)
    assert.equal(await isReauthTokenUsed(tokenJti), true)
    assert.equal(await consumeReauthToken(tokenJti), false)
  })

  it("allows exactly one of many parallel consumptions", async () => {
    const tokenJti = jti()
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeReauthToken(tokenJti)))
    assert.equal(results.filter(Boolean).length, 1, "exactly one parallel consumption may succeed")
  })
})
