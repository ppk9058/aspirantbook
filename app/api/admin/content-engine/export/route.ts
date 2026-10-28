import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import {
  countPublishedQuestionsForExport,
  getSetting,
  readPublishedQuestionsForExport,
} from "@/lib/modules/content-engine/db-service"
import { generateStaticSiteFiles } from "@/lib/modules/content-engine/static-export"
import { createZipBuffer } from "@/lib/modules/content-engine/zip"
import {
  ExportRangeError,
  assertExportFitsInOneArchive,
  buildExportPart,
  parseExportRange,
} from "@/lib/modules/content-engine/export-range"

/**
 * B11: this handler used to load every published question and all of its
 * translations in one `findMany`, then build the whole zip in memory. A large
 * corpus therefore exhausted the function.
 *
 * It now exports a bounded part (`limit` <= 2000, default 2000) starting at
 * `offset`, reading the database in 250-row chunks and reporting the part in
 * `X-Export-*` headers. A default request that would need more than one archive
 * is refused with 413 instead of returning a quietly incomplete site.
 */
export async function GET(req: Request) {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const { searchParams } = new URL(req.url)

    let range
    try {
      range = parseExportRange(searchParams)
    } catch (error) {
      if (error instanceof ExportRangeError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }

    const total = await countPublishedQuestionsForExport()
    try {
      assertExportFitsInOneArchive(total, range)
    } catch (error) {
      if (error instanceof ExportRangeError) {
        return NextResponse.json(
          {
            error: error.message,
            total,
            limit: range.limit,
            offset: range.offset,
          },
          { status: error.status }
        )
      }
      throw error
    }

    const exportMode = await getSetting<"mirror" | "primary">("exportMode", "mirror")
    const exportBaseUrl = await getSetting<string>("exportBaseUrl", "")

    if (exportMode === "primary" && (!exportBaseUrl || !exportBaseUrl.trim())) {
      return NextResponse.json(
        {
          error:
            "Primary export mode requires Setting.exportBaseUrl to be configured before export.",
        },
        { status: 400 }
      )
    }

    const questions = await readPublishedQuestionsForExport(range)

    const exportRecords = questions.map((q) => ({
      id: q.id,
      shortId: q.shortId,
      slug: q.slug,
      q: q.q,
      options: q.options as string[],
      answer: q.answer,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      sub: q.sub || "Uncategorized",
      top: q.top || "General",
      exam: q.exam,
      year: q.year,
      sourceTag: q.sourceTag,
      isPublished: q.isPublished,
      isVerified: q.isVerified,
      translations: q.translations.map((t) => ({
        lang: t.lang,
        q: t.q,
        options: t.options as string[],
        explanation: t.explanation,
        top: t.top,
        isReviewed: t.isReviewed,
      })),
    }))

    const files = generateStaticSiteFiles(exportRecords, exportMode, exportBaseUrl || undefined)
    const zipBytes = createZipBuffer(files)

    const part = buildExportPart(total, range.offset, range.limit, exportRecords.length)
    const partNumber = Math.floor(range.offset / range.limit) + 1
    const fileName = part.partial || partNumber > 1
      ? `content-engine-static-site-part-${partNumber}-of-${part.parts}.zip`
      : "content-engine-static-site.zip"

    return new Response(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(zipBytes.byteLength),
        "X-Export-Total": String(part.total),
        "X-Export-Offset": String(part.offset),
        "X-Export-Limit": String(part.limit),
        "X-Export-Returned": String(part.returned),
        "X-Export-Parts": String(part.parts),
        "X-Export-Next-Offset": part.nextOffset === null ? "" : String(part.nextOffset),
      },
    })
  } catch (error: any) {
    console.error("GET /api/admin/content-engine/export error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate static export ZIP" },
      { status: 500 }
    )
  }
}
