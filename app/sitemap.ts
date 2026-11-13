import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getAllBooks } from "@/lib/books/bookService"
import { getBaseUrl } from "@/lib/seo/core"

export const revalidate = 3600 // 1 hour

const warnedCaps = new Set<string>()

function warnIfCapReached(moduleName: string, count: number, cap = 500) {
    if (count >= cap && !warnedCaps.has(moduleName)) {
        warnedCaps.add(moduleName)
        console.warn(`[sitemap] Warning: module "${moduleName}" reached the limit of ${cap} records. Additional URLs may be omitted from root sitemap.`)
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getBaseUrl()
    if (!baseUrl) {
        return []
    }

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/courses`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/books`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/test-series`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/tutorials`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/current-affairs-quizzes`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/pyqs`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/practice`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/shipping`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/refund`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        },
    ]

    const [publishedCourses, allBooks, publishedSeries, publishedQuizzes, publishedPyqs] = await Promise.all([
        prisma.course.findMany({
            where: { status: "PUBLISHED" },
            select: { slug: true, updatedAt: true },
            take: 500,
        }),
        getAllBooks(),
        prisma.examSeries.findMany({
            where: {
                isPublished: true,
                isArchived: false,
                slug: { notIn: ["current-affairs-system-series", "pyq-system-series", "unassigned-tests-system-series"] },
            },
            select: { slug: true },
            take: 500,
        }),
        prisma.examTest.findMany({
            where: {
                testType: "CURRENT_AFFAIRS",
                isPublished: true,
            },
            select: { id: true, title: true, updatedAt: true },
            take: 500,
        }),
        prisma.pyqCategory.findMany({
            where: { isPublished: true },
            select: { slug: true, updatedAt: true },
            take: 500,
        }),
    ])

    warnIfCapReached("courses", publishedCourses.length, 500)
    warnIfCapReached("examSeries", publishedSeries.length, 500)
    warnIfCapReached("currentAffairsQuizzes", publishedQuizzes.length, 500)
    warnIfCapReached("pyqCategories", publishedPyqs.length, 500)

    const courseUrls: MetadataRoute.Sitemap = publishedCourses
        .filter((c) => !!c.slug)
        .map((c) => ({
            url: `${baseUrl}/courses/${c.slug}`,
            lastModified: c.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }))

    const bookUrls: MetadataRoute.Sitemap = allBooks
        .filter((b) => !!b.slug || !!b.id)
        .map((b) => ({
            url: `${baseUrl}/books/${b.slug || b.id}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }))

    const seriesUrls: MetadataRoute.Sitemap = publishedSeries
        .filter((s) => !!s.slug)
        .map((s) => ({
            url: `${baseUrl}/test-series/${s.slug}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }))

    const { getQuizSlug } = await import("@/lib/current-affairs/slugs")
    const quizUrls: MetadataRoute.Sitemap = publishedQuizzes
        .map((q) => ({
            url: `${baseUrl}/current-affairs-quizzes/${getQuizSlug(q)}`,
            lastModified: q.updatedAt || new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        }))

    const tutorialUrls: MetadataRoute.Sitemap = publishedCourses
        .filter((c) => {
            const lowerSlug = (c.slug || "").toLowerCase()
            return !lowerSlug.includes("video") && c.slug !== "72nd-bpsc-prelims-current-affairs"
        })
        .map((c) => ({
            url: `${baseUrl}/tutorials/${c.slug}`,
            lastModified: c.updatedAt || new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }))

    const pyqUrls: MetadataRoute.Sitemap = publishedPyqs
        .filter((p) => !!p.slug)
        .map((p) => ({
            url: `${baseUrl}/pyqs/${p.slug}`,
            lastModified: p.updatedAt || new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.8,
        }))

    return [...staticRoutes, ...courseUrls, ...bookUrls, ...seriesUrls, ...quizUrls, ...tutorialUrls, ...pyqUrls]
}

export const dynamic = "force-dynamic";
