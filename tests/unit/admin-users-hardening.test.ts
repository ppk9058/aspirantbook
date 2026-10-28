import assert from "node:assert/strict"
import { test, describe } from "node:test"
import { csvCell } from "../../lib/admin/csv"
import { validatePasswordPolicy } from "../../lib/auth/password-policy"

describe("A10 CSV formula injection", () => {
  test("prefixes cells that a spreadsheet would execute", () => {
    assert.equal(csvCell("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0")
    assert.equal(csvCell("+1+1"), "'+1+1")
    assert.equal(csvCell("-2+3"), "'-2+3")
    assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)")
    assert.equal(csvCell("\tpayload"), "'\tpayload")
    assert.equal(csvCell("\rpayload"), "'\rpayload")
  })

  test("leaves normal cells unchanged and escapes quotes", () => {
    assert.equal(csvCell("Ravi Kumar"), "Ravi Kumar")
    assert.equal(csvCell('He said "hi"'), 'He said ""hi""')
  })
})

describe("A10 admin password policy", () => {
  test("rejects the old 6-character minimum", () => {
    const six = validatePasswordPolicy("Abc123")
    assert.equal(six.valid, false)
  })

  test("accepts a strong password", () => {
    const strong = validatePasswordPolicy("Str0ng!Passw0rd#2026")
    assert.equal(strong.valid, true)
  })
})
