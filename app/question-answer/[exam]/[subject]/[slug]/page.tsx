import { getPublicQuestionBySlug } from "@/lib/modules/content-engine/db-service"
import { notFound, permanentRedirect } from "next/navigation"
import { buildSeoModel, SeoQuestionInput } from "@/lib/modules/content-engine/seo-model"
import { slugify, qaPath } from "@/lib/modules/content-engine/paths"
import { PublicQuestionView } from "@/components/content-engine-public/PublicQuestionView"
import { Metadata } from "next"
import { getBaseUrl } from "@/lib/seo/core"

export const dynamic = "force-static"
export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const questions = await getPublicQuestionBySlug("") // dummy call to verify import
    return []
  } catch {
    return []
  }
}

const BASE_URL = getBaseUrl()

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string; subject: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const q = await getPublicQuestionBySlug(slug)

  if (!q || !q.slug || !q.isPublished) {
    return { title: "Question Not Found | TrillionSkill" }
  }

  const hiTr = q.translations?.find((t: any) => t.isReviewed)
  const seoInput: SeoQuestionInput = {
    id: q.id,
    shortId: q.shortId,
    slug: q.slug,
    q: q.q,
    o: q.options as string[],
    a: q.answerIndex,
    exp: q.explanation || "",
    sub: q.sub || undefined,
    top: q.top || undefined,
    exam: q.exam || undefined,
    year: q.year || undefined,
    src: q.sourceTag || undefined,
    isPublished: true,
    hindiTwin: hiTr
      ? {
          q: hiTr.q,
          o: hiTr.options as string[],
          exp: hiTr.explanation || "",
          top: hiTr.top || undefined,
          isReviewed: true,
        }
      : null,
  }

  const seo = buildSeoModel(seoInput, "en", BASE_URL)

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalUrl,
      languages: {
        en: seo.hreflang.en,
        ...(seo.hreflang.hi ? { hi: seo.hreflang.hi } : {}),
        "x-default": seo.hreflang["x-default"],
      },
    },
    robots: seo.robots,
  }
}

export default async function PublicQuestionPage({
  params,
}: {
  params: Promise<{ exam: string; subject: string; slug: string }>
}) {
  const { exam: examSlug, subject: subSlug, slug } = await params
  const q = await getPublicQuestionBySlug(slug)

  if (!q || !q.slug || !q.isPublished) {
    notFound()
  }

  // Canonical check: redirect 301 if exam or subject slug does not match canonical
  const canonicalExamSlug = slugify(q.exam || "general")
  const canonicalSubSlug = slugify(q.sub || "uncategorized")

  if (examSlug !== canonicalExamSlug || subSlug !== canonicalSubSlug || slug !== q.slug) {
    permanentRedirect(qaPath("en", q.exam, q.sub, q.slug))
  }

  const hiTr = q.translations?.find((t: any) => t.isReviewed)
  const seoInput: SeoQuestionInput = {
    id: q.id,
    shortId: q.shortId,
    slug: q.slug,
    q: q.q,
    o: q.options as string[],
    a: q.answerIndex,
    exp: q.explanation || "",
    sub: q.sub || undefined,
    top: q.top || undefined,
    exam: q.exam || undefined,
    year: q.year || undefined,
    src: q.sourceTag || undefined,
    isPublished: true,
    hindiTwin: hiTr
      ? {
          q: hiTr.q,
          o: hiTr.options as string[],
          exp: hiTr.explanation || "",
          top: hiTr.top || undefined,
          isReviewed: true,
        }
      : null,
  }

  const seo = buildSeoModel(seoInput, "en", BASE_URL)

  const questionData = {
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
    publishedAt: q.publishedAt,
    updatedAt: q.updatedAt,
  }

  const alternateLangUrl = hiTr
    ? qaPath("hi", q.exam, q.sub, q.slug)
    : undefined

  return (
    <PublicQuestionView
      question={questionData}
      lang="en"
      jsonLdScript={seo.jsonLdScriptString}
      breadcrumbs={seo.breadcrumbs}
      alternateLangUrl={alternateLangUrl}
    />
  )
}
