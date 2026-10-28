import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { shouldShowUpgradeCta } from "../src/lib/exam-access-ui"

describe("A2 exam screen upgrade state", () => {
  test("premium test + denial shows the upgrade CTA", () => {
    assert.equal(shouldShowUpgradeCta(false, "Pro test. Please purchase Pass or subscription."), true)
  })
  test("free test + denial never shows the upgrade CTA", () => {
    assert.equal(shouldShowUpgradeCta(true, "Network connection failed. Please retry."), false)
  })
  test("no error hides the CTA", () => {
    assert.equal(shouldShowUpgradeCta(false, null), false)
    assert.equal(shouldShowUpgradeCta(false, "   "), false)
  })
})
