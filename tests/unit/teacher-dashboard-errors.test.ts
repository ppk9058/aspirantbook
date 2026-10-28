import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

/**
 * Phase D regression: the teacher cockpit rendered live operational numbers
 * (pending doubts, live classes) but every read swallowed its failure with
 * `.catch(() => [])`. A broken query therefore looked exactly like "0 pending
 * doubts" and "no classes scheduled" — the dashboard lied to the teacher.
 *
 * The fix keeps the page resilient but surfaces the failure: each failed read
 * is logged and collected, and a visible alert banner lists the missing
 * sections. The page is also explicitly request-rendered, because with the
 * root layout's `auth()` call removed (C1) it would otherwise be prerendered
 * once and serve a frozen snapshot.
 */

const ROOT = process.cwd()
const PAGE = path.join(ROOT, "app", "(dashboard)", "teacher", "page.tsx")

const source = fs.readFileSync(PAGE, "utf8")
// Match against executable code only: the fix's own explanatory comment quotes
// the old `.catch(() => [])` pattern.
const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

describe("teacher dashboard reports failed reads", () => {
  it("is request-rendered, not prerendered at build time", () => {
    assert.match(source, /export const dynamic = "force-dynamic"/)
  })

  it("does not swallow read failures with an empty catch", () => {
    assert.doesNotMatch(code, /\.catch\(\s*\(\s*\)\s*=>/, "no `.catch(() => ...)` allowed")
    assert.doesNotMatch(code, /\.catch\(\s*\(\s*\)\s*=>\s*undefined/, "no silent catch allowed")
    assert.doesNotMatch(code, /catch\s*\([^)]*\)\s*\{\s*\}/, "no empty catch block allowed")
  })

  it("logs and records every failed section", () => {
    const logged = code.match(/console\.error\("Teacher dashboard: [^"]+ failed to load"/g) ?? []
    assert.equal(logged.length, 3, "doubts, batches and live classes must each log their failure")

    const recorded = code.match(/failedSections\.push\(/g) ?? []
    assert.equal(recorded.length, 3, "each failed read must be added to failedSections")
  })

  it("renders a visible alert for the failed sections", () => {
    assert.match(code, /data-testid="teacher-dashboard-error"/)
    assert.match(code, /role="alert"/)
  })
})
