import { getPublicQuestionBySlug } from "@/lib/modules/content-engine/db-service"
import { notFound, permanentRedirect } from "next/navigation"
import { buildSeoModel, SeoQuestionInput } from "@/lib/modules/content-engine/seo-model"
import { slugify, qaPath } from "@/lib/modules/content-engine/paths"
import { getHindiSubject, getHindiTopic } from "@/lib/modules/content-engine/taxonomy"
import { PublicQuestionView } from "@/components/content-engine-public/PublicQuestionView"
import { Metadata } from "next"

export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aspirantbook.com"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string; subject: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const q = await getPublicQuestionBySlug(slug)

  const hiTr = q?.translations?.find((t: any) => t.isReviewed)
  if (!q || !q.slug || !q.isPublished || !hiTr) {
    return { title: "Question Not Found | TrillionSkill" }
  }

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
    hindiTwin: {
      q: hiTr.q,
      o: hiTr.options as string[],
      exp: hiTr.explanation || "",
      top: hiTr.top || undefined,
      isReviewed: true,
    },
  }

  const seo = buildSeoModel(seoInput, "hi", BASE_URL)

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: seo.canonicalUrl,
      languages: {
        en: seo.hreflang.en,
        hi: seo.hreflang.hi,
        "x-default": seo.hreflang["x-default"],
      },
    },
    robots: seo.robots,
  }
}

export default async function HindiQuestionPage({
  params,
}: {
  params: Promise<{ exam: string; subject: string; slug: string }>
}) {
  const { exam: examSlug, subject: subSlug, slug } = await params
  const q = await getPublicQuestionBySlug(slug)

  // Strictly enforce that question exists, is published, and has a reviewed Hindi translation
  const hiTr = q?.translations?.find((t: any) => t.isReviewed)
  if (!q || !q.slug || !q.isPublished || !hiTr) {
    notFound()
  }

  // Canonical check
  const canonicalExamSlug = slugify(q.exam || "general")
  const canonicalSubSlug = slugify(q.sub || "uncategorized")

  if (examSlug !== canonicalExamSlug || subSlug !== canonicalSubSlug || slug !== q.slug) {
    permanentRedirect(qaPath("hi", q.exam, q.sub, q.slug))
  }

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
    hindiTwin: {
      q: hiTr.q,
      o: hiTr.options as string[],
      exp: hiTr.explanation || "",
      top: hiTr.top || undefined,
      isReviewed: true,
    },
  }

  const seo = buildSeoModel(seoInput, "hi", BASE_URL)

  const hindiQuestionData = {
    id: q.id,
    shortId: q.shortId,
    slug: q.slug,
    q: hiTr.q,
    options: hiTr.options as string[],
    answer: q.answer,
    answerIndex: q.answerIndex,
    explanation: hiTr.explanation || q.explanation,
    sub: getHindiSubject(q.sub || "Uncategorized"),
    top: hiTr.top || getHindiTopic(q.top || "General"),
    exam: q.exam,
    year: q.year,
    sourceTag: q.sourceTag,
    publishedAt: q.publishedAt,
    updatedAt: q.updatedAt,
  }

  return (
    <PublicQuestionView
      question={hindiQuestionData}
      lang="hi"
      jsonLdScript={seo.jsonLdScriptString}
      breadcrumbs={seo.breadcrumbs}
    />
  )
}
