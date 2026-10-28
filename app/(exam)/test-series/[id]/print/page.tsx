"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Printer, ArrowLeft, Check, FileText } from "lucide-react"

const PRINT_QUESTIONS = [
    {
        no: 1,
        textEn: "If Nina celebrated her birthday on Tuesday, January 15, 1985, then after how many years will she celebrate her birthday on the same day again?",
        textHi: "यदि नीना ने मंगलवार, 15 जनवरी, 1985 को अपना जन्मदिन मनाया, तो कितने वर्षों के बाद वह फिर से उसी दिन अपना जन्मदिन मनाएगी?",
        optsEn: ["5 years", "7 years", "6 years", "14 years"],
        optsHi: ["5 वर्ष", "7 वर्ष", "6 वर्ष", "14 वर्ष"],
        ans: "C",
        exp: "Total odd days from 1985 to 1990 = 1+1+1+2+1+1 = 7 days = 0 odd days. Hence day repeats after 6 years."
    },
    {
        no: 2,
        textEn: "Which of the following rivers flows through the Deccan Plateau?",
        textHi: "निम्नलिखित में से कौन सी नदी दक्कन के पठार से होकर बहती है?",
        optsEn: ["Ganga", "Godavari", "Yamuna", "Brahmaputra"],
        optsHi: ["गंगा", "गोदावरी", "यमुना", "ब्रह्मपुत्र"],
        ans: "B",
        exp: "The Godavari is India's second longest river after the Ganga and drains the Deccan Plateau."
    },
    {
        no: 3,
        textEn: "Who was the first President of India?",
        textHi: "भारत के प्रथम राष्ट्रपति कौन थे?",
        optsEn: ["Jawaharlal Nehru", "Sardar Patel", "Dr. Rajendra Prasad", "Dr. B.R. Ambedkar"],
        optsHi: ["जवाहरलाल नेहरू", "सरदार पटेल", "डॉ. राजेंद्र प्रसाद", "डॉ. बी.आर. अंबेडकर"],
        ans: "C",
        exp: "Dr. Rajendra Prasad was the first President of India, serving from 1950 to 1962."
    },
    {
        no: 4,
        textEn: "The Preamble of the Indian Constitution was amended by which Constitutional Amendment?",
        textHi: "भारतीय संविधान की प्रस्तावना में किस संविधान संशोधन द्वारा संशोधन किया गया था?",
        optsEn: ["42nd Amendment", "44th Amendment", "52nd Amendment", "86th Amendment"],
        optsHi: ["42वां संशोधन", "44वां संशोधन", "52वां संशोधन", "86वां संशोधन"],
        ans: "A",
        exp: "The 42nd Amendment Act of 1976 added the words 'Socialist', 'Secular', and 'Integrity'."
    },
    {
        no: 5,
        textEn: "Which gas is most abundant in the Earth's atmosphere?",
        textHi: "पृथ्वी के वायुमंडल में कौन सी गैस सबसे प्रचुर मात्रा में पाई जाती है?",
        optsEn: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
        optsHi: ["ऑक्सीजन", "कार्बन डाइऑक्साइड", "नाइट्रोजन", "आर्गन"],
        ans: "C",
        exp: "Nitrogen makes up approximately 78% of Earth's atmosphere."
    },
    {
        no: 6,
        textEn: "The capital of Bihar is:",
        textHi: "बिहार की राजधानी क्या है?",
        optsEn: ["Ranchi", "Gaya", "Muzaffarpur", "Patna"],
        optsHi: ["राँची", "गया", "मुजफ्फरपुर", "पटना"],
        ans: "D",
        exp: "Patna (ancient Pataliputra) is the capital and largest city of Bihar."
    }
]

export default function PrintPaperPage() {
    const params = useParams()
    const router = useRouter()
    const [includeAnswers, setIncludeAnswers] = useState(true)

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 print:bg-white print:text-black">
            {/* Screen Controls Header (Hidden in Print) */}
            <div className="print:hidden bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-gray-900">Official Question Paper Print View</h1>
                        <p className="text-xs text-gray-500">72nd BPSC CCE Prelims Examination • Printable PDF</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <label className="min-h-[44px] flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                        <input
                            type="checkbox"
                            checked={includeAnswers}
                            onChange={(e) => setIncludeAnswers(e.target.checked)}
                            className="rounded border-gray-300 h-4 w-4"
                        />
                        <span>Include Answer Key &amp; Explanations at end</span>
                    </label>

                    <button
                        onClick={handlePrint}
                        className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-md hover:bg-black transition-colors"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Print / Save as PDF</span>
                    </button>
                </div>
            </div>

            {/* Printable Paper Canvas (A4 format) */}
            <div className="max-w-[850px] mx-auto my-4 sm:my-8 print:my-0 p-4 sm:p-12 bg-white print:p-0 shadow-lg print:shadow-none border border-gray-200 print:border-none">
                {/* Header Strip */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">aspirantbook Online CBT Examination</h2>
                    <h1 className="text-xl font-black uppercase tracking-wide mt-1">72nd BPSC Combined Competitive Examination 2026</h1>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">Preliminary Mock Examination • Paper 1 (General Studies)</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-b border-gray-300 py-2 mt-4 text-xs font-semibold text-gray-800">
                        <div>Time Allowed: <strong>2 Hours</strong></div>
                        <div>Total Questions: <strong>150</strong></div>
                        <div>Maximum Marks: <strong>150</strong></div>
                        <div>Negative Marking: <strong>1/3rd (-0.33)</strong></div>
                    </div>
                </div>

                {/* Candidate Instructions */}
                <div className="p-4 border border-black mb-8 text-xs leading-relaxed space-y-1">
                    <p className="font-bold uppercase tracking-wider underline">Important Candidate Instructions:</p>
                    <p>1. This question paper booklet contains multiple-choice questions in bilingual format (English and Hindi).</p>
                    <p>2. Each question is followed by four options (A, B, C, D). Darken only ONE bubble corresponding to your answer on the OMR sheet.</p>
                    <p>3. One (1.0) mark is awarded for every correct answer, and 0.33 marks will be deducted for every incorrect response.</p>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                    {PRINT_QUESTIONS.map((q) => (
                        <div key={q.no} className="pb-5 border-b border-gray-200 print:border-gray-300 page-break-inside-avoid">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-sm">Q{q.no}.</span>
                                <div className="flex-1 space-y-2">
                                    {/* English question */}
                                    <p className="text-sm font-semibold text-gray-900 leading-snug">{q.textEn}</p>
                                    {/* Hindi question */}
                                    <p className="text-xs text-gray-700 leading-snug font-serif">{q.textHi}</p>

                                    {/* Options grid */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                                        {q.optsEn.map((opt, oi) => (
                                            <div key={oi} className="flex items-start gap-1.5">
                                                <span className="font-bold">({["A", "B", "C", "D"][oi]})</span>
                                                <span>{opt} <span className="text-gray-500 font-serif">/ {q.optsHi[oi]}</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Answer Key & Explanations Section */}
                {includeAnswers && (
                    <div className="mt-12 pt-8 border-t-2 border-black page-break-before-always">
                        <div className="text-center mb-6">
                            <h2 className="text-base font-black uppercase tracking-wider">Official Answer Key &amp; Explanations</h2>
                            <p className="text-xs text-gray-600">72nd BPSC CCE 2026 Preliminary Full Mock Test</p>
                        </div>

                        {/* OMR Grid Summary */}
                        <div className="grid grid-cols-6 gap-2 mb-8 text-center text-xs">
                            {PRINT_QUESTIONS.map((q) => (
                                <div key={q.no} className="border border-black p-2 rounded">
                                    <span className="text-gray-500 font-semibold block text-[10px]">Q{q.no}</span>
                                    <span className="text-base font-black text-black">({q.ans})</span>
                                </div>
                            ))}
                        </div>

                        {/* Detailed Explanations */}
                        <div className="space-y-4 text-xs">
                            <h3 className="font-bold uppercase tracking-wider text-gray-800 underline">Detailed Explanations:</h3>
                            {PRINT_QUESTIONS.map((q) => (
                                <div key={q.no} className="p-3 bg-gray-50 print:bg-white border border-gray-200 print:border-gray-300 rounded">
                                    <p className="font-bold text-gray-900">Q{q.no}. Answer: ({q.ans})</p>
                                    <p className="text-gray-700 mt-1 leading-relaxed">{q.exp}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
