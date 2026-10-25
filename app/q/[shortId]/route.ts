import { NextResponse } from "next/server"
import { getPublicQuestionBySlug } from "@/lib/modules/content-engine/db-service"
import { qaPath } from "@/lib/modules/content-engine/paths"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shortId: string }> }
) {
  const { shortId } = await params
  const q = await getPublicQuestionBySlug(shortId)

  if (!q || !q.slug || !q.exam || !q.sub) {
    return NextResponse.redirect(new URL("/question-answer", req.url), 302)
  }

  const targetPath = qaPath("en", q.exam, q.sub, q.slug)
  return NextResponse.redirect(new URL(targetPath, req.url), 308)
}
