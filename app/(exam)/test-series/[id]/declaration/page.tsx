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
    Globe,
    ShieldCheck
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
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-[#1448d8] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading examination details...</p>
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
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Unable to Load Test</h2>
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

    const instructionsQuery = new URLSearchParams()
    instructionsQuery.set("testId", test.id)
    if (safeReturnPath !== defaultReturnPath) {
        instructionsQuery.set("returnPath", safeReturnPath)
    }
    const instructionsHref = `/test-series/${seriesId}/instructions?${instructionsQuery.toString()}`

    const handleStartAttempt = async () => {
        if (!agreed || starting) return
        setStarting(true)
        setStartError(null)

        try {
            const res = await fetch(`/api/exam/${encodeURIComponent(test.id)}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lang: selectedLang }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (res.status === 401) {
                    setStartError("Session expired. Please sign in again to start the assessment.")
                    setStarting(false)
                    return
                }
                throw new Error(data.error || "Failed to initialize test attempt.")
            }

            const attemptQuery = new URLSearchParams()
            attemptQuery.set("testId", test.id)
            attemptQuery.set("lang", selectedLang)
            if (data.attemptId) {
                attemptQuery.set("attemptId", data.attemptId)
            }
            if (safeReturnPath !== defaultReturnPath) {
                attemptQuery.set("returnPath", safeReturnPath)
            }

            router.push(`/test-series/${seriesId}/attempt?${attemptQuery.toString()}`)
        } catch (err: any) {
            setStartError(err.message || "An unexpected error occurred while starting the test.")
            setStarting(false)
        }
    }

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
                        <span>{test.totalMarks} Marks</span>
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
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#1448d8] dark:text-blue-400">
                        Step 2 of 2: Candidate Readiness
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5 mb-2">
                        Language Selection &amp; Integrity Declaration
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Choose your primary question delivery language and review the candidate code of conduct before launching the test console.
                    </p>
                </div>

                {/* Language Selection Card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-4.5 w-4.5 text-[#1448d8]" />
                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                            Choose Default Question Language
                        </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Questions will be presented in your chosen language by default. You can still switch individual question languages during the test where bilingual translations are available.
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSelectedLang("Hindi")}
                            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border cursor-pointer ${
                                selectedLang === "Hindi"
                                    ? "bg-[#1448d8] text-white border-[#1448d8] shadow-sm"
                                    : "bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                        >
                            <span>Hindi (हिंदी)</span>
                            {selectedLang === "Hindi" && <Check className="h-4 w-4" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedLang("English")}
                            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border cursor-pointer ${
                                selectedLang === "English"
                                    ? "bg-[#1448d8] text-white border-[#1448d8] shadow-sm"
                                    : "bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                        >
                            <span>English</span>
                            {selectedLang === "English" && <Check className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Candidate Declaration Card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                            Declaration
                        </h2>
                    </div>

                    <label className="flex items-start gap-3.5 cursor-pointer group select-none">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            data-testid="declaration-checkbox"
                            className="sr-only"
                            aria-label="I have read and understood the instructions"
                        />
                        <div
                            className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                agreed
                                    ? "border-[#1448d8] bg-[#1448d8] shadow-2xs"
                                    : "border-gray-300 dark:border-gray-700 group-hover:border-blue-500 bg-white dark:bg-gray-800"
                            }`}
                        >
                            {agreed && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                            I have read and understood the instructions and assessment guidelines. I confirm that all answers submitted during this session will be my own work, completed independently and without prohibited aids or unauthorized external assistance. I agree to abide by the assessment integrity regulations of aspirantBook.
                        </span>
                    </label>

                    {!agreed && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span>Please accept the candidate declaration to unlock the test console.</span>
                        </div>
                    )}

                    {startError && (
                        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
                            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                            <span>{startError}</span>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Bar */}
            <footer
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 shadow-lg"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
                <Link
                    href={instructionsHref}
                    className="min-h-[44px] px-3.5 py-2 flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back to Instructions</span>
                </Link>

                <button
                    onClick={handleStartAttempt}
                    disabled={!agreed || starting}
                    data-testid="cbt-start-attempt-btn"
                    className={`min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white transition-all ${
                        agreed && !starting
                            ? "bg-[#1448d8] hover:bg-[#0f37a8] shadow-md shadow-blue-600/25 cursor-pointer active:scale-98"
                            : "bg-gray-300 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-200/50 dark:border-gray-700/50"
                    }`}
                >
                    {starting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Starting Assessment...</span>
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
        <Suspense
            fallback={
                <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white dark:bg-gray-950">
                    <div className="w-10 h-10 border-4 border-[#1448d8] border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <DeclarationContent />
        </Suspense>
    )
}
