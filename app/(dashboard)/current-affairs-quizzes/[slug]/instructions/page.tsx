import { notFound } from "next/navigation"
import { Metadata } from "next"
import { auth } from "@/auth"
import { findQuizBySlug, getQuizSlug } from "@/lib/current-affairs/slugs"
import CurrentAffairsInstructionsClient from "@/components/quizzes/CurrentAffairsInstructionsClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const quiz = await findQuizBySlug(slug)
  if (!quiz) return { title: "Quiz Not Found | aspirantbook" }

  return {
    title: `Instructions: ${quiz.title} | aspirantbook`,
    description: `Examination instructions and rules for ${quiz.title}.`,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  }
}

export default async function CurrentAffairsInstructionsPage({ params }: Props) {
  const { slug } = await params
  const quiz = await findQuizBySlug(slug)
  if (!quiz) {
    notFound()
  }

  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const isOwner = session?.user?.id && quiz.createdById === session.user.id

  if (!quiz.isPublished && !isAdmin && !isOwner) {
    notFound()
  }

  const canonicalSlug = getQuizSlug(quiz)
  const returnPath = `/current-affairs-quizzes/${canonicalSlug}`

  return (
    <CurrentAffairsInstructionsClient
      quiz={{
        id: quiz.id,
        title: quiz.title,
        titleHi: quiz.titleHi,
        durationMinutes: quiz.durationMinutes,
        totalQuestions: quiz.totalQuestions,
        totalMarks: quiz.totalMarks,
        positiveMarks: quiz.positiveMarks,
        negativeMarks: quiz.negativeMarks,
      }}
      slug={canonicalSlug}
      returnPath={returnPath}
      isGuest={!session?.user}
      userName={session?.user?.name || ""}
    />
  )
}
