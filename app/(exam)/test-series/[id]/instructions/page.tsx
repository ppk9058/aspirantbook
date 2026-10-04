"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ArrowLeft, User, AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"

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
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading instructions...</p>
                </div>
            </div>
        )
    }

    if (error || !test) {
        return (
            <div className="h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-white p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Unable to Load Test</h2>
                    <p className="text-sm text-gray-600">{error || "The requested test was not found."}</p>
                    <button
                        onClick={() => router.push(`/test-series/${seriesId}`)}
                        className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                    >
                        Back to Test Series
                    </button>
                </div>
            </div>
        )
    }

    const testTitle = test.title
    const candidateName = session?.user?.name || "Student"
    const declarationHref = `/test-series/${seriesId}/declaration?testId=${encodeURIComponent(test.id)}`

    return (
        <div className="h-[100dvh] w-full max-w-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: "sans-serif" }}>
            {/* ── TOP BAR ─────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200 bg-white shrink-0 min-h-[52px]">
                {/* Logo + Title */}
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
                {/* Candidate */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 pl-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-white/60" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate max-w-[70px] sm:max-w-none">{candidateName}</span>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-5 max-w-4xl w-full" style={{ scrollbarWidth: "thin" }}>

                <h2 className="font-bold text-gray-900 text-base mb-4">General Instructions :</h2>

                <div className="text-sm text-gray-800 space-y-3 leading-relaxed">
                    <p>1. The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You need not terminate the examination or submit your paper.</p>

                    <p>2. The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</p>

                    <div className="ml-4 space-y-2 my-3">
                        {[
                            { color: "#00C17B", label: "Answered", desc: "You have answered the question." },
                            { color: "#9333EA", label: "Marked", desc: "You have NOT answered the question, but have marked the question for review." },
                            { color: "#e5e7eb", label: "Not Visited", textColor: "#374151", desc: "You have not visited the question yet.", border: "1px solid #9ca3af" },
                            { color: "#9333EA", label: "Marked and answered", desc: "The question(s) \"Answered and Marked for Review\" will be considered for evaluation." },
                            { color: "#EF4444", label: "Not Answered", desc: "You have visited the question but have not answered it." },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ background: item.color, color: item.textColor ?? "white", border: item.border ?? "none" }}
                                >
                                    {i === 2 ? "1" : ""}
                                </div>
                                <p><strong>{item.label}:</strong> {item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <p>3. Click on the <strong>Mark for Review &amp; Next</strong> to save your answer for the current question and also mark it for review, and then go to the next question.</p>

                    <p>Note that your answer for the current question will not be saved, if you navigate to another question directly by clicking on a question number without saving the answer to the previous question.</p>

                    <p className="text-teal-600">You can view all the questions by clicking on the <strong className="text-gray-800">Question Paper</strong> button. <span className="text-red-500">This feature is provided, so that if you want you can just see the entire question paper at a glance.</span></p>

                    <h3 className="font-bold text-gray-900 mt-4">Answering a Question :</h3>

                    <p>4. Procedure for answering a multiple choice (MCQ) type question:</p>
                    <div className="ml-6 space-y-1">
                        <p>i. Choose one answer from the 4 options (A,B,C,D) given below the question, click on the bubble placed before the chosen option.</p>
                        <p>ii. To deselect your chosen answer, click on the bubble of the chosen option again or click on the <strong>Clear Response</strong> button</p>
                        <p>iii. To change your chosen answer, click on the bubble of another option.</p>
                        <p>iv. To save your answer, you MUST click on the <strong>Save &amp; Next</strong></p>
                    </div>

                    <p>5. Procedure for answering a numerical answer type question :</p>
                    <div className="ml-6 space-y-1">
                        <p>i. To enter a number as your answer, use the virtual numerical keypad.</p>
                        <p>ii. A fraction (e.g. -0.3 or -.3) can be entered as an answer with or without &quot;0&quot; before the decimal point. <span className="text-red-500">As many as four decimal points, e.g. 12.5435 or 0.003 or -932.6711 or 12.82 can be entered.</span></p>
                        <p>iii. To clear your answer, click on the <strong>Clear Response</strong> button</p>
                        <p>iv. To save your answer, you MUST click on the <strong>Save &amp; Next</strong></p>
                    </div>

                    <p>6. To mark a question for review, click on the <strong>Mark for Review &amp; Next</strong> button. If an answer is selected (for MCQ/MCAQ) entered (for numerical answer type) for a question that is <strong>Marked for Review</strong>, that answer will be considered in the evaluation unless the status is modified by the candidate.</p>

                    <p>7. To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</p>

                    <p>8. Note that ONLY Questions for which answers are <strong>saved</strong> or <strong>marked for review after answering</strong> will be considered for evaluation.</p>

                    <p>9. Sections in this question paper are displayed on the top bar of the screen. Questions in a Section can be viewed by clicking on the name of that Section. The Section you are currently viewing will be highlighted.</p>

                    <p>10. After clicking the <strong>Save &amp; Next</strong> button for the last question in a Section, you will automatically be taken to the first question of the next Section in sequence.</p>

                    <p>11. You can move the mouse cursor over the name of a Section to view the answering status for that Section.</p>
                </div>
            </div>

            {/* ── BOTTOM BAR ──────────────────────────────────────── */}
            <footer
                className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-t border-gray-200 bg-gray-50 shrink-0"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
                <button
                    onClick={() => router.push(`/test-series/${seriesId}`)}
                    className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-semibold transition-colors cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Go to Tests</span>
                </button>
                <Link
                    href={declarationHref}
                    className="min-h-[44px] px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: "#0ea5e9" }}
                >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </footer>
        </div>
    )
}

export default function InstructionsPage() {
    return (
        <Suspense fallback={
            <div className="h-[100dvh] w-full max-w-full flex items-center justify-center bg-white">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading instructions...</p>
                </div>
            </div>
        }>
            <InstructionsContent />
        </Suspense>
    )
}
