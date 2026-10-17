"use client"

import React, { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
    ChevronLeft,
    ChevronRight,
    Save,
    Eye,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    RotateCcw,
    Lock,
    Unlock,
    Tag,
    Video,
    Plus,
    Trash2,
} from "lucide-react"
import ReviewAllQuestions, { ReviewQuestionItem, ReviewSectionItem } from "@/components/exam/ReviewAllQuestions"

interface Option {
    english: string
    hindi: string
}

interface Question {
    id: string
    sectionId: string
    textEnglish: string
    textHindi: string
    options: [Option, Option, Option, Option]
    correctAnswer: 0 | 1 | 2 | 3 | null
    explanationEnglish: string
    explanationHindi: string
    videoUrl: string
    difficulty: "Easy" | "Moderate" | "Hard"
    subject: string
    topic: string
}

interface Section {
    id: string
    name: string
    nameHindi: string
    positiveMarks: number
    negativeMarks: number
    timeLimitMins: number | null
    numQuestions: number
}

function generateTempId() {
    return "tmp_" + Math.random().toString(36).slice(2, 9)
}

function emptyOption(): Option {
    return { english: "", hindi: "" }
}

function emptyQuestion(sectionId: string): Question {
    return {
        id: generateTempId(),
        sectionId,
        textEnglish: "",
        textHindi: "",
        options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
        correctAnswer: null,
        explanationEnglish: "",
        explanationHindi: "",
        videoUrl: "",
        difficulty: "Moderate",
        subject: "",
        topic: "",
    }
}

export default function EditTestPage({
    params,
}: {
    params: Promise<{ id?: string; testId?: string }>
}) {
    const resolvedParams = use(params)
    const id = resolvedParams.testId || resolvedParams.id || ""
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetQIdParam = searchParams.get("qId")

    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveErrorDetails, setSaveErrorDetails] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)

    // Test metadata
    const [title, setTitle] = useState("")
    const [titleHindi, setTitleHindi] = useState("")
    const [isPublished, setIsPublished] = useState(false)
    const [attemptsCount, setAttemptsCount] = useState(0)

    // Sections & Questions
    const [sections, setSections] = useState<Section[]>([])
    const [questions, setQuestions] = useState<Question[]>([])

    // Active navigation state
    const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
    const [currentQIdx, setCurrentQIdx] = useState(0)
    const [showFullReview, setShowFullReview] = useState(false)

    // Load test data
    const loadTestData = useCallback(async () => {
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

            const loadedSections: Section[] = []
            const loadedQuestions: Question[] = []

            for (const s of t.sections || []) {
                loadedSections.push({
                    id: s.id,
                    name: s.title || "Section",
                    nameHindi: s.titleHi || "",
                    positiveMarks: s.positiveMarks ?? 1.0,
                    negativeMarks: s.negativeMarks ?? 0.33,
                    timeLimitMins: s.timeLimitMins,
                    numQuestions: s.questions?.length || 0,
                })

                for (const q of s.questions || []) {
                    const ansLetter = String(q.correctOption || "A").trim().toUpperCase()
                    const ansIdx = ansLetter === "B" ? 1 : ansLetter === "C" ? 2 : ansLetter === "D" ? 3 : 0
                    const diff = String(q.difficulty || "MODERATE").toUpperCase()
                    const mappedDiff = diff === "HARD" ? "Hard" : diff === "EASY" ? "Easy" : "Moderate"

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
                        difficulty: mappedDiff,
                        subject: q.subject || "",
                        topic: q.topic || "",
                    })
                }
            }

            setSections(loadedSections)
            setQuestions(loadedQuestions)

            // If a specific question ID was targeted in query param, navigate there
            if (targetQIdParam && loadedQuestions.length > 0) {
                const targetQ = loadedQuestions.find((q) => q.id === targetQIdParam)
                if (targetQ) {
                    const secIdx = loadedSections.findIndex((s) => s.id === targetQ.sectionId)
                    if (secIdx !== -1) {
                        setCurrentSectionIdx(secIdx)
                        const secQs = loadedQuestions.filter((q) => q.sectionId === targetQ.sectionId)
                        const qIndexInSec = secQs.findIndex((q) => q.id === targetQ.id)
                        if (qIndexInSec !== -1) {
                            setCurrentQIdx(qIndexInSec)
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error("Load test edit data error:", err)
            setFetchError(err.message || "Failed to load test details.")
        } finally {
            setLoading(false)
        }
    }, [id, targetQIdParam])

    useEffect(() => {
        loadTestData()
    }, [loadTestData])

    const isQuestionFilled = (q: Question) =>
        q.textEnglish.trim() !== "" &&
        q.options.every((o) => o.english.trim() !== "") &&
        q.correctAnswer !== null

    const currentSection = sections[currentSectionIdx]
    const questionsForCurrentSection = questions.filter(
        (q) => q.sectionId === currentSection?.id
    )
    const currentQ = questionsForCurrentSection[currentQIdx] ?? null

    const updateQuestion = (qId: string, patch: Partial<Question>) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === qId ? { ...q, ...patch } : q))
        )
    }

    const updateOption = (qId: string, optIdx: number, patch: Partial<Option>) => {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.id !== qId) return q
                const options = q.options.map((o, i) =>
                    i === optIdx ? { ...o, ...patch } : o
                ) as Question["options"]
                return { ...q, options }
            })
        )
    }

    // Part G: Draft edit allowed to add/remove questions in section
    const handleAddQuestionToSection = (sectionId: string) => {
        if (isPublished) return
        const newQ = emptyQuestion(sectionId)
        setQuestions((prev) => [...prev, newQ])
        setSections((prev) =>
            prev.map((s) =>
                s.id === sectionId ? { ...s, numQuestions: s.numQuestions + 1 } : s
            )
        )
        // Focus new question
        const newQsForSec = questions.filter((q) => q.sectionId === sectionId)
        setCurrentQIdx(newQsForSec.length)
    }

    const handleRemoveQuestion = (qId: string, sectionId: string) => {
        if (isPublished) return
        if (questionsForCurrentSection.length <= 1) {
            alert("A section must contain at least 1 question.")
            return
        }
        if (confirm("Are you sure you want to remove this question?")) {
            setQuestions((prev) => prev.filter((q) => q.id !== qId))
            setSections((prev) =>
                prev.map((s) =>
                    s.id === sectionId ? { ...s, numQuestions: Math.max(1, s.numQuestions - 1) } : s
                )
            )
            if (currentQIdx > 0) setCurrentQIdx((p) => p - 1)
        }
    }

    const handleSave = async () => {
        if (!title.trim()) {
            setSaveError("Test title is required.")
            setSaveErrorDetails([])
            return
        }

        setIsSaving(true)
        setSaveError(null)
        setSaveErrorDetails([])
        setSaveSuccessMessage(null)

        try {
            const mappedSectionsPayload = sections.map((sec) => {
                const secQs = questions.filter((q) => q.sectionId === sec.id)
                return {
                    id: sec.id,
                    title: sec.name,
                    titleHi: sec.nameHindi,
                    positiveMarks: sec.positiveMarks,
                    negativeMarks: sec.negativeMarks,
                    timeLimitMins: sec.timeLimitMins,
                    questions: secQs.map((q) => ({
                        id: q.id,
                        questionEn: q.textEnglish,
                        questionHi: q.textHindi,
                        optionAEn: q.options[0].english,
                        optionBEn: q.options[1].english,
                        optionCEn: q.options[2].english,
                        optionDEn: q.options[3].english,
                        optionAHi: q.options[0].hindi,
                        optionBHi: q.options[1].hindi,
                        optionCHi: q.options[2].hindi,
                        optionDHi: q.options[3].hindi,
                        correctOption: q.correctAnswer !== null ? ["A", "B", "C", "D"][q.correctAnswer] : "A",
                        explanationEn: q.explanationEnglish,
                        explanationHi: q.explanationHindi,
                        videoUrl: q.videoUrl,
                        difficulty: q.difficulty?.toUpperCase() || "MODERATE",
                        subject: q.subject,
                        topic: q.topic,
                    })),
                }
            })

            const res = await fetch(`/api/exam/test/${encodeURIComponent(id)}/edit-data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    titleHi: titleHindi.trim(),
                    sections: mappedSectionsPayload,
                }),
            })

            const json = await res.json()
            if (!res.ok) {
                const errMsg = json.error || `Save failed with status ${res.status}`
                setSaveError(errMsg)
                if (Array.isArray(json.details)) setSaveErrorDetails(json.details)
                return
            }

            setSaveSuccessMessage("Test saved successfully!")
            setTimeout(() => setSaveSuccessMessage(null), 4000)
        } catch (err: any) {
            console.error("Save test error:", err)
            setSaveError(err.message || "Failed to save test.")
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Loading test editor…</p>
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
                    <h2 className="text-base font-black text-red-700 dark:text-red-400">Failed to load test</h2>
                    <p className="text-xs text-red-600 dark:text-red-300 break-words">{fetchError}</p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={loadTestData}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer min-h-[44px]"
                        >
                            <RotateCcw className="h-4 w-4" />
                            <span>Retry</span>
                        </button>
                        <Link
                            href="/teacher/test-series"
                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center min-h-[44px]"
                        >
                            Back to Tests
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Review all questions view toggle
    if (showFullReview) {
        const reviewSections: ReviewSectionItem[] = sections.map((s) => ({
            id: s.id,
            name: s.name,
            nameHindi: s.nameHindi,
            positiveMarks: s.positiveMarks,
            negativeMarks: s.negativeMarks,
            numQuestions: s.numQuestions,
        }))

        const reviewQuestions: ReviewQuestionItem[] = questions.map((q) => ({
            id: q.id,
            sectionId: q.sectionId,
            textEnglish: q.textEnglish,
            textHindi: q.textHindi,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanationEnglish: q.explanationEnglish,
            explanationHindi: q.explanationHindi,
            difficulty: q.difficulty,
            subject: q.subject,
            topic: q.topic,
            videoUrl: q.videoUrl,
        }))

        return (
            <ReviewAllQuestions
                title={title}
                titleHindi={titleHindi}
                sections={reviewSections}
                questions={reviewQuestions}
                isPublished={isPublished}
                attemptsCount={attemptsCount}
                onBack={() => setShowFullReview(false)}
                onEditQuestion={(qId, sectionId) => {
                    setShowFullReview(false)
                    const sIdx = sections.findIndex((s) => s.id === sectionId)
                    if (sIdx !== -1) {
                        setCurrentSectionIdx(sIdx)
                        const secQs = questions.filter((q) => q.sectionId === sectionId)
                        const qIdx = secQs.findIndex((q) => q.id === qId)
                        if (qIdx !== -1) setCurrentQIdx(qIdx)
                    }
                }}
            />
        )
    }

    const totalQuestionsCount = questions.length
    const completedCount = questions.filter(isQuestionFilled).length

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 px-3 sm:px-6">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/teacher/test-series"
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Back to tests list"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                                Test Editor
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    isPublished
                                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                }`}
                            >
                                {isPublished ? "PUBLISHED" : "DRAFT"}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
                            {title || "Edit Test"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowFullReview(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[44px]"
                    >
                        <Eye className="h-4 w-4 text-sky-500" />
                        <span>Review All ({totalQuestionsCount})</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                        {isSaving ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Saving…</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification / Banner strip */}
            {isPublished ? (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                    <Lock className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <div className="space-y-0.5">
                        <p className="font-bold">Structure Locked (Published Test)</p>
                        <p className="text-[11px] text-blue-700 dark:text-blue-400">
                            Sections, question counts, and marks are locked to preserve integrity for students.
                            You can edit question text, options, answers, and explanations.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <Unlock className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                        <strong>Draft Mode:</strong> You can edit question content, add new questions, or remove questions before publishing.
                    </span>
                </div>
            )}

            {attemptsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                        This test has <strong>{attemptsCount} attempt(s)</strong>.
                        <strong> Past attempt scores are not recalculated.</strong>
                    </span>
                </div>
            )}

            {/* Error & Success Banners */}
            {saveError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs space-y-2">
                    <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Error saving test</p>
                            <p className="break-words">{saveError}</p>
                        </div>
                    </div>
                    {saveErrorDetails.length > 0 && (
                        <ul className="pl-6 list-disc space-y-1 text-red-600 dark:text-red-300 text-[11px]">
                            {saveErrorDetails.map((d, i) => (
                                <li key={i}>{d}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{saveSuccessMessage}</span>
                </div>
            )}

            {/* Test Title editable bar */}
            <div className="p-4 bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Test Title (English) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. 72nd BPSC Prelims Full Mock Test 1"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold focus:outline-hidden focus:border-sky-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Test Title (Hindi)
                        </label>
                        <input
                            type="text"
                            value={titleHindi}
                            onChange={(e) => setTitleHindi(e.target.value)}
                            placeholder="उदा. 72वीं बीपीएससी प्रारंभिक परीक्षा मॉक टेस्ट 1"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-normal focus:outline-hidden focus:border-sky-500"
                        />
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        Questions Complete
                    </span>
                    <span className="text-xs font-black text-sky-700 dark:text-sky-400">
                        {completedCount} of {totalQuestionsCount} complete
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{
                            width: `${totalQuestionsCount > 0 ? (completedCount / totalQuestionsCount) * 100 : 0}%`,
                        }}
                    />
                </div>
            </div>

            {/* Main Editor Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Sections & Navigator */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Section tabs */}
                    {sections.length > 1 && (
                        <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-xs font-black text-gray-700 dark:text-gray-200">Sections</p>
                            </div>
                            <div className="p-2 space-y-1">
                                {sections.map((sec, idx) => {
                                    const qsForSec = questions.filter((q) => q.sectionId === sec.id)
                                    const filled = qsForSec.filter(isQuestionFilled).length
                                    return (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => {
                                                setCurrentSectionIdx(idx)
                                                setCurrentQIdx(0)
                                            }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                currentSectionIdx === idx
                                                    ? "bg-sky-600 text-white"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                            }`}
                                        >
                                            <span className="block truncate">{sec.name}</span>
                                            <span
                                                className={`text-[10px] font-normal ${
                                                    currentSectionIdx === idx ? "text-white/80" : "text-gray-400"
                                                }`}
                                            >
                                                {filled}/{qsForSec.length} complete
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Palette Navigator */}
                    <div className="bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
                        <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <p className="text-xs font-black text-gray-700 dark:text-gray-200">
                                {currentSection?.name || "Section"} Navigator
                            </p>
                        </div>
                        <div className="p-3">
                            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                                {questionsForCurrentSection.map((q, qi) => {
                                    const done = isQuestionFilled(q)
                                    const active = qi === currentQIdx
                                    return (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => setCurrentQIdx(qi)}
                                            className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                                                active
                                                    ? "bg-sky-600 text-white border-sky-600 shadow-xs scale-105"
                                                    : done
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                                                    : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 hover:border-amber-400"
                                            }`}
                                            title={`Q${qi + 1}: ${done ? "Complete" : "Incomplete"}`}
                                        >
                                            {qi + 1}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Add question to draft section */}
                            {!isPublished && (
                                <button
                                    type="button"
                                    onClick={() => handleAddQuestionToSection(currentSection.id)}
                                    className="w-full mt-3 py-2 border-2 border-dashed border-sky-400/50 hover:border-sky-500 text-sky-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/20 transition-all min-h-[44px]"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Question to Section</span>
                                </button>
                            )}

                            {/* Edit Section Marks on Draft */}
                            {!isPublished && currentSection && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Section Marks (Draft)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Positive Marks</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                min="0"
                                                aria-label="Section Positive Marks"
                                                value={currentSection.positiveMarks}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value) || 0
                                                    setSections((prev) =>
                                                        prev.map((s, idx) => (idx === currentSectionIdx ? { ...s, positiveMarks: v } : s))
                                                    )
                                                }}
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Negative Marks</label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                aria-label="Section Negative Marks"
                                                value={currentSection.negativeMarks}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value) || 0
                                                    setSections((prev) =>
                                                        prev.map((s, idx) => (idx === currentSectionIdx ? { ...s, negativeMarks: v } : s))
                                                    )
                                                }}
                                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Question Editor */}
                {currentQ && (
                    <div className="lg:col-span-9 bg-white dark:bg-[#071d33] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-800 dark:text-white">
                                    Question {currentQIdx + 1} of {questionsForCurrentSection.length}
                                </h3>
                                <p className="text-xs text-gray-500">{currentSection?.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isQuestionFilled(currentQ) ? (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Complete
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Incomplete
                                    </span>
                                )}

                                {!isPublished && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(currentQ.id, currentSection.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-2 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                                        title="Remove question from draft"
                                        aria-label="Remove question from draft"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Question prompt (English / Hindi) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Question Text (English) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={currentQ.textEnglish}
                                        onChange={(e) => updateQuestion(currentQ.id, { textEnglish: e.target.value })}
                                        placeholder="Type question in English…"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-hidden focus:border-sky-500 resize-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Question Text (Hindi)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={currentQ.textHindi}
                                        onChange={(e) => updateQuestion(currentQ.id, { textHindi: e.target.value })}
                                        placeholder="प्रश्न हिंदी में टाइप करें…"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-hidden focus:border-sky-500 resize-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* 4 Options with radio button */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Answer Options{" "}
                                    <span className="text-gray-400 font-normal">
                                        — select the radio button for the correct answer
                                    </span>
                                </label>
                                <div className="space-y-3">
                                    {(["A", "B", "C", "D"] as const).map((letter, optIdx) => {
                                        const opt = currentQ.options[optIdx]
                                        const isCorrect = currentQ.correctAnswer === optIdx

                                        return (
                                            <div
                                                key={letter}
                                                className={`p-3 rounded-xl border transition-all ${
                                                    isCorrect
                                                        ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer shrink-0 min-h-[44px]">
                                                        <input
                                                            type="radio"
                                                            name={`correct_${currentQ.id}`}
                                                            checked={isCorrect}
                                                            onChange={() =>
                                                                updateQuestion(currentQ.id, {
                                                                    correctAnswer: optIdx as 0 | 1 | 2 | 3,
                                                                })
                                                            }
                                                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                                            data-testid={`edit-correct-${letter}`}
                                                        />
                                                        <span
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                                                                isCorrect
                                                                    ? "bg-emerald-600 text-white"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                                            }`}
                                                        >
                                                            {letter}
                                                        </span>
                                                    </label>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={opt.english}
                                                            onChange={(e) =>
                                                                updateOption(currentQ.id, optIdx, {
                                                                    english: e.target.value,
                                                                })
                                                            }
                                                            placeholder={`Option ${letter} in English…`}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-hidden focus:border-sky-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={opt.hindi}
                                                            onChange={(e) =>
                                                                updateOption(currentQ.id, optIdx, {
                                                                    hindi: e.target.value,
                                                                })
                                                            }
                                                            placeholder={`विकल्प ${letter} हिंदी में…`}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-hidden focus:border-sky-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Explanations */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Explanation (English)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={currentQ.explanationEnglish}
                                        onChange={(e) =>
                                            updateQuestion(currentQ.id, {
                                                explanationEnglish: e.target.value,
                                            })
                                        }
                                        placeholder="Explain why the correct answer is right…"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-sky-500 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Explanation (Hindi)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={currentQ.explanationHindi}
                                        onChange={(e) =>
                                            updateQuestion(currentQ.id, {
                                                explanationHindi: e.target.value,
                                            })
                                        }
                                        placeholder="उत्तर का विवरण हिंदी में…"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-sky-500 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Meta row: Difficulty, Subject, Topic, Video URL */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Difficulty
                                    </label>
                                    <select
                                        value={currentQ.difficulty}
                                        onChange={(e) =>
                                            updateQuestion(currentQ.id, {
                                                difficulty: e.target.value as "Easy" | "Moderate" | "Hard",
                                            })
                                        }
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold focus:outline-hidden focus:border-sky-500"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={currentQ.subject}
                                        onChange={(e) => updateQuestion(currentQ.id, { subject: e.target.value })}
                                        placeholder="e.g. History"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Tag className="inline h-3 w-3 mr-1" />
                                        Topic
                                    </label>
                                    <input
                                        type="text"
                                        value={currentQ.topic}
                                        onChange={(e) => updateQuestion(currentQ.id, { topic: e.target.value })}
                                        placeholder="e.g. Maurya Period"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-sky-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Video className="inline h-3 w-3 mr-1" />
                                        Video URL
                                    </label>
                                    <input
                                        type="url"
                                        value={currentQ.videoUrl}
                                        onChange={(e) => updateQuestion(currentQ.id, { videoUrl: e.target.value })}
                                        placeholder="https://youtube.com/…"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-hidden focus:border-sky-500"
                                    />
                                </div>
                            </div>

                            {/* Navigation controls */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    type="button"
                                    disabled={currentQIdx === 0}
                                    onClick={() => setCurrentQIdx((p) => p - 1)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span>Prev</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextEmpty = questionsForCurrentSection.findIndex(
                                            (q, i) => i > currentQIdx && !isQuestionFilled(q)
                                        )
                                        if (nextEmpty !== -1) setCurrentQIdx(nextEmpty)
                                        else if (currentQIdx < questionsForCurrentSection.length - 1)
                                            setCurrentQIdx((p) => p + 1)
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>Save & Next</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={currentQIdx === questionsForCurrentSection.length - 1}
                                    onClick={() => setCurrentQIdx((p) => p + 1)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer min-h-[44px]"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
