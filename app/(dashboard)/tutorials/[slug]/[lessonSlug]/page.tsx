import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { SeoJsonLd } from "@/lib/seo"
import { adaptTutorialLessonSeo } from "@/lib/seo/adapters/tutorials"
import { AspirantbookTutorialView } from "@/components/editor/AspirantbookTutorialView"
import {
  deriveLessonSlug,
  findLessonBySlug,
  extractLessonText,
} from "@/lib/tutorials/lesson-slug"
import { loadTutorialWithLessons } from "@/lib/tutorials/tutorial-loader"

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        chapters: {
          select: {
            lessons: {
              select: { id: true, title: true, externalId: true },
            },
          },
        },
      },
      take: 30,
    })

    const params: Array<{ slug: string; lessonSlug: string }> = []
    for (const c of courses) {
      if (!c.slug) continue
      for (const ch of c.chapters) {
        for (const l of ch.lessons) {
          params.push({
            slug: c.slug,
            lessonSlug: deriveLessonSlug(l),
          })
        }
      }
    }
    return params.slice(0, 100)
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}): Promise<Metadata> {
  const { slug, lessonSlug } = await params

  const tutorialData = await loadTutorialWithLessons(slug)
  if (!tutorialData) {
    return {
      title: "Tutorial Lesson Not Found | AspirantBook",
      robots: { index: false, follow: false },
    }
  }

  const { course, allLessons } = tutorialData
  const matchedLesson = findLessonBySlug(allLessons, lessonSlug)
  if (!matchedLesson) {
    return {
      title: "Tutorial Lesson Not Found | AspirantBook",
      robots: { index: false, follow: false },
    }
  }

  const derivedSlug = deriveLessonSlug(matchedLesson)
  const previewText = extractLessonText(matchedLesson.content, 155)

  const seo = adaptTutorialLessonSeo(
    {
      title: course.title,
      slug: course.slug || slug,
    },
    {
      id: matchedLesson.id,
      title: matchedLesson.title,
      slug: derivedSlug,
      description: previewText,
      isGated: Boolean((matchedLesson as any).isLockedForGuest),
      isPublished: Boolean((course as any).isPublished !== false),
      updatedAt: (matchedLesson as any).updatedAt,
    }
  )

  return seo.metadata
}

export default async function TutorialLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>
}) {
  const { slug, lessonSlug } = await params

  const tutorialData = await loadTutorialWithLessons(slug)
  if (!tutorialData) {
    notFound()
  }

  const { course, chapters, allLessons, isEditor } = tutorialData
  const matchedLesson = findLessonBySlug(allLessons, lessonSlug)
  if (!matchedLesson) {
    notFound()
  }

  const derivedSlug = deriveLessonSlug(matchedLesson)
  const previewText = extractLessonText(matchedLesson.content, 155)

  const seo = adaptTutorialLessonSeo(
    {
      title: course.title,
      slug: course.slug || slug,
    },
    {
      id: matchedLesson.id,
      title: matchedLesson.title,
      slug: derivedSlug,
      description: previewText,
      isGated: Boolean((matchedLesson as any).isLockedForGuest),
      isPublished: Boolean((course as any).isPublished !== false),
      updatedAt: (matchedLesson as any).updatedAt,
    }
  )

  return (
    <>
      <SeoJsonLd schemas={seo.jsonLd} />
      <AspirantbookTutorialView
        course={course as any}
        chapters={chapters as any}
        isEditor={isEditor}
        initialActiveLessonId={matchedLesson.id}
      />
    </>
  )
}
