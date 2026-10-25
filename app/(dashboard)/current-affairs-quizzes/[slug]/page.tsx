import { notFound } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/auth"
import { findQuizBySlug, getQuizSlug } from "@/lib/current-affairs/slugs"
import {
  Clock,
  FileQuestion,
  Award,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Languages,
} from "lucide-react"
import { TestActionButton } from "@/components/test-series/TestActionButton"
import { headers } from "next/headers"
import { resolveAccess } from "@/lib/authwall/resolveAccess"
import { isVerifiedSearchEngineCrawler } from "@/lib/authwall/bot-verify"
import { AuthwallGate } from "@/components/authwall/AuthwallGate"
import { AuthwallUnlockToast } from "@/components/authwall/AuthwallUnlockToast"
import { getBaseUrl } from "@/lib/seo/core"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

import { adaptCurrentAffairsQuizSeo } from "@/lib/seo/adapters/current-affairs"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const quiz = await findQuizBySlug(slug)
  if (!quiz) return { title: "Quiz Not Found | aspirantbook" }

  const canonicalSlug = getQuizSlug(quiz)
  return adaptCurrentAffairsQuizSeo(quiz, canonicalSlug).metadata
}

export default async function CurrentAffairsQuizSlugPage({ params }: Props) {
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
  const baseUrl = getBaseUrl()

  const headersList = await headers()
  const isBot = await isVerifiedSearchEngineCrawler(headersList)
  const allQuestions = (quiz.sections || []).flatMap((s: any) => s.questions || [])

  const access = resolveAccess({
    viewer: {
      userId: session?.user?.id || null,
      role: session?.user?.role || null,
      isVerifiedBot: isBot,
    },
    content: allQuestions,
    containerGate: quiz.series,
    itemGate: {
      gateMode: quiz.gateMode,
      previewPercentage: quiz.previewPercentage,
    },
    isOwner: Boolean(isOwner),
  })

  // JSON-LD Schema for Quiz
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: quiz.title,
    description: `Current affairs speed quiz with ${quiz.totalQuestions} questions and ${quiz.durationMinutes} minutes timer.`,
    educationalLevel: "Competitive Examination (UPSC, BPSC, SSC)",
    provider: {
      "@type": "Organization",
      name: "aspirantbook",
      url: baseUrl,
    },
    learningResourceType: "Quiz",
    timeRequired: `PT${quiz.durationMinutes}M`,
    isAccessibleForFree: !access.isLockedForGuest && quiz.accessMode === "FREE",
    hasPart: access.isLockedForGuest
      ? {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: "[role='region'][aria-label='Content Gate']",
        }
      : undefined,
    url: `${baseUrl}/current-affairs-quizzes/${canonicalSlug}`,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <Link href="/current-affairs-quizzes" className="hover:text-foreground transition-colors">
          Current Affairs & Quizzes
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
          {quiz.title}
        </span>
      </nav>

      {/* Quiz Hero Section */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Current Affairs
            </span>
            {quiz.accessMode === "FREE" && (
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                Free Access
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Languages className="w-3.5 h-3.5" />
            <span>English / हिन्दी</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {quiz.title}
          </h1>
          {quiz.titleHi && (
            <p className="text-base sm:text-lg text-muted-foreground font-medium mt-1">
              {quiz.titleHi}
            </p>
          )}
        </div>

        {/* High-Yield Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Questions</p>
              <p className="text-lg font-black text-foreground">{quiz.totalQuestions}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Duration</p>
              <p className="text-lg font-black text-foreground">{quiz.durationMinutes} mins</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Marks</p>
              <p className="text-lg font-black text-foreground">{quiz.totalMarks}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Marking Scheme</p>
              <p className="text-sm font-black text-foreground">
                +{quiz.positiveMarks} / -{quiz.negativeMarks}
              </p>
            </div>
          </div>
        </div>

        {/* CTA Button or Authwall Gate */}
        {access.isLockedForGuest ? (
          <div className="pt-2">
            <AuthwallGate
              title={access.gateTitle || `Sign in to attempt ${quiz.title}`}
              subtitle={
                access.gateSubtitle ||
                `This current affairs speed test is gated (${access.effectivePercentage}% preview). Sign in to attempt full quiz with live timer, instant rank, and detailed bilingual solutions.`
              }
              moduleName="Current Affairs Quiz"
              totalItemsCount={quiz.totalQuestions}
              previewCount={access.previewCount}
              effectivePercentage={access.effectivePercentage}
            />
          </div>
        ) : (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href={`/current-affairs-quizzes/${canonicalSlug}/instructions`}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Quiz Instructions</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/current-affairs-quizzes"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl border border-border hover:bg-muted text-foreground font-semibold text-sm transition-colors text-center"
            >
              Browse All Quizzes
            </Link>
          </div>
        )}
      </div>

      {/* Instructions & Guidelines Overview */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600" />
          <span>Important Quiz Guidelines</span>
        </h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
            <span>
              <strong>Timer:</strong> The test duration is {quiz.durationMinutes} minutes. The countdown clock at the top will indicate remaining time. The test auto-submits when time expires.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
            <span>
              <strong>Marking:</strong> Each correct response awards +{quiz.positiveMarks} marks. Each incorrect answer deducts {quiz.negativeMarks} marks.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
            <span>
              <strong>Bilingual:</strong> Questions are available in both English and Hindi. You can toggle the language anytime during the attempt.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
            <span>
              <strong>Instant Analytics:</strong> Receive instant performance analysis with percentile, accuracy score, and in-depth question solutions immediately upon submission.
            </span>
          </li>
        </ul>
      </div>
      <AuthwallUnlockToast />
    </div>
  )
}
