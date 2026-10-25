import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { runSeoAudit } from "../../lib/seo/audit"

describe("SEO Admin Audit Service & Security", () => {
  it("runSeoAudit aggregates metrics across all 4 modules", async () => {
    const report = await runSeoAudit()

    assert.ok(report.summary)
    assert.equal(typeof report.summary.totalPages, "number")
    assert.equal(typeof report.summary.indexablePages, "number")
    assert.equal(typeof report.summary.noindexPages, "number")
    assert.equal(typeof report.summary.missingDescriptions, "number")
    assert.equal(typeof report.summary.sitemapCoverageScore, "number")

    assert.ok(report.modules.contentEngine)
    assert.ok(report.modules.pyqs)
    assert.ok(report.modules.testSeries)
    assert.ok(report.modules.tutorials)
    assert.ok(report.modules.currentAffairs)
  })

  it("adminNavigation in AdminNav registers SEO Audit under /admin/seo", async () => {
    const fs = await import("fs")
    const navCode = fs.readFileSync("components/admin/AdminNav.tsx", "utf-8")
    assert.ok(navCode.includes('href: "/admin/seo"'))
    assert.ok(navCode.includes('name: "SEO Audit"'))
    assert.ok(navCode.includes("adminOnly: true"))
  })

  it("SEO admin layout blocks unauthorized access and checks demo role", async () => {
    const fs = await import("fs")
    const layoutCode = fs.readFileSync("app/admin/seo/layout.tsx", "utf-8")
    assert.ok(layoutCode.includes('user.role !== "ADMIN"'))
    assert.ok(layoutCode.includes('user.role === "TEACHER" ? "/teacher" : "/"'))
    assert.ok(layoutCode.includes('startsWith("demo-")'))
  })
})
