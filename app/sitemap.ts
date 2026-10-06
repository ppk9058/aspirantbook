import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXTAUTH_URL || "https://aspirantbook.com"

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/dashboard`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/tutorials`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/courses`,
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
            url: `${baseUrl}/books`,
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
        const publishedCourses = await prisma.course.findMany({
            where: { status: "PUBLISHED" },
            select: { slug: true, updatedAt: true },
        })

        const courseUrls: MetadataRoute.Sitemap = publishedCourses.map((c) => ({
            url: `${baseUrl}/courses/${c.slug}`,
            lastModified: c.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }))

        return [...staticRoutes, ...courseUrls]
    } catch {
        return staticRoutes
    }
}
