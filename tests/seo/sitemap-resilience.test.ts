import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../lib/prisma"

describe("Sitemap DB Failure Resilience", () => {
  it("proves a simulated DB failure throws an error and does not return a partial or empty sitemap", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3045"
    const sitemapModule = await import("../../app/sitemap")
    const sitemap = sitemapModule.default

    // Simulate DB failure on prisma.course.findMany
    const originalFindMany = prisma.course.findMany
    try {
      prisma.course.findMany = (async () => {
        throw new Error("Simulated DB connection failure: Can't reach database server at 127.0.0.1:54329")
      }) as any

      // The sitemap MUST throw on DB failure so Next.js ISR does not cache an empty or partial URL set
      await assert.rejects(
        async () => {
          await sitemap()
        },
        {
          message: /Simulated DB connection failure/,
        },
        "sitemap() must throw when DB query fails instead of catching and returning a partial/empty list"
      )
    } finally {
      prisma.course.findMany = originalFindMany
    }
  })

  it("keeps the if (!baseUrl) return [] behavior unchanged", async () => {
    const origSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const origAppUrl = process.env.NEXT_PUBLIC_APP_URL
    const origNodeEnv = process.env.NODE_ENV
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_APP_URL
      ;(process.env as any).NODE_ENV = "production"

      const sitemapModule = await import("../../app/sitemap")
      const sitemap = sitemapModule.default

      const result = await sitemap()
      assert.deepEqual(result, [], "Must return empty array when baseUrl is empty in production")
    } finally {
      process.env.NEXT_PUBLIC_SITE_URL = origSiteUrl
      process.env.NEXT_PUBLIC_APP_URL = origAppUrl
      ;(process.env as any).NODE_ENV = origNodeEnv
    }
  })

  it("logs a console.warn once per process when a module hits the 500 cap", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3045"
    const sitemapModule = await import("../../app/sitemap")
    const sitemap = sitemapModule.default

    const warnings: string[] = []
    const origWarn = console.warn
    console.warn = (msg: string) => {
      warnings.push(msg)
    }

    const originalFindMany = prisma.course.findMany
    try {
      const mock500 = Array.from({ length: 500 }, (_, i) => ({
        slug: `course-test-cap-${i}`,
        updatedAt: new Date(),
      }))
      prisma.course.findMany = (async () => mock500) as any

      // Call sitemap first time
      await sitemap()
      const capWarns1 = warnings.filter((w) => w.includes('[sitemap] Warning: module "courses" reached the limit of 500'))
      assert.equal(capWarns1.length, 1, "Should log warning once when module hits cap")

      // Call sitemap second time in same process -> should not log duplicate warning
      await sitemap()
      const capWarns2 = warnings.filter((w) => w.includes('[sitemap] Warning: module "courses" reached the limit of 500'))
      assert.equal(capWarns2.length, 1, "Should not log duplicate warning across multiple calls in the same process")
    } finally {
      console.warn = origWarn
      prisma.course.findMany = originalFindMany
    }
  })
})
