import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { assertTestDatabase } from "@/lib/test-db-guard"
import { prisma } from "@/lib/prisma"
import { GET as globalSearchGet } from "@/app/api/search/global/route"

describe("Global Search API DB Integration (ExamSeries)", () => {
    const createdIds: string[] = []

    before(() => {
        assertTestDatabase({ context: "tests/unit/global-search-db.test.ts" })
    })

    after(async () => {
        if (createdIds.length > 0) {
            await prisma.examSeries.deleteMany({
                where: { id: { in: createdIds } },
            }).catch(() => {})
        }
    })

    it("returns only published, non-archived exam series with correct href", async () => {
        const uniqueSuffix = Date.now().toString()

        // 1. Seed published ExamSeries
        const pubSeries = await prisma.examSeries.create({
            data: {
                title: `UPSC Prelims Test Suite ${uniqueSuffix}`,
                slug: `upsc-prelims-live-${uniqueSuffix}`,
                examName: "UPSC Prelims",
                category: "Civil Services",
                isPublished: true,
                isArchived: false,
                createdById: "test-user-id",
            },
            select: { id: true, slug: true, title: true },
        })
        createdIds.push(pubSeries.id)

        // 2. Seed unpublished/archived ExamSeries
        const draftSeries = await prisma.examSeries.create({
            data: {
                title: `UPSC Prelims Archived Suite ${uniqueSuffix}`,
                slug: `upsc-prelims-archived-${uniqueSuffix}`,
                examName: "UPSC Prelims",
                category: "Civil Services",
                isPublished: false,
                isArchived: true,
                createdById: "test-user-id",
            },
            select: { id: true, slug: true, title: true },
        })
        createdIds.push(draftSeries.id)

        // 3. Call GET handler with q=upsc
        const req = new NextRequest("http://127.0.0.1:3045/api/search/global?q=upsc")
        const res = await globalSearchGet(req)
        assert.equal(res.status, 200)

        const data = await res.json()
        assert.ok(Array.isArray(data.testSeries), "testSeries should be an array")

        // 4. Assert only published one returns with href /test-series/<slug>
        const foundPub = data.testSeries.find((s: { id: string }) => s.id === pubSeries.id)
        assert.ok(foundPub, "Published ExamSeries must be returned in search results")
        assert.equal(foundPub.href, `/test-series/${pubSeries.slug}`)
        assert.equal(foundPub.title, pubSeries.title)

        const foundDraft = data.testSeries.find((s: { id: string }) => s.id === draftSeries.id)
        assert.equal(foundDraft, undefined, "Unpublished/archived ExamSeries must NOT be returned")
    })
})
