"use client"

// Presentational catalogue grid shared by the test-series listing. No hooks,
// no providers, no client-only APIs: this is exactly the markup the server
// renders for /test-series, which is why the SEO regression test can render it
// with react-dom/server and assert that every series title and the
// "View Test Series" call to action are in the served HTML.
import Link from "next/link"
import { CheckCheck, Globe, Plus } from "lucide-react"

export interface TestSeriesItem {
    id: string; slug?: string; title: string; category: string; description?: string
    goalId?: string; tags: string[]; highlights: string[]; totalTests: number
    freeTests: number; users: string; logoType: string; isFree: boolean; isPro: boolean
    languages: string; examName?: string
}

// Custom Exam Emblem SVGs matching official seals exactly
export function ExamLogo({ logoType }: { logoType: string }) {
    if (logoType === "upsc") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#FFFDF5" stroke="#1F2937" strokeWidth="2" />
                    {/* Ashoka Stambh Lion Capital Icon */}
                    <path d="M50 14 C44 14 40 18 40 23 C40 27 43 30 45 32 C41 33 37 37 37 42 C37 47 41 51 45 53 L45 61 L33 61 C31 61 30 63 30 65 L30 68 L70 68 L70 65 C70 63 69 61 67 61 L55 61 L55 53 C59 51 63 47 63 42 C63 37 59 33 55 32 C57 30 60 27 60 23 C60 18 56 14 50 14 Z" fill="#1F2937" />
                    <circle cx="50" cy="74" r="5" fill="none" stroke="#003B73" strokeWidth="2" />
                    <path d="M28 80 L72 80 L68 86 L32 86 Z" fill="#B45309" />
                    <text x="50" y="95" textAnchor="middle" fontSize="9" fontWeight="900" fill="#111827">UPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "bpsc") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#047857" strokeWidth="2.5" />
                    {/* Bodhi Tree & BPSC Emblem */}
                    <path d="M50 16 C38 23 34 36 41 48 C43 52 47 55 49 60 C51 55 55 52 57 48 C64 36 60 23 50 16 Z" fill="#047857" />
                    <circle cx="33" cy="38" r="4.5" fill="#D97706" />
                    <circle cx="67" cy="38" r="4.5" fill="#D97706" />
                    <rect x="47" y="60" width="6" height="15" fill="#78350F" />
                    <rect x="28" y="75" width="44" height="4.5" rx="2" fill="#047857" />
                    <text x="50" y="92" textAnchor="middle" fontSize="9" fontWeight="900" fill="#064E3B">BPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "uppcs") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#1E293B" strokeWidth="2.5" />
                    {/* UP Govt Bow-Arrow and Twin Fish */}
                    <path d="M28 42 Q50 26 72 42" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                    <line x1="50" y1="24" x2="50" y2="56" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M30 63 Q40 56 48 66 Q40 74 30 63 Z" fill="#2563EB" />
                    <path d="M70 63 Q60 56 52 66 Q60 74 70 63 Z" fill="#2563EB" />
                    <text x="50" y="91" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0F172A">UPPSC</text>
                </svg>
            </div>
        )
    }

    if (logoType === "ncert") {
        return (
            <div className="w-11 h-11 rounded-full bg-white border border-gray-300 dark:border-gray-700 flex items-center justify-center p-1 shadow-xs">
                <svg className="w-8 h-8" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#F8FAFC" stroke="#047857" strokeWidth="2" />
                    {/* AspirantBook academic emblem: open book */}
                    <path d="M24 40 L50 30 L76 40 L76 64 L50 54 L24 64 Z" fill="none" stroke="#047857" strokeWidth="2.5" strokeLinejoin="round" />
                    <line x1="50" y1="30" x2="50" y2="54" stroke="#047857" strokeWidth="2.5" />
                    <text x="50" y="89" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#064E3B">SCHOOL</text>
                </svg>
            </div>
        )
    }

    if (logoType === "sbi") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#005B96] flex items-center justify-center p-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center relative">
                    <span className="text-[11px] font-black text-white tracking-tighter">SBI</span>
                    <div className="absolute -bottom-1.5 w-1.5 h-3 bg-[#005B96]" />
                </div>
            </div>
        )
    }

    if (logoType === "ssc") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#C92A2A] border-2 border-[#FFE066] flex items-center justify-center p-1 shadow-xs">
                <div className="w-7 h-7 rounded-full bg-white flex flex-col items-center justify-center text-[#C92A2A]">
                    <span className="text-[9px] font-black leading-none">SSC</span>
                    <span className="text-[6px] font-bold text-amber-700 leading-none">★</span>
                </div>
            </div>
        )
    }

    if (logoType === "rrb") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#D9381E] border-2 border-white shadow-xs flex items-center justify-center p-1">
                <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center bg-white/10">
                    <span className="text-[8px] font-black text-white tracking-tight">RRB</span>
                </div>
            </div>
        )
    }

    if (logoType === "upsssc") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#1E293B] border border-gray-200 flex items-center justify-center shadow-xs">
                <div className="w-7 h-7 rounded-full border border-gray-400 flex flex-col items-center justify-center text-white">
                    <span className="text-[7px] font-bold">UP</span>
                    <span className="text-[6px] font-semibold text-emerald-400">PET</span>
                </div>
            </div>
        )
    }

    if (logoType === "ibps") {
        return (
            <div className="w-11 h-11 rounded-full bg-[#0284C7] border border-sky-300 flex items-center justify-center text-white shadow-xs">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black tracking-tight">IBPS</span>
                    <span className="text-[6px] text-sky-200 font-medium -mt-0.5">PO/CLK</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#1448d8] to-[#00A8FF] text-white flex items-center justify-center shadow-xs font-black text-xs">
            TEST
        </div>
    )
}

/**
 * One catalogue card. Rendered on the server for every published series with
 * at least one published test, so crawlers get the title and the
 * "View Test Series" link without running JavaScript.
 */
export function TestSeriesCard({
    item,
    isSaved,
    onToggleSave,
}: {
    item: TestSeriesItem
    isSaved: boolean
    onToggleSave?: (id: string, event: React.MouseEvent) => void
}) {
    return (
        <div
            className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#071d33] shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between group"
        >
            {/* Card Top Header with Soft Lavender / Purple Gradient in Light Mode, Rich Dark Slate in Dark Mode */}
            <div className="bg-gradient-to-b from-[#F3ECFF] via-[#F8F5FF] to-white dark:from-[#0a1f38] dark:via-[#0c2442] dark:to-[#071d33] p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800/80">
                {/* Top Row: Exam Logo + User Count Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 shadow-2xs border border-purple-100 dark:border-purple-900/40 p-0.5 flex items-center justify-center flex-shrink-0">
                        <ExamLogo logoType={item.logoType} />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 min-h-[42px] group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                    {item.title}
                </h3>

                {/* Total Tests | Free Tests Row (gap 8 to 12px from title) */}
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span>{item.totalTests} {item.totalTests === 1 ? "Total Test" : "Total Tests"}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                        {item.freeTests} {item.freeTests === 1 ? "Free Test" : "Free Tests"}
                    </span>
                </div>

                {/* Language Indicator */}
                <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-400 font-semibold mt-2">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.languages}</span>
                </div>
            </div>

            {/* Card Body: Highlights List (show first 3 bullets, then +N more) */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {item.highlights.slice(0, 3).map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                            <span className="text-gray-400 font-bold leading-none mt-1">•</span>
                            <span className="line-clamp-1">{point}</span>
                        </li>
                    ))}
                    {item.highlights.length > 3 && (
                        <li className="text-[11px] font-bold text-sky-700 dark:text-sky-400 pl-3">
                            +{item.highlights.length - 3} more
                        </li>
                    )}
                </ul>

                {/* Bottom Action Buttons: Save Button (left-aligned to prevent floating AI button overlap) + View Test Series (gap 12 to 16px) */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                    <button
                        onClick={(e) => onToggleSave?.(item.id, e)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 min-h-[44px] min-w-[44px] ${
                            isSaved
                                ? "border-emerald-700 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "border-sky-700 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20"
                        }`}
                        title={isSaved ? "Saved to your list" : "Save Test Series"}
                        aria-label="Add to saved test series"
                    >
                        {isSaved ? (
                            <CheckCheck className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                        )}
                    </button>

                    <Link
                        href={`/test-series/${item.id}`}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs sm:text-sm text-center shadow-xs transition-colors cursor-pointer flex items-center justify-center min-h-[44px]"
                    >
                        View Test Series
                    </Link>
                </div>
            </div>
        </div>
    )
}

/** Responsive card grid for the public catalogue. */
export function TestSeriesGrid({
    series,
    savedSeries,
    onToggleSave,
}: {
    series: TestSeriesItem[]
    savedSeries: string[]
    onToggleSave?: (id: string, event: React.MouseEvent) => void
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 sm:gap-6">
            {series.map((item) => (
                <TestSeriesCard
                    key={item.id}
                    item={item}
                    isSaved={savedSeries.includes(item.id)}
                    onToggleSave={onToggleSave}
                />
            ))}
        </div>
    )
}
