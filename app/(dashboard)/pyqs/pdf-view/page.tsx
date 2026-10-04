"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
    ArrowLeft,
    Download,
    Printer,
    Share2,
    CheckCircle2,
    FileText,
    ZoomIn,
    ZoomOut,
    Play,
    Zap,
    BookOpen,
    HelpCircle,
    ChevronRight,
    Award
} from "lucide-react"

export default function PYQPDFViewerPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const examId = searchParams.get("examId") || "bpsc"
    const paperId = searchParams.get("paperId") || "bpsc-71-mains-gs1"
    const phone = searchParams.get("phone") || ""

    const [zoom, setZoom] = useState(100)
    const [downloading, setDownloading] = useState(false)
    const [downloadSuccess, setDownloadSuccess] = useState(false)

    // Paper metadata
    const paperTitle = paperId.includes("essay")
        ? "71st BPSC Mains Exam (Essay) Official Paper"
        : paperId.includes("hindi")
        ? "71st BPSC Mains Exam (General Hindi) Official Paper"
        : paperId.includes("gs1")
        ? "71st BPSC Mains Exam (General Studies - I) Official Paper"
        : paperId.includes("70")
        ? "70th BPSC Exam Official Preliminary Paper (Held on 4th Jan 2025)"
        : "Official Examination Question Paper & Model Answers"

    const handleDownload = () => {
        setDownloading(true)
        setTimeout(() => {
            setDownloading(false)
            setDownloadSuccess(true)
            // Trigger actual simulated blob download
            const blob = new Blob([`%PDF-1.4\nOfficial Question Paper: ${paperTitle}\nVerified Phone: ${phone}\naspirantbook Official Archives 2026\n`], { type: "application/pdf" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${paperId}-official-question-paper.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            setTimeout(() => setDownloadSuccess(false), 3000)
        }, 1000)
    }

    return (
        <div className="space-y-6 pb-24 text-gray-900 dark:text-gray-100 font-sans">
            {/* Top Back & Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Back to PYQs"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                Official PDF Document
                            </span>
                            {phone && (
                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Phone Verified: +91 {phone}
                                </span>
                            )}
                        </div>
                        <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5">
                            {paperTitle}
                        </h1>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={() => setZoom((prev) => Math.max(75, prev - 15))}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-gray-500 w-10 text-center">{zoom}%</span>
                    <button
                        onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => window.print()}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold transition-colors"
                        title="Print Paper"
                    >
                        <Printer className="h-4 w-4" />
                    </button>

                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                    >
                        <Download className="h-4 w-4" />
                        <span>{downloading ? "Downloading..." : downloadSuccess ? "Downloaded!" : "Download PDF Now"}</span>
                    </button>

                    <Link
                        href={`/test-series/bpsc-72nd-2026/attempt`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                    >
                        <Zap className="h-4 w-4 fill-current" />
                        <span>Attempt in CBT Mode</span>
                    </Link>
                </div>
            </div>

            {/* Document Viewer Frame with Zoom */}
            <div className="bg-gray-100 dark:bg-gray-900 rounded-3xl p-4 sm:p-8 flex justify-center overflow-x-auto">
                <div
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                    className="w-full max-w-4xl bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-300 p-8 sm:p-12 space-y-8 transition-transform duration-200"
                >
                    {/* Official Document Header */}
                    <div className="text-center pb-6 border-b-2 border-gray-900 space-y-1">
                        <div className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-emerald-700 flex items-center justify-center p-2">
                            <span className="font-black text-xs text-emerald-800">OFFICIAL</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
                            BIHAR PUBLIC SERVICE COMMISSION
                        </h2>
                        <p className="text-xs uppercase tracking-wider font-bold text-gray-700">
                            Combined Competitive Examination • Official Question Booklet
                        </p>
                        <div className="flex items-center justify-between text-xs font-bold pt-4 text-gray-800">
                            <span>Time Allowed: 3 Hours</span>
                            <span>Maximum Marks: 300</span>
                        </div>
                    </div>

                    {/* Instructions Section */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                        <p className="font-bold text-gray-900">Important Candidate Instructions / परीक्षार्थियों के लिए निर्देश:</p>
                        <p>1. This question paper booklet contains official verified questions strictly conforming to the commission's archives.</p>
                        <p>2. Answer all questions within the prescribed word limit. Negative marking applies where specified.</p>
                        <p>3. Do not tear or remove any pages from the question booklet.</p>
                    </div>

                    {/* Question Sample Previews */}
                    <div className="space-y-6 text-sm">
                        <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                            <div className="flex items-start justify-between">
                                <span className="font-black text-gray-900">Question 1 (38 Marks)</span>
                                <span className="text-xs text-gray-500 font-semibold">General Studies Paper I</span>
                            </div>
                            <p className="text-gray-900 font-semibold leading-relaxed">
                                Trace the origin, evolution, and main features of Patna Kalam Painting. How was it influenced by the Mughal Court and British patronage?
                            </p>
                            <p className="text-gray-700 text-xs italic">
                                पटना कलम चित्रकला के उद्भव, विकास एवं मुख्य विशेषताओं का विवरण दें। यह मुगल दरबार और ब्रिटिश संरक्षण से किस प्रकार प्रभावित थी?
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                            <div className="flex items-start justify-between">
                                <span className="font-black text-gray-900">Question 2 (38 Marks)</span>
                                <span className="text-xs text-gray-500 font-semibold">General Studies Paper I</span>
                            </div>
                            <p className="text-gray-900 font-semibold leading-relaxed">
                                Critically analyze the role of Bihar in the Quit India Movement of 1942, with special focus on the underground activities of Jayaprakash Narayan and the Azad Dasta.
                            </p>
                            <p className="text-gray-700 text-xs italic">
                                1942 के भारत छोड़ो आंदोलन में बिहार की भूमिका का आलोचनात्मक विश्लेषण करें, विशेषकर जयप्रकाश नारायण और आज़ाद दस्ता की भूमिगत गतिविधियों के संदर्भ में।
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                            <div className="flex items-start justify-between">
                                <span className="font-black text-gray-900">Question 3 (38 Marks)</span>
                                <span className="text-xs text-gray-500 font-semibold">Indian Polity & Economy</span>
                            </div>
                            <p className="text-gray-900 font-semibold leading-relaxed">
                                Discuss the federal structure of India in the light of the 15th Finance Commission recommendations. How has the devolution formula impacted state finances in Bihar?
                            </p>
                            <p className="text-gray-700 text-xs italic">
                                15वें वित्त आयोग की सिफारिशों के आलोक में भारत के संघीय ढांचे की चर्चा करें। कर हस्तांतरण सूत्र ने बिहार के राज्य वित्त को किस प्रकार प्रभावित किया है?
                            </p>
                        </div>
                    </div>

                    {/* Document Footer */}
                    <div className="pt-8 border-t border-gray-200 text-center text-xs text-gray-500 space-y-2">
                        <p>© Official Document Archives • aspirantbook Educational Services</p>
                        <p>Downloaded under authorized educational access for verified mobile student: +91 {phone || "Verified"}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
