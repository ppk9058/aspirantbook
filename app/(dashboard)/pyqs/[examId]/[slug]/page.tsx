import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { SeoJsonLd } from "@/lib/seo"
import { adaptPyqPaperSeo } from "@/lib/seo/adapters/pyq-paper"
import { loadPyqPaperForDetail } from "@/lib/pyqs/paper-loader"
import { PyqDetailActionButtons } from "@/components/pyqs/PyqDetailActionButtons"
import {
  FileText,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  ArrowLeft,
  BookOpen,
  Award,
  HelpCircle,
  FileCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react"

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const papers = await prisma.pyqPaper.findMany({
      where: { status: "PUBLISHED" },
      include: { category: { select: { slug: true } } },
      take: 50,
      orderBy: { createdAt: "desc" },
    })

    return papers
      .filter((p) => p.category?.slug && p.slug)
      .map((p) => ({
        examId: p.category.slug,
        slug: p.slug,
      }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examId: string; slug: string }>
}): Promise<Metadata> {
  const { examId, slug } = await params
  if (examId === "pdf-view") notFound()

  const paper = await loadPyqPaperForDetail(examId, slug)
  if (!paper) {
    return {
      title: "Previous Year Paper Not Found | AspirantBook",
      robots: { index: false, follow: false },
    }
  }

  const seo = adaptPyqPaperSeo(
    {
      ...paper,
      hasQuestions: paper.previewQuestions.length > 0,
    },
    paper.category
  )

  return seo.metadata
}

export default async function PyqPaperDetailPage({
  params,
}: {
  params: Promise<{ examId: string; slug: string }>
}) {
  const { examId, slug } = await params
  if (examId === "pdf-view") notFound()

  const paper = await loadPyqPaperForDetail(examId, slug)
  if (!paper) {
    notFound()
  }

  const seo = adaptPyqPaperSeo(
    {
      ...paper,
      hasQuestions: paper.previewQuestions.length > 0,
    },
    paper.category
  )

  const isFree = paper.accessType === "FREE"
  const formattedDate = paper.examDate
    ? new Date(paper.examDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  const descriptiveParagraph = `${paper.title} is an official previous year question paper conducted for ${
    paper.category.name
  } candidates${paper.stage ? ` (${paper.stage} stage)` : ""}${
    paper.year ? ` in the year ${paper.year}` : ""
  }.${paper.subject ? ` This paper evaluates knowledge across ${paper.subject}.` : ""} It comprises ${
    paper.totalQuestions
  } questions worth a total of ${paper.totalMarks} marks with a test duration of ${
    paper.durationMin
  } minutes. Aspirants can study real exam questions, examine structural difficulty, and practice time management.`

  return (
    <>
      <SeoJsonLd schemas={seo.jsonLd} />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 pb-28 lg:pb-12 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <Link href="/pyqs" className="hover:text-foreground transition-colors">
            Previous Year Papers
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <Link href={`/pyqs/${paper.category.slug}`} className="hover:text-foreground transition-colors">
            {paper.category.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="text-foreground font-medium truncate max-w-xs">{paper.title}</span>
        </nav>

        {/* Paper Header / Hero Card */}
        <header className="rounded-3xl border border-border/80 bg-card text-card-foreground p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {paper.category.name}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                {paper.stage}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-foreground border border-border/70">
                Year {paper.year}
              </span>
              {paper.shift && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/80 text-muted-foreground border border-border/60">
                  {paper.shift}
                </span>
              )}
            </div>

            <div>
              {isFree ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  FREE ACCESS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {paper.isPassIncluded ? "Pass Included" : `₹${paper.unlockPrice}`}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
              {paper.title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {descriptiveParagraph}
            </p>
          </div>

          {/* Key Paper Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-border/70">
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Questions</span>
              <span className="text-base font-bold text-foreground">{paper.totalQuestions}</span>
            </div>
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Total Marks</span>
              <span className="text-base font-bold text-foreground">{paper.totalMarks}</span>
            </div>
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Duration</span>
              <span className="text-base font-bold text-foreground">{paper.durationMin} mins</span>
            </div>
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Languages</span>
              <span className="text-base font-bold text-foreground truncate block">
                {paper.languages?.join(", ") || "English, Hindi"}
              </span>
            </div>
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Document</span>
              <span className="text-base font-bold text-foreground">
                {paper.pageCount ? `${paper.pageCount} Pages` : `${paper.pdfFileSizeKb || 0} KB`}
              </span>
            </div>
            <div className="rounded-xl p-3 bg-muted/40 border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">Subject</span>
              <span className="text-base font-bold text-foreground truncate block">
                {paper.subject || "Full Length"}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <PyqDetailActionButtons
            paperId={paper.id}
            paperTitle={paper.title}
            accessType={paper.accessType}
            isPassIncluded={paper.isPassIncluded}
            unlockPrice={paper.unlockPrice}
            hasCbtMode={paper.hasCbtMode}
            cbtTestId={paper.cbtTestId}
          />
        </header>

        {/* How To Use This Paper Section */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">How to effectively use this previous year paper</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl p-4 bg-muted/30 border border-border/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                1
              </div>
              <h3 className="font-bold text-foreground text-sm">Strict Exam Timing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Attempt the question paper in a quiet space for the full {paper.durationMin} minutes without breaks
                to simulate real test-day pressure.
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-muted/30 border border-border/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h3 className="font-bold text-foreground text-sm">Syllabus Mapping</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Categorize each question by core subject and topic to identify recurring themes and high-yield areas
                for {paper.category.name}.
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-muted/30 border border-border/60 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h3 className="font-bold text-foreground text-sm">Mistake Analysis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Note incorrect or guessed questions in a revision notebook and re-test those concepts 48 hours later to
                lock in retention.
              </p>
            </div>
          </div>
        </section>

        {/* Sample Questions Section */}
        {paper.previewQuestions.length > 0 && (
          <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Sample Questions from this Paper</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Displaying {paper.previewQuestions.length} representative questions from the official paper.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
                Preview Subset
              </span>
            </div>

            <div className="space-y-6">
              {paper.previewQuestions.map((q, idx) => (
                <article
                  key={q.id}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-3.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground leading-relaxed">
                        {q.questionEn}
                      </p>
                      {q.questionHi && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {q.questionHi}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 text-xs">
                    {q.optionAEn && (
                      <div className="p-2.5 rounded-xl border border-border/60 bg-card text-foreground">
                        <span className="font-bold text-muted-foreground mr-1.5">(A)</span>
                        <span>{q.optionAEn}</span>
                      </div>
                    )}
                    {q.optionBEn && (
                      <div className="p-2.5 rounded-xl border border-border/60 bg-card text-foreground">
                        <span className="font-bold text-muted-foreground mr-1.5">(B)</span>
                        <span>{q.optionBEn}</span>
                      </div>
                    )}
                    {q.optionCEn && (
                      <div className="p-2.5 rounded-xl border border-border/60 bg-card text-foreground">
                        <span className="font-bold text-muted-foreground mr-1.5">(C)</span>
                        <span>{q.optionCEn}</span>
                      </div>
                    )}
                    {q.optionDEn && (
                      <div className="p-2.5 rounded-xl border border-border/60 bg-card text-foreground">
                        <span className="font-bold text-muted-foreground mr-1.5">(D)</span>
                        <span>{q.optionDEn}</span>
                      </div>
                    )}
                  </div>

                  {/* Free papers reveal answer & explanation; paid/pass papers keep answers locked */}
                  {isFree && q.correctOption && (
                    <div className="pl-8 pt-1">
                      <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                        <span className="font-bold mr-1">Correct Option:</span> ({q.correctOption})
                        {q.explanationEn && (
                          <p className="mt-1 text-muted-foreground dark:text-emerald-300/90">
                            {q.explanationEn}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!isFree && (
              <div
                role="region"
                aria-label="Content Gate"
                className="rounded-2xl p-6 bg-amber-500/10 border border-amber-500/20 text-center space-y-3"
              >
                <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                <h3 className="font-bold text-foreground text-sm">
                  Complete questions and official answer key are locked
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Unlock the full question paper with all {paper.totalQuestions} questions, complete answer key, and
                  in-depth explanations with AspirantBook Pass.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-sm"
                >
                  <span>Get AspirantBook Pass</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Related Papers Section */}
        {paper.relatedPapers.length > 0 && (
          <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              Related {paper.category.name} Previous Year Papers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paper.relatedPapers.map((r) => (
                <Link
                  key={r.id}
                  href={`/pyqs/${r.categorySlug}/${r.slug}`}
                  className="group block p-4 rounded-2xl border border-border/70 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                    <span className="font-semibold text-foreground/80">{r.year}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted border border-border/60">
                      {r.stage}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {r.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
