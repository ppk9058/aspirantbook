import { prisma } from "../../prisma"
import { aiGateway } from "../gateway"
import { stripPII } from "../pii"

export class SearchContentIndexer {
  /**
   * Indexes a Course by generating its 768-d embedding and storing it with raw SQL.
   */
  public static async indexCourse(courseId: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, description: true },
    })

    if (!course) return false

    const cleanTitle = course.title
    const cleanSnippet = stripPII(course.description || course.title).sanitizedText.slice(0, 1000)
    const textToEmbed = `${cleanTitle}: ${cleanSnippet}`

    try {
      const embedding = await aiGateway.generateEmbedding(textToEmbed)
      const vectorStr = `[${embedding.join(",")}]`
      const id = `emb_course_${course.id}`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "AiContentEmbedding" ("id", "contentType", "contentId", "title", "snippet", "embedding", "createdAt", "updatedAt")
         VALUES ($1, 'COURSE', $2, $3, $4, $5::vector, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "title" = $3, "snippet" = $4, "embedding" = $5::vector, "updatedAt" = NOW()`,
        id,
        course.id,
        cleanTitle,
        cleanSnippet,
        vectorStr
      )

      return true
    } catch (err: any) {
      console.warn(`[Search Indexer] Failed to index course ${courseId}:`, err.message)
      return false
    }
  }

  /**
   * Indexes an ExamSeries with embeddings.
   */
  public static async indexExamSeries(seriesId: string): Promise<boolean> {
    const series = await prisma.examSeries.findUnique({
      where: { id: seriesId },
      select: { id: true, title: true, description: true, category: true },
    })

    if (!series) return false

    const cleanTitle = series.title
    const cleanSnippet = stripPII(series.description || `${series.category} exam series`).sanitizedText.slice(0, 1000)
    const textToEmbed = `${cleanTitle} (${series.category}): ${cleanSnippet}`

    try {
      const embedding = await aiGateway.generateEmbedding(textToEmbed)
      const vectorStr = `[${embedding.join(",")}]`
      const id = `emb_series_${series.id}`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "AiContentEmbedding" ("id", "contentType", "contentId", "title", "snippet", "embedding", "createdAt", "updatedAt")
         VALUES ($1, 'EXAM_SERIES', $2, $3, $4, $5::vector, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "title" = $3, "snippet" = $4, "embedding" = $5::vector, "updatedAt" = NOW()`,
        id,
        series.id,
        cleanTitle,
        cleanSnippet,
        vectorStr
      )

      return true
    } catch (err: any) {
      console.warn(`[Search Indexer] Failed to index exam series ${seriesId}:`, err.message)
      return false
    }
  }
}
