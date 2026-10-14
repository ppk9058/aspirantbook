"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronRight,
    ChevronLeft,
    Check,
    AlertTriangle,
    AlertCircle,
    User,
    Clock,
    FileText,
    Globe
} from "lucide-react"
import { useSession } from "next-auth/react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"

interface TestMeta {
    id: string
    title: string
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
    testType?: string
    seriesSlug?: string
}

function DeclarationContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { data: session } = useSession()

    const seriesId = params?.id as string
    const testId = searchParams.get("testId")

    const [loading, setLoading] = useState(true)
    const [test, setTest] = useState<TestMeta | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [selectedLang, setSelectedLang] = useState<"Hindi" | "English">("Hindi")
    const [agreed, setAgreed] = useState(false)
    const [starting, setStarting] = useState(false)
    const [startError, setStartError] = useState<string | null>(null)

    useEffect(() => {
        if (!testId) {
            setError("No test selected.")
            setLoading(false)
            return
        }

        let isMounted = true
        fetch(`/api/exam/${encodeURIComponent(testId)}/questions?metadataOnly=1`)
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Test not found.")
                    throw new Error("Failed to load test details.")
                }
                return res.json()
            })
            .then((json) => {
                if (isMounted) {
                    if (json.data?.test) {
                        setTest(json.data.test)
                    } else {
                        setError("Invalid test data received.")
                    }
                    setLoading(false)
                }
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message || "Failed to load test.")
                    setLoading(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [testId])

    if (loading) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading exam details...</p>
                </div>
            </div>
        )
    }

    const isCurrentAffairs =
        seriesId === "current-affairs-system-series" ||
        test?.testType === "CURRENT_AFFAIRS" ||
        test?.seriesSlug === "current-affairs-system-series"
    const isPyq =
        seriesId === "pyq-system-series" ||
        test?.testType === "PREVIOUS_YEAR" ||
        test?.seriesSlug === "pyq-system-series"

    const defaultReturnPath = isCurrentAffairs
        ? "/current-affairs-quizzes"
        : isPyq
        ? "/pyqs"
        : `/test-series/${seriesId}`

    const rawReturnPath = searchParams.get("returnPath")
    const safeReturnPath = sanitizeReturnPath(rawReturnPath, defaultReturnPath)

    if (error || !test) {
        const backLabel = isCurrentAffairs || safeReturnPath.includes("/current-affairs-quizzes")
            ? "Back to Current Affairs"
            : isPyq || safeReturnPath.includes("/pyqs")
            ? "Back to Previous Papers"
            : "Back to Test Series"
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-white p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Unable to Load Test</h2>
                    <p className="text-sm text-gray-600">{error || "The requested test was not found."}</p>
                    <button
                        onClick={() => router.push(safeReturnPath)}
                        className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                    >
                        {backLabel}
                    </button>
                </div>
            </div>
        )
    }

    const testTitle = test.title
    const questions = test.totalQuestions
    const marks = test.totalMarks
    const duration = test.durationMinutes
    const candidateName = session?.user?.name || "Student"
    const instQuery = new URLSearchParams()
    instQuery.set("testId", test.id)
    if (safeReturnPath && safeReturnPath !== `/test-series/${seriesId}`) {
        instQuery.set("returnPath", safeReturnPath)
    }
    const caQuizSlug = test?.title
        ? test.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || test.id
        : test?.id
    const instructionsHref = isCurrentAffairs && caQuizSlug
        ? `/current-affairs-quizzes/${encodeURIComponent(caQuizSlug)}/instructions`
        : `/test-series/${seriesId}/instructions?${instQuery.toString()}`

    const handleStartAttempt = async () => {
        if (!agreed || starting || !test) return
        setStarting(true)
        setStartError(null)

        const isRetake = searchParams.get("retake") === "true"

        try {
            const res = await fetch("/api/exam/attempt/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    testId: test.id,
                    language: selectedLang,
                    retake: isRetake,
                }),
            })

            const json = await res.json()
            if (!res.ok || !json.data?.attemptId) {
                throw new Error(json.error || "Failed to start exam session. Please try again.")
            }

            const attemptId = json.data.attemptId
            const attemptQuery = new URLSearchParams()
            attemptQuery.set("testId", test.id)
            attemptQuery.set("attemptId", attemptId)
            attemptQuery.set("lang", selectedLang)
            if (safeReturnPath !== `/test-series/${seriesId}`) {
                attemptQuery.set("returnPath", safeReturnPath)
            }
            router.replace(`/test-series/${seriesId}/attempt?${attemptQuery.toString()}`)
        } catch (err: any) {
            setStartError(err.message || "Failed to start test.")
            setStarting(false)
        }
    }

    return (
        <div className="h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: "sans-serif" }}>

            {/* ── TOP BAR ─────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 bg-white shrink-0 min-h-[52px]">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                        <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center">
                            <span className="text-white text-[9px] font-black">TS</span>
                        </div>
                        <span className="text-teal-600 font-black text-sm hidden xs:inline sm:inline">aspirantbook</span>
                    </div>
                    <div className="w-px h-5 bg-gray-300 shrink-0" />
                    <span className="text-gray-700 text-xs sm:text-sm font-semibold truncate max-w-[160px] sm:max-w-md">{testTitle}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 shrink-0 pl-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-white/60" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate max-w-[70px] sm:max-w-none">{candidateName}</span>
                </div>
            </header>

            {/* ── MAIN ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

                    {/* Exam Summary */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 sm:px-5 py-3 border-b border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800">Exam Summary</h2>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-gray-100">
                            {[
                                { icon: <FileText className="h-5 w-5 text-sky-500" />, label: "Questions", value: questions },
                                { icon: <FileText className="h-5 w-5 text-green-500" />, label: "Total Marks", value: marks },
                                { icon: <Clock className="h-5 w-5 text-amber-500" />, label: "Duration", value: `${duration} min` },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 py-4 sm:py-5">
                                    {item.icon}
                                    <span className="text-lg sm:text-xl font-bold text-gray-900">{item.value}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider text-center">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Globe className="h-4 w-4 text-teal-600" />
                            <h2 className="text-sm font-bold text-gray-800">Please select the language of your choice for the question paper.</h2>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {(["Hindi", "English"] as const).map((lang) => (
                                <label
                                    key={lang}
                                    onClick={() => setSelectedLang(lang)}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                                        selectedLang === lang ? "border-sky-500 bg-sky-50/50" : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedLang === lang ? "border-sky-500 bg-sky-500" : "border-gray-400"
                                        }`}
                                    >
                                        {selectedLang === lang && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-sm text-gray-800 font-semibold">{lang}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Please note, all questions will appear in your preferred language. This language can be changed for a particular question during the exam.
                        </p>
                    </div>

                    {/* Declaration */}
                    <div className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-gray-50">
                        <h2 className="text-sm font-bold text-gray-800 mb-3 sm:mb-4">Declaration</h2>
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-4 sm:mb-5">
                            I have read all the instructions carefully and I understand them. I agree not to cheat or use unfair means in this examination. I understand that using unfair means of any sort for my benefit or for the benefit of someone else will result in my disqualification from the examination. I am ready to abide by the rules and regulations of the examination administration.
                        </p>
                        <label
                            data-testid="declaration-checkbox"
                            onClick={() => setAgreed(!agreed)}
                            className="flex items-start gap-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-gray-100/50 transition-colors min-h-[44px]"
                        >
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="sr-only"
                                aria-label="I have read and understood the instructions"
                            />
                            <div
                                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                    agreed ? "border-sky-500 bg-sky-500" : "border-gray-400 hover:border-sky-400"
                                }`}
                            >
                                {agreed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs sm:text-sm text-gray-700 font-medium select-none">
                                I have read and understood the instructions. All computer hardware allotted to me is in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. /any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
                            </span>
                        </label>
                    </div>

                    {!agreed && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">Please read and accept the declaration to proceed with the exam.</p>
                        </div>
                    )}

                    {startError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                            <p className="text-xs text-red-700">{startError}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── BOTTOM BAR ──────────────────────────────────────── */}
            <footer
                className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-t border-gray-200 bg-gray-50 shrink-0"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
                <Link
                    href={instructionsHref}
                    className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                </Link>
                <button
                    onClick={handleStartAttempt}
                    disabled={!agreed || starting}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all ${
                        agreed && !starting ? "bg-sky-500 hover:bg-sky-600 cursor-pointer shadow-sm" : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                    {starting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Starting...</span>
                        </>
                    ) : (
                        <>
                            <span>I am ready to begin</span>
                            <ChevronRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </footer>
        </div>
    )
}

export default function DeclarationPage() {
    return (
        <Suspense fallback={
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <DeclarationContent />
        </Suspense>
    )
}
