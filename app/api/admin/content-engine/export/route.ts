import { NextResponse } from "next/server"
import { requireContentEngineAdmin } from "@/lib/modules/content-engine/auth"
import { prisma } from "@/lib/prisma"
import { getSetting } from "@/lib/modules/content-engine/db-service"
import { generateStaticSiteFiles } from "@/lib/modules/content-engine/static-export"
import { createZipBuffer } from "@/lib/modules/content-engine/zip"

export async function GET() {
  try {
    const { response } = await requireContentEngineAdmin()
    if (response) return response

    const exportMode = await getSetting<"mirror" | "primary">("exportMode", "mirror")
    const exportBaseUrl = await getSetting<string>("exportBaseUrl", "")

    const questions = await prisma.contentEngineQuestion.findMany({
      where: {
        isPublished: true,
        status: "PUBLISHED",
      },
      include: {
        translations: true,
      },
    })

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

    return new Response(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="content-engine-static-site.zip"',
        "Content-Length": String(zipBytes.byteLength),
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
