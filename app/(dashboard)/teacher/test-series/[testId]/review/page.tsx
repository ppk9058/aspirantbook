"use client"

import React, { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useRouter, usePathname, useParams } from "next/navigation"
import { AlertCircle, RotateCcw } from "lucide-react"
import ReviewAllQuestions, { ReviewQuestionItem, ReviewSectionItem } from "@/components/exam/ReviewAllQuestions"
import PublishTestModal from "@/components/exam/PublishTestModal"
import { getTestSeriesBasePath } from "@/lib/exam/route-prefix"

export default function TestReviewPage({
    params,
}: {
    params?: Promise<{ id?: string; testId?: string }>
}) {
    const routeParams = useParams()
    let resolvedParams: { id?: string; testId?: string } | null = null
    try {
        if (params) {
            resolvedParams = use(params)
        }
    } catch {}
    const id = (routeParams?.testId as string) || (routeParams?.id as string) || resolvedParams?.testId || resolvedParams?.id || ""
    const router = useRouter()
    const pathname = usePathname()
    const basePath = getTestSeriesBasePath(pathname || "")

    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [title, setTitle] = useState("")
    const [titleHindi, setTitleHindi] = useState("")
    const [isPublished, setIsPublished] = useState(false)
    const [attemptsCount, setAttemptsCount] = useState(0)
    const [sections, setSections] = useState<ReviewSectionItem[]>([])
    const [questions, setQuestions] = useState<ReviewQuestionItem[]>([])
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
    const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null)

    const loadReviewData = useCallback(async () => {
        if (!id) {
            setLoading(false)
            return
        }
        setLoading(true)
        setFetchError(null)
        try {
            const res = await fetch(`/api/exam/test/${encodeURIComponent(id)}/edit-data`)
            const json = await res.json()

            if (!res.ok || !json.data?.test) {
                throw new Error(json.error || `Failed to load test (status: ${res.status})`)
            }

            const t = json.data.test
            setTitle(t.title || "")
            setTitleHindi(t.titleHi || "")
            setIsPublished(Boolean(t.isPublished))
            setAttemptsCount(json.data.attemptsCount || 0)

            if (t.title) {
                try {
                    sessionStorage.setItem(`test-title-${id}`, t.title)
                    window.dispatchEvent(new CustomEvent("update-breadcrumb-title", { detail: { segment: id, title: t.title } }))
                } catch {}
            }

            const loadedSections: ReviewSectionItem[] = []
            const loadedQuestions: ReviewQuestionItem[] = []

            for (const s of t.sections || []) {
                loadedSections.push({
                    id: s.id,
                    name: s.title || "Section",
                    nameHindi: s.titleHi || "",
                    positiveMarks: s.positiveMarks ?? 1.0,
                    negativeMarks: s.negativeMarks ?? 0.33,
                    numQuestions: s.questions?.length || 0,
                })

                for (const q of s.questions || []) {
                    const ansLetter = String(q.correctOption || "A").trim().toUpperCase()
                    const ansIdx = ansLetter === "B" ? 1 : ansLetter === "C" ? 2 : ansLetter === "D" ? 3 : 0

                    loadedQuestions.push({
                        id: q.id,
                        sectionId: s.id,
                        textEnglish: q.questionEn || "",
                        textHindi: q.questionHi || "",
                        options: [
                            { english: q.optionAEn || "", hindi: q.optionAHi || "" },
                            { english: q.optionBEn || "", hindi: q.optionBHi || "" },
                            { english: q.optionCEn || "", hindi: q.optionCHi || "" },
                            { english: q.optionDEn || "", hindi: q.optionDHi || "" },
                        ],
                        correctAnswer: ansIdx as 0 | 1 | 2 | 3,
                        explanationEnglish: q.explanationEn || "",
                        explanationHindi: q.explanationHi || "",
                        videoUrl: q.videoUrl || "",
                        difficulty: q.difficulty,
                        subject: q.subject || "",
                        topic: q.topic || "",
                    })
                }
            }

            setSections(loadedSections)
            setQuestions(loadedQuestions)
        } catch (err: any) {
            console.error("Load test review error:", err)
            setFetchError(err.message || "Failed to load test questions for review.")
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadReviewData()
    }, [loadReviewData])

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Loading test review…</p>
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="max-w-2xl mx-auto p-6 mt-10">
                <div className="p-6 bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-900 rounded-3xl space-y-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/50 flex items-center justify-center mx-auto">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h2 className="text-base font-black text-red-700 dark:text-red-400">Failed to load test review</h2>
                    <p className="text-xs text-red-600 dark:text-red-300 break-words">{fetchError}</p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={loadReviewData}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span>Retry</span>
                        </button>
                        <Link
                            href={basePath}
                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center min-h-[44px]"
                        >
                            Back to Tests
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <ReviewAllQuestions
                title={title}
                titleHindi={titleHindi}
                sections={sections}
                questions={questions}
                isPublished={isPublished}
                attemptsCount={attemptsCount}
                onBack={() => router.back()}
                onEditQuestion={(qId) => {
                    router.push(`${basePath}/${encodeURIComponent(id)}/edit?qId=${encodeURIComponent(qId)}`)
                }}
                onPublish={() => setIsPublishModalOpen(true)}
                publishSuccessMessage={publishSuccessMessage}
            />
            <PublishTestModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                testId={id}
                testTitle={title}
                onSuccess={() => {
                    setIsPublished(true)
                    setPublishSuccessMessage("Test published successfully! Students can now attempt it.")
                }}
            />
        </>
    )
}
