import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { qaPath, examHubPath, yearHubPath } from "@/lib/modules/content-engine/paths"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://aspirantbook.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [questions, exams, years] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { not: null },
      },
      select: {
        exam: true,
        sub: true,
        slug: true,
        updatedAt: true,
      },
      take: 5000,
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["exam"],
      where: { isPublished: true, exam: { not: null } },
    }),
    prisma.contentEngineQuestion.groupBy({
      by: ["exam", "year"],
      where: { isPublished: true, exam: { not: null }, year: { not: null } },
    }),
  ])

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/question-answer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  // Exam hubs
  exams.forEach((e) => {
    if (e.exam) {
      entries.push({
        url: `${BASE_URL}${examHubPath("en", e.exam)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
  })

  // Year hubs
  years.forEach((y) => {
    if (y.exam && y.year) {
      entries.push({
        url: `${BASE_URL}${yearHubPath("en", y.exam, y.year)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      })
    }
  })

  // Question pages
  questions.forEach((q) => {
    if (q.exam && q.sub && q.slug) {
      entries.push({
        url: `${BASE_URL}${qaPath("en", q.exam, q.sub, q.slug)}`,
        lastModified: q.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
  })

  return entries
}
