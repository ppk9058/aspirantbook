import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { qaPath, examHubPath, yearHubPath } from "@/lib/modules/content-engine/paths"
import { getBaseUrl } from "@/lib/seo/core"

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = getBaseUrl()
  if (!BASE_URL) {
    return []
  }
  const [questions, exams] = await Promise.all([
    prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        slug: { not: null },
        exam: { not: null },
        translations: {
          some: {
            lang: "hi",
            isReviewed: true, // Only reviewed Hindi twins in sitemap
          },
        },
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
      where: {
        isPublished: true,
        exam: { not: null },
        translations: {
          some: {
            lang: "hi",
            isReviewed: true,
          },
        },
      },
    }),
  ])

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/hi/question-answer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]

  // Hindi exam hubs
  exams.forEach((e) => {
    if (e.exam) {
      entries.push({
        url: `${BASE_URL}${examHubPath("hi", e.exam)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
  })

  // Hindi question pages
  questions.forEach((q) => {
    if (q.exam && q.sub && q.slug) {
      entries.push({
        url: `${BASE_URL}${qaPath("hi", q.exam, q.sub, q.slug)}`,
        lastModified: q.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
  })

  return entries
}
