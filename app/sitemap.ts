import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { getAllBooks } from "@/lib/books/bookService"

export const dynamic = "force-dynamic"
export const revalidate = 3600 // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
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
            url: `${baseUrl}/practice`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        },
    ]

    try {
        const [publishedCourses, allBooks, publishedSeries, publishedQuizzes] = await Promise.all([
            prisma.course.findMany({
                where: { status: "PUBLISHED" },
                select: { slug: true, updatedAt: true },
            }).catch(() => []),
            getAllBooks().catch(() => []),
            prisma.examSeries.findMany({
                where: {
                    isPublished: true,
                    slug: { notIn: ["current-affairs-system-series", "pyq-system-series"] },
                },
                select: { slug: true },
            }).catch(() => []),
            prisma.examTest.findMany({
                where: {
                    testType: "CURRENT_AFFAIRS",
                    isPublished: true,
                },
                select: { id: true, title: true, updatedAt: true },
            }).catch(() => []),
        ])

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

        return [...staticRoutes, ...courseUrls, ...bookUrls, ...seriesUrls, ...quizUrls, ...tutorialUrls]
    } catch {
        return staticRoutes
    }
}
