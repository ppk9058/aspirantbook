"use client"

import React, { useState } from "react"
import {
    ChevronLeft,
    CheckCircle2,
    AlertTriangle,
    Eye,
    Pencil,
    ArrowUp,
    Search,
} from "lucide-react"
import MathRenderer from "@/components/exam/MathRenderer"

export interface ReviewQuestionItem {
    id: string
    sectionId: string
    textEnglish: string
    textHindi?: string
    options: Array<{ english: string; hindi?: string }>
    correctAnswer: 0 | 1 | 2 | 3 | null
    explanationEnglish?: string
    explanationHindi?: string
    difficulty?: string
    subject?: string
    topic?: string
    videoUrl?: string
    order?: number
}

export interface ReviewSectionItem {
    id: string
    name: string
    nameHindi?: string
    positiveMarks?: number
    negativeMarks?: number
    numQuestions?: number
}

interface ReviewAllQuestionsProps {
    title: string
    titleHindi?: string
    sections: ReviewSectionItem[]
    questions: ReviewQuestionItem[]
    onBack: () => void
    onEditQuestion?: (qId: string, sectionId: string, questionIdx: number) => void
    isPublished?: boolean
    attemptsCount?: number
    subtitle?: string
    onPublish?: () => void
    publishSuccessMessage?: string | null
}

export default function ReviewAllQuestions({
    title,
    titleHindi,
    sections,
    questions,
    onBack,
    onEditQuestion,
    isPublished = false,
    attemptsCount = 0,
    subtitle = "Review every question before publishing or saving",
    onPublish,
    publishSuccessMessage,
}: ReviewAllQuestionsProps) {
    const [languageMode, setLanguageMode] = useState<"both" | "english" | "hindi">("both")
    const [jumpInput, setJumpInput] = useState("")

    const isFilled = (q: ReviewQuestionItem) => {
        return (
            Boolean(q.textEnglish?.trim()) &&
            Array.isArray(q.options) &&
            q.options.length >= 4 &&
            q.options.slice(0, 4).every((o) => Boolean(o?.english?.trim())) &&
            q.correctAnswer !== null &&
            q.correctAnswer !== undefined
        )
    }

    const totalQuestions = questions.length
    const completeCount = questions.filter(isFilled).length
    const incompleteCount = totalQuestions - completeCount

    // Find 1-based global number of the first incomplete question
    let firstIncompleteGlobalNum: number | null = null
    let tempGlobalIdx = 0
    for (const sec of sections) {
        const secQs = questions.filter((q) => q.sectionId === sec.id)
        for (const q of secQs) {
            tempGlobalIdx++
            if (!isFilled(q) && firstIncompleteGlobalNum === null) {
                firstIncompleteGlobalNum = tempGlobalIdx
            }
        }
    }

    const handleJumpToFirstIncomplete = () => {
        if (firstIncompleteGlobalNum !== null) {
            const el = document.getElementById(`review-question-${firstIncompleteGlobalNum}`)
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" })
            }
        }
    }

    const handleJump = (e: React.FormEvent) => {
        e.preventDefault()
        const targetNum = parseInt(jumpInput, 10)
        if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= totalQuestions) {
            const el = document.getElementById(`review-question-${targetNum}`)
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" })
            }
        }
    }

    // Assign overall 1..N indices across all sections
    let runningGlobalIndex = 0

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#060f1c] text-gray-900 dark:text-gray-100 pb-28 sm:pb-20">
            {/* Sticky Header Bar */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071d33]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-xs px-4 sm:px-6 py-3">
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0 min-h-[44px]"
                            aria-label="Back"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Back</span>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black truncate leading-tight">
                                {title || "Test Review"}
                            </h1>
                            {titleHindi && (
                                <p className="text-[11px] text-gray-500 truncate">{titleHindi}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Progress pill */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold shrink-0 min-h-[44px]">
                            <span className="text-[#00A8FF]">
                                {completeCount} of {totalQuestions} complete
                            </span>
                            {incompleteCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-black">
                                    {incompleteCount} incomplete
                                </span>
                            )}
                        </div>

                        {/* Language Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold shrink-0 min-h-[44px]">
                            <button
                                type="button"
                                onClick={() => setLanguageMode("both")}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    languageMode === "both"
                                        ? "bg-white dark:bg-sky-600 text-sky-700 dark:text-white shadow-xs font-bold"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                }`}
                            >
                                Both
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguageMode("english")}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    languageMode === "english"
                                        ? "bg-white dark:bg-sky-600 text-sky-700 dark:text-white shadow-xs font-bold"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                }`}
                            >
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguageMode("hindi")}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    languageMode === "hindi"
                                        ? "bg-white dark:bg-sky-600 text-sky-700 dark:text-white shadow-xs font-bold"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                                }`}
                            >
                                हिंदी
                            </button>
                        </div>

                        {/* Jump to Question */}
                        <form onSubmit={handleJump} className="flex items-center gap-1.5 shrink-0 min-h-[44px]">
                            <input
                                type="number"
                                min={1}
                                max={totalQuestions || 1}
                                value={jumpInput}
                                onChange={(e) => setJumpInput(e.target.value)}
                                placeholder="Q#"
                                className="w-16 px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold focus:outline-hidden focus:border-[#00A8FF]"
                                aria-label="Jump to question number"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
                            >
                                Jump
                            </button>
                        </form>

                        {/* Desktop / Tablet Publish action or Published badge */}
                        {isPublished ? (
                            <div
                                data-testid="desktop-published-badge"
                                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold min-h-[44px]"
                            >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Published</span>
                            </div>
                        ) : onPublish ? (
                            <div className="hidden sm:flex items-center gap-2">
                                {incompleteCount > 0 ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleJumpToFirstIncomplete}
                                            data-testid="jump-incomplete-link"
                                            className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                            <span>{incompleteCount} incomplete - jump to first</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={true}
                                            data-testid="publish-top-bar-button"
                                            className="px-4 py-2 bg-emerald-600/40 text-white rounded-xl text-xs font-bold cursor-not-allowed opacity-60 min-h-[44px] flex items-center gap-1.5"
                                            title="Complete all questions before publishing"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Publish</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onPublish}
                                        data-testid="publish-top-bar-button"
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer min-h-[44px] flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Publish</span>
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            {/* Notice if attempts exist */}
            {attemptsCount > 0 && (
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
                        <span>
                            This test has <strong>{attemptsCount} student attempt(s)</strong>.
                            Past attempt scores are not recalculated.
                        </span>
                    </div>
                </div>
            )}

            {/* Publish success banner */}
            {publishSuccessMessage && (
                <div
                    data-testid="publish-success-banner"
                    className="max-w-5xl mx-auto px-4 sm:px-6 pt-4"
                >
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{publishSuccessMessage}</span>
                    </div>
                </div>
            )}

            {/* Questions by Section */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
                {sections.map((section, sIdx) => {
                    const secQuestions = questions.filter((q) => q.sectionId === section.id)

                    return (
                        <section key={section.id} className="space-y-4">
                            {/* Section header */}
                            <div className="flex items-center justify-between pb-2 border-b-2 border-sky-500/30">
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs">
                                            Section {sIdx + 1}
                                        </span>
                                        <span>{section.name || `Section ${sIdx + 1}`}</span>
                                        {section.nameHindi && (
                                            <span className="text-xs text-gray-500 font-normal">
                                                ({section.nameHindi})
                                            </span>
                                        )}
                                    </h2>
                                </div>
                                <div className="text-xs text-gray-500 font-semibold">
                                    {secQuestions.length} Question{secQuestions.length !== 1 ? "s" : ""}
                                    {section.positiveMarks !== undefined && (
                                        <span className="ml-2 font-mono">
                                            (+{section.positiveMarks} / -{section.negativeMarks || 0})
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Section questions */}
                            <div className="space-y-4">
                                {secQuestions.map((q, qLocalIdx) => {
                                    runningGlobalIndex++
                                    const globalNum = runningGlobalIndex
                                    const filled = isFilled(q)
                                    const correctIdx = q.correctAnswer

                                    return (
                                        <article
                                            key={q.id || globalNum}
                                            id={`review-question-${globalNum}`}
                                            data-testid={`review-question-${globalNum}`}
                                            className={`p-5 rounded-2xl border transition-all ${
                                                filled
                                                    ? "bg-white dark:bg-[#071d33] border-gray-200 dark:border-gray-800 shadow-xs"
                                                    : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60"
                                            }`}
                                        >
                                            {/* Header strip: Number, badges, edit jump */}
                                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-black">
                                                        Q{globalNum}
                                                    </span>
                                                    <span className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                        Question {globalNum}
                                                    </span>

                                                    {filled ? (
                                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Complete
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                            Incomplete
                                                        </span>
                                                    )}

                                                    {q.difficulty && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                                                            {q.difficulty}
                                                        </span>
                                                    )}

                                                    {q.subject && (
                                                        <span className="text-[11px] text-gray-500 font-medium">
                                                            • {q.subject}
                                                        </span>
                                                    )}

                                                    {q.topic && (
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            ({q.topic})
                                                        </span>
                                                    )}
                                                </div>

                                                {onEditQuestion && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditQuestion(q.id, section.id, qLocalIdx)}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer min-h-[44px]"
                                                        aria-label={`Edit question ${globalNum}`}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        <span>Edit</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Question prompt text */}
                                            <div className="py-3 space-y-1.5">
                                                {(languageMode === "both" || languageMode === "english") && (
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-pre-line">
                                                        <MathRenderer text={q.textEnglish || "(No English question text provided)"} />
                                                    </div>
                                                )}
                                                {(languageMode === "both" || languageMode === "hindi") && q.textHindi && (
                                                    <div className="text-sm font-normal text-gray-600 dark:text-gray-400 pt-0.5 whitespace-pre-line">
                                                        <MathRenderer text={q.textHindi} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 4 Options */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                                {["A", "B", "C", "D"].map((letter, optIdx) => {
                                                    const opt = q.options?.[optIdx]
                                                    const isCorrect = correctIdx === optIdx

                                                    return (
                                                        <div
                                                            key={letter}
                                                            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                                                                isCorrect
                                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs"
                                                                    : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5 ${
                                                                    isCorrect
                                                                        ? "bg-emerald-600 text-white"
                                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                                }`}
                                                            >
                                                                {letter}
                                                            </span>
                                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                                {(languageMode === "both" || languageMode === "english") && (
                                                                    <div className="whitespace-pre-line">
                                                                        <MathRenderer text={opt?.english || `(Option ${letter} empty)`} />
                                                                    </div>
                                                                )}
                                                                {(languageMode === "both" || languageMode === "hindi") && opt?.hindi && (
                                                                    <div className="text-gray-500 dark:text-gray-400 text-[11px] whitespace-pre-line">
                                                                        <MathRenderer text={opt.hindi} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isCorrect && (
                                                                <span className="shrink-0 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md">
                                                                    CORRECT
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Explanation */}
                                            {(q.explanationEnglish || q.explanationHindi) && (
                                                <div className="mt-4 p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-xs space-y-1">
                                                    <p className="font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider text-[10px]">
                                                        Explanation:
                                                    </p>
                                                    {(languageMode === "both" || languageMode === "english") && q.explanationEnglish && (
                                                        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                                                            <MathRenderer text={q.explanationEnglish} />
                                                        </div>
                                                    )}
                                                    {(languageMode === "both" || languageMode === "hindi") && q.explanationHindi && (
                                                        <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                                            <MathRenderer text={q.explanationHindi} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </main>

            {/* Mobile Fixed Bottom Bar (360px friendly, respect safe-area) */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#071d33]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-between gap-2 min-h-[56px]">
                {isPublished ? (
                    <div
                        data-testid="mobile-published-badge"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold min-h-[44px]"
                    >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Published</span>
                    </div>
                ) : onPublish ? (
                    incompleteCount > 0 ? (
                        <>
                            <button
                                type="button"
                                onClick={handleJumpToFirstIncomplete}
                                data-testid="mobile-jump-incomplete-link"
                                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] truncate"
                            >
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                <span className="truncate">{incompleteCount} incomplete - jump</span>
                            </button>
                            <button
                                type="button"
                                disabled={true}
                                data-testid="mobile-review-publish-button"
                                className="px-3.5 py-2 bg-emerald-600/40 text-white rounded-xl text-xs font-bold cursor-not-allowed opacity-60 min-h-[44px] shrink-0 flex items-center gap-1.5"
                            >
                                <span>Publish</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 min-h-[44px]">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                <span>All Complete</span>
                            </div>
                            <button
                                type="button"
                                onClick={onPublish}
                                data-testid="mobile-review-publish-button"
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer min-h-[44px] shrink-0 flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Publish</span>
                            </button>
                        </>
                    )
                ) : null}
            </div>
        </div>
    )
}
