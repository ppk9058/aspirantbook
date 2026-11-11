"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronRight,
    ArrowLeft,
    User,
    AlertCircle,
    Clock,
    FileText,
    CheckCircle2,
    Bookmark,
    EyeOff,
    HelpCircle,
    Save
} from "lucide-react"
import { useSession } from "next-auth/react"
import { sanitizeReturnPath } from "@/lib/utils/return-path"
import BrandLogo from "@/components/brand/BrandLogo"

interface TestMeta {
    id: string
    title: string
    durationMinutes: number
    totalQuestions: number
    totalMarks: number
}

function InstructionsContent() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { data: session } = useSession()

    const seriesId = params?.id as string
    const testId = searchParams.get("testId")

    const [loading, setLoading] = useState(true)
    const [test, setTest] = useState<TestMeta | null>(null)
    const [error, setError] = useState<string | null>(null)

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
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#1448d8] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading examination instructions...</p>
                </div>
            </div>
        )
    }

    const rawReturnPath = searchParams.get("returnPath")
    const safeReturnPath = sanitizeReturnPath(rawReturnPath, `/test-series/${seriesId}`)

    if (error || !test) {
        const backLabel = safeReturnPath.includes("/pyqs") ? "Back to Previous Papers" : "Back to Test Series"
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Unable to Load Examination</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error || "The requested test was not found."}</p>
                    <button
                        onClick={() => router.push(safeReturnPath)}
                        className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1448d8] hover:bg-[#0f37a8] text-white font-semibold text-sm transition-colors cursor-pointer"
                    >
                        {backLabel}
                    </button>
                </div>
            </div>
        )
    }

    const testTitle = test.title
    const candidateName = session?.user?.name || "Student"
    const declarationQuery = new URLSearchParams()
    declarationQuery.set("testId", test.id)
    if (safeReturnPath !== `/test-series/${seriesId}`) {
        declarationQuery.set("returnPath", safeReturnPath)
    }
    const declarationHref = `/test-series/${seriesId}/declaration?${declarationQuery.toString()}`

    return (
        <div className="h-[100dvh] w-full max-w-full flex flex-col bg-slate-50 dark:bg-gray-950 overflow-hidden font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 min-h-[56px] shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                    <BrandLogo size="sm" showWordmark={true} />
                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block shrink-0" />
                    <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate block max-w-[200px] sm:max-w-md">
                            {testTitle}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
                        <Clock className="h-3.5 w-3.5 text-[#1448d8]" />
                        <span>{test.durationMinutes} Mins</span>
                        <span>•</span>
                        <span>{test.totalQuestions} Questions</span>
                    </div>

                    <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-full bg-[#1448d8]/10 text-[#1448d8] dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            <User className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 hidden xs:inline max-w-[100px] truncate">
                            {candidateName}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-4xl w-full mx-auto space-y-6 custom-scrollbar">
                {/* Title Banner */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#1448d8] dark:text-blue-400">
                                Computer-Based Assessment
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
                                General Assessment Guidelines
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="bg-blue-50 dark:bg-blue-950/50 text-[#1448d8] dark:text-blue-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border border-blue-200/60 dark:border-blue-900/40">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{test.durationMinutes} Minutes</span>
                            </div>
                            <div className="bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                <span>{test.totalQuestions} Questions</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed">
                        Please review these standardized operational guidelines carefully before proceeding to the candidate declaration. Ensure your device has an active internet connection and that you are prepared to complete the assessment within the allotted duration.
                    </p>
                </div>

                {/* Section 1: Timer and Auto-Submission */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Clock className="h-4.5 w-4.5 text-[#1448d8]" />
                        <span>1. Countdown Timer &amp; Automatic Submission</span>
                    </h2>
                    <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside">
                        <li>The assessment timer runs synchronously from the server. The remaining duration is continuously displayed in the top bar.</li>
                        <li>When the timer expires, your test is automatically saved and submitted. You do not need to manually finalize before the clock reaches zero.</li>
                        <li>Every response selection is saved in real time to the cloud so that unexpected device interruptions do not result in data loss.</li>
                    </ul>
                </div>

                {/* Section 2: Question Palette & Status Legend */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <FileText className="h-4.5 w-4.5 text-[#1448d8]" />
                        <span>2. Question Palette &amp; State Legend</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
                        The Question Palette on your examination workspace visualizes your current progress across each question using distinctive state indicators:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">Answered</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">Response is recorded and counted for evaluation.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                            <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                <AlertCircle className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">Unanswered</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">Question visited but no answer was chosen.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                            <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                <Bookmark className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">Marked for Review</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">Flagged to revisit later; evaluated if an answer is selected.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-800">
                            <span className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs flex items-center justify-center shrink-0">
                                <EyeOff className="h-4 w-4" />
                            </span>
                            <div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white block">Not Visited</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">You have not viewed this question yet.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Answering Workflow */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Save className="h-4.5 w-4.5 text-[#1448d8]" />
                        <span>3. Workflow &amp; Response Navigation</span>
                    </h2>
                    <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed list-disc list-inside">
                        <li><strong>Selecting an Answer:</strong> Click directly on your intended option. To change your response, click another option.</li>
                        <li><strong>Clearing a Selection:</strong> Use the &quot;Clear Response&quot; action if you wish to unselect your answer entirely.</li>
                        <li><strong>Confirming Answers:</strong> Click &quot;Save &amp; Next&quot; to lock your response and proceed sequentially.</li>
                        <li><strong>Reviewing Questions:</strong> Use &quot;Mark for Review &amp; Next&quot; to flag doubtful questions while maintaining your progress.</li>
                    </ul>
                </div>
            </main>

            {/* Bottom Bar */}
            <footer
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 shadow-lg"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
                <button
                    onClick={() => router.push(safeReturnPath)}
                    className="min-h-[44px] px-3.5 py-2 flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-colors cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{safeReturnPath.includes("/pyqs") ? "Back to Papers" : "Back to Test Series"}</span>
                </button>

                <Link
                    href={declarationHref}
                    data-testid="cbt-instructions-next-btn"
                    className="min-h-[44px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all flex items-center justify-center gap-2 bg-[#1448d8] hover:bg-[#0f37a8] shadow-md shadow-blue-600/20 active:scale-98"
                >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </footer>
        </div>
    )
}

export default function InstructionsClient() {
    return (
        <Suspense
            fallback={
                <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white dark:bg-gray-950">
                    <div className="text-center space-y-3">
                        <div className="w-10 h-10 border-4 border-[#1448d8] border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading examination instructions...</p>
                    </div>
                </div>
            }
        >
            <InstructionsContent />
        </Suspense>
    )
}
