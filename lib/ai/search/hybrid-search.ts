import { prisma } from "../../prisma"
import { aiConfig } from "../config"
import { EmbeddingAdapter } from "../adapters/embedding"

export interface SearchItemResult {
  id: string
  title: string
  slug?: string
  description?: string | null
  thumbnailUrl?: string | null
  type?: string
  score?: number
}

export interface HybridSearchResult {
  courses: SearchItemResult[]
  lessons: SearchItemResult[]
  usedSemanticSearch: boolean
}

export class HybridSearchEngine {
  /**
   * Executes hybrid search combining pgvector semantic similarity with pg_trgm text search.
   * If semantic search is disabled or unavailable, falls back to the current Prisma ILIKE search (now accelerated with GIN trigram indexes).
   */
  public static async search({
    query,
    isAdmin = false,
    limit = 10,
  }: {
    query: string
    isAdmin?: boolean
    limit?: number
  }): Promise<HybridSearchResult> {
    const trimmed = query.trim()
    if (!trimmed) {
      return { courses: [], lessons: [], usedSemanticSearch: false }
    }

    // Try semantic vector search if enabled in config
    if (aiConfig.searchEnabled && EmbeddingAdapter.isConfigured()) {
      try {
        const queryEmbedding = await EmbeddingAdapter.generateEmbedding(trimmed)
        const vectorStr = `[${queryEmbedding.join(",")}]`

        // Raw SQL hybrid query using pgvector <=> operator and pg_trgm similarity
        const hits: any[] = await prisma.$queryRawUnsafe(
          `SELECT "contentType", "contentId", "title", "snippet",
                  (similarity("title", $1) * 0.4 + (1 - ("embedding" <=> $2::vector)) * 0.6) AS score
           FROM "AiContentEmbedding"
           WHERE "title" % $1 OR ("embedding" <=> $2::vector) < 0.6
           ORDER BY score DESC
           LIMIT $3;`,
          trimmed,
          vectorStr,
          limit
        )

        if (hits && hits.length > 0) {
          const courseIds = hits
            .filter((h) => h.contentType === "COURSE")
            .map((h) => h.contentId)

          if (courseIds.length > 0) {
            const courses = await prisma.course.findMany({
              where: {
                id: { in: courseIds },
                ...(isAdmin ? {} : { status: "PUBLISHED", isPublished: { not: false } }),
              },
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                thumbnailUrl: true,
              },
            })

            return {
              courses,
              lessons: [],
              usedSemanticSearch: true,
            }
          }
        }
      } catch (err: any) {
        console.warn("[Hybrid Search] Semantic search fallback to trigram text:", err.message)
      }
    }

    // Standard fallback: fast database search utilizing the new pg_trgm GIN indexes
    const courseVisibilityWhere: any = isAdmin
      ? {}
      : {
          status: "PUBLISHED",
          isPublished: { not: false },
        }

    const lessonVisibilityWhere: any = isAdmin
      ? {}
      : {
          chapter: {
            course: {
              status: "PUBLISHED",
              isPublished: { not: false },
            },
          },
        }

    const [courses, lessons] = await Promise.all([
      prisma.course.findMany({
        where: {
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { description: { contains: trimmed, mode: "insensitive" } },
          ],
          ...courseVisibilityWhere,
        },
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
        },
      }),
      prisma.lesson.findMany({
        where: {
          title: { contains: trimmed, mode: "insensitive" },
          ...lessonVisibilityWhere,
        },
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          chapter: {
            select: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
    ])

    return {
      courses,
      lessons,
      usedSemanticSearch: false,
    }
  }
}
