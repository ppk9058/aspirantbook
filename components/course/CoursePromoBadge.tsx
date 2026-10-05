import React from "react"

export interface CoursePromoBadgeProps {
    badgeLabel: string
    badgeShape?: "STARBURST" | "RIBBON" | "CIRCLE" | "PILL" | string
    badgeColor?: string
    discountType?: "PERCENT" | "FLAT" | string
    discountValue?: number
    discountText?: string // e.g. "30% off" or "₹500 off"
    className?: string
}

export function CoursePromoBadge({
    badgeLabel,
    badgeShape = "PILL",
    badgeColor = "#10B981",
    discountType = "PERCENT",
    discountValue = 0,
    discountText,
    className = "",
}: CoursePromoBadgeProps) {
    // Determine dynamic discount text if not explicitly provided
    const displayText = discountText || (
        discountType === "FLAT"
            ? `${badgeLabel} ₹${discountValue} off`
            : `${badgeLabel} ${discountValue}% off`
    )

    const shape = (badgeShape || "PILL").toUpperCase()

    // 1. STARBURST SHAPE
    if (shape === "STARBURST") {
        return (
            <div
                className={`relative inline-flex items-center justify-center filter drop-shadow-md select-none max-w-[95%] ${className}`}
                style={{ zIndex: 10 }}
            >
                <svg
                    viewBox="0 0 100 100"
                    className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 transform -rotate-12"
                    fill={badgeColor}
                >
                    <polygon points="50,0 63,26 91,15 80,43 100,60 74,70 75,100 48,84 25,98 28,70 0,58 22,43 11,15 39,25" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center leading-tight">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-white drop-shadow truncate max-w-[70px]">
                        {badgeLabel}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black text-amber-200 drop-shadow">
                        {discountType === "FLAT" ? `₹${discountValue} off` : `${discountValue}% off`}
                    </span>
                </div>
            </div>
        )
    }

    // 2. RIBBON SHAPE
    if (shape === "RIBBON") {
        return (
            <div
                className={`relative inline-flex items-center select-none shadow-md overflow-hidden ${className}`}
                style={{ backgroundColor: badgeColor, zIndex: 10 }}
            >
                <div className="px-2.5 py-1 text-white font-extrabold text-[10px] sm:text-xs tracking-wider flex items-center gap-1.5 uppercase truncate max-w-[200px]">
                    <span className="truncate">{badgeLabel}</span>
                    <span className="opacity-75">•</span>
                    <span className="text-amber-200 font-black shrink-0">
                        {discountType === "FLAT" ? `₹${discountValue} off` : `${discountValue}% off`}
                    </span>
                </div>
                {/* Ribbon angled tail */}
                <div
                    className="w-2.5 h-full absolute right-0 top-0 border-y-[12px] border-r-[6px] border-y-transparent border-r-white/20"
                />
            </div>
        )
    }

    // 3. CIRCLE SHAPE
    if (shape === "CIRCLE") {
        return (
            <div
                className={`inline-flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white shadow-lg p-1 text-center select-none border-2 border-white/40 shrink-0 ${className}`}
                style={{ backgroundColor: badgeColor, zIndex: 10 }}
            >
                <span className="text-[9px] sm:text-[10px] font-black uppercase leading-tight truncate max-w-[50px]">
                    {badgeLabel}
                </span>
                <span className="text-[10px] sm:text-xs font-black text-amber-200 leading-tight">
                    {discountType === "FLAT" ? `₹${discountValue} off` : `${discountValue}% off`}
                </span>
            </div>
        )
    }

    // 4. PILL SHAPE (Default)
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white shadow-md select-none border border-white/30 backdrop-blur-sm max-w-[90%] ${className}`}
            style={{ backgroundColor: badgeColor, zIndex: 10 }}
        >
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wide truncate max-w-[120px]">
                {badgeLabel}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/60 shrink-0" />
            <span className="text-[10px] sm:text-xs font-black text-amber-200 shrink-0">
                {discountType === "FLAT" ? `₹${discountValue} off` : `${discountValue}% off`}
            </span>
        </div>
    )
}
