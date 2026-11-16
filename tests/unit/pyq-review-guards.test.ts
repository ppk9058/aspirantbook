import assert from "node:assert/strict"
import { test, describe } from "node:test"

/** Mirrors the bulk-route approve guard + publish gate (pure logic). */
function evaluateApproveGuard(sol: {
  status?: string
  check?: string | null
  unsure?: string | null
  warnings?: string[]
} | null): { approved: boolean; reason?: string } {
  if (!sol) return { approved: false, reason: "no structured solution" }
  if ((sol.check || null) !== "agree") return { approved: false, reason: `CHECK is ${sol.check || "missing"}` }
  if (sol.unsure) return { approved: false, reason: "UNSURE is set" }
  if ((sol.warnings || []).length > 0) return { approved: false, reason: "warnings" }
  return { approved: true }
}

function publishBlocked(sol: { status?: string } | null): boolean {
  return Boolean(sol && sol.status !== "APPROVED")
}

describe("approve guard (Phase 2.7)", () => {
  test("clean solution passes", () => {
    assert.deepEqual(evaluateApproveGuard({ check: "agree", unsure: null, warnings: [] }), { approved: true })
  })
  test("no structured solution", () => {
    assert.equal(evaluateApproveGuard(null).reason, "no structured solution")
  })
  test("CHECK disagree/unsure/missing blocked", () => {
    assert.ok(evaluateApproveGuard({ check: "disagree", warnings: [] }).reason!.startsWith("CHECK is disagree"))
    assert.ok(evaluateApproveGuard({ check: "unsure", warnings: [] }).reason!.startsWith("CHECK is unsure"))
    assert.ok(evaluateApproveGuard({ warnings: [] }).reason!.startsWith("CHECK is missing"))
  })
  test("UNSURE set blocked", () => {
    assert.equal(evaluateApproveGuard({ check: "agree", unsure: "date uncertain", warnings: [] }).reason, "UNSURE is set")
  })
  test("warnings block (incl. answer-mismatch gate)", () => {
    assert.equal(
      evaluateApproveGuard({ check: "agree", warnings: ["answer-mismatch"] }).reason,
      "warnings",
    )
  })
})

describe("publish gate (publishing requires APPROVED)", () => {
  test("APPROVED publishes", () => assert.equal(publishBlocked({ status: "APPROVED" }), false))
  test("NEEDS_REVIEW blocked", () => assert.equal(publishBlocked({ status: "NEEDS_REVIEW" }), true))
  test("legacy rows without structured solution publish as before", () =>
    assert.equal(publishBlocked(null), false))
})
