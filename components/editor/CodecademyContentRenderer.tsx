"use client"

import React, { useState } from "react"
import { inlineFmt } from "@/lib/rosera/inline"
import "./rosera.css"
import {
    Info,
    Lightbulb,
    AlertCircle,
    Sparkles,
    Check,
    Copy,
    FileText,
    Video,
    Headphones,
    BarChart2,
    PieChart,
    TrendingUp,
    Layers,
    CheckCircle2,
    ArrowRight
} from "lucide-react"

function parseMediaConfig(raw: string) {
    const lines = raw.trim().split("\n")
    const result: { url: string; title?: string; caption?: string; artist?: string } = { url: "" }
    for (const line of lines) {
        const t = line.trim()
        if (t.startsWith("url:")) result.url = t.replace(/^url:\s*/i, "").trim()
        else if (t.startsWith("title:")) result.title = t.replace(/^title:\s*/i, "").trim()
        else if (t.startsWith("caption:")) result.caption = t.replace(/^caption:\s*/i, "").trim()
        else if (t.startsWith("artist:")) result.artist = t.replace(/^artist:\s*/i, "").trim()
        else if (/^https?:\/\//i.test(t) && !result.url) result.url = t
    }
    return result
}

function VideoBlockItem({ content, blockKey }: { content: string; blockKey: number }) {
    const cfg = parseMediaConfig(content)
    let embedUrl = cfg.url
    let isDirectVideo = false

    const ytMatch = cfg.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/)
    if (ytMatch) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
    } else {
        const vimeoMatch = cfg.url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)
        if (vimeoMatch) {
            embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
        } else if (/\.(mp4|webm|ogg)($|\?)/i.test(cfg.url)) {
            isDirectVideo = true
        }
    }

    return (
        <div key={`video-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-[#0D1117] overflow-hidden shadow-[4px_4px_0px_0px_#10162F]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-gray-800 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#3A10E5] text-white ml-2">
                        VIDEO LESSON
                    </span>
                    <span className="font-bold text-gray-200 truncate max-w-md">{cfg.title || "Video Demonstration"}</span>
                </div>
            </div>
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                {isDirectVideo ? (
                    <video src={cfg.url} controls playsInline className="w-full h-full object-contain" />
                ) : (
                    <iframe
                        src={embedUrl}
                        title={cfg.title || "Embedded Video"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                    />
                )}
            </div>
            {cfg.caption && (
                <div className="px-4 py-2 bg-[#161B22] text-xs text-gray-400 border-t border-gray-800 font-medium">
                    {cfg.caption}
                </div>
            )}
        </div>
    )
}

function AudioBlockItem({ content, blockKey }: { content: string; blockKey: number }) {
    const cfg = parseMediaConfig(content)
    return (
        <div key={`audio-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-[#FFF5EB] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#10162F] space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#10162F]/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[#3A10E5] text-white flex items-center justify-center shadow-[2px_2px_0px_#10162F] border border-[#10162F]">
                        <Headphones className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase text-[#3A10E5] tracking-wider">
                            AUDIO WALKTHROUGH & PODCAST
                        </div>
                        <div className="text-sm font-extrabold text-[#10162F]">{cfg.title || "Audio Lesson Episode"}</div>
                    </div>
                </div>
                {cfg.artist && (
                    <span className="text-xs font-bold text-[#10162F] bg-white px-2.5 py-1 rounded-full border border-[#10162F]">
                        {cfg.artist}
                    </span>
                )}
            </div>
            <audio controls src={cfg.url} className="w-full rounded-lg" preload="metadata" />
        </div>
    )
}

function InfographicStatsItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    const items = lines.map((l) => {
        const parts = l.split("|").map((p) => p.trim())
        return {
            value: parts[0] || "",
            label: parts[1] || "",
            desc: parts[2] || "",
        }
    })

    return (
        <div key={`stat-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">Key Metrics & Infographic</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Fast Facts
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((it, idx) => (
                    <div key={idx} className="p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] space-y-1.5 hover:bg-[#FFF5EB] transition-colors">
                        <div className="text-2xl sm:text-3xl font-black text-[#3A10E5] tracking-tight">{it.value}</div>
                        <div className="text-xs font-black uppercase text-[#10162F]">{it.label}</div>
                        {it.desc && <div className="text-[11px] text-gray-600 font-medium leading-relaxed">{it.desc}</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}

function InfographicStepsItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    const steps = lines.map((l, i) => {
        const parts = l.split("|").map((p) => p.trim())
        return {
            step: parts[0] || `${i + 1}`,
            title: parts[1] || "",
            desc: parts[2] || "",
        }
    })

    return (
        <div key={`steps-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">Step-by-Step Roadmap</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Process
                </span>
            </div>
            <div className="space-y-3">
                {steps.map((st, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#10162F] bg-[#FFFDF9] hover:bg-[#FFF5EB] transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-[#10162F] text-[#FFD15C] font-black text-xs flex items-center justify-center flex-shrink-0 border border-[#10162F]">
                            {st.step}
                        </div>
                        <div className="space-y-0.5 flex-1">
                            <div className="text-sm font-extrabold text-[#10162F]">{st.title}</div>
                            {st.desc && <div className="text-xs text-gray-600 font-medium">{st.desc}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function InfographicCompareItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    let title = "Feature Comparison"
    let col1Title = "Option A"
    let col1Items: string[] = []
    let col2Title = "Option B"
    let col2Items: string[] = []

    for (const l of lines) {
        if (l.startsWith("Title:")) {
            title = l.replace(/^Title:\s*/i, "").trim()
        } else if (l.startsWith("Col1:")) {
            const parts = l.replace(/^Col1:\s*/i, "").split("|").map((p) => p.trim())
            col1Title = parts[0] || "Option A"
            col1Items = parts.slice(1)
        } else if (l.startsWith("Col2:")) {
            const parts = l.replace(/^Col2:\s*/i, "").split("|").map((p) => p.trim())
            col2Title = parts[0] || "Option B"
            col2Items = parts.slice(1)
        }
    }

    return (
        <div key={`compare-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Comparison
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border-2 border-[#10162F] bg-[#F5F3FF] space-y-3">
                    <div className="font-extrabold text-sm text-[#3A10E5] border-b-2 border-[#10162F]/10 pb-1.5 uppercase">
                        {col1Title}
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-800 font-medium">
                        {col1Items.map((it, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-[#3A10E5] font-black">•</span>
                                <span>{it}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFBEB] space-y-3">
                    <div className="font-extrabold text-sm text-amber-900 border-b-2 border-[#10162F]/10 pb-1.5 uppercase">
                        {col2Title}
                    </div>
                    <ul className="space-y-1.5 text-xs text-gray-800 font-medium">
                        {col2Items.map((it, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-600 font-black">•</span>
                                <span>{it}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

const PALETTE = ["#3A10E5", "#FFD15C", "#10B981", "#F97316", "#8B5CF6", "#06B6D4", "#EC4899"]

function ChartBarItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    let title = "Data Comparison"
    const bars: { label: string; value: number }[] = []

    for (const l of lines) {
        if (l.startsWith("title:")) {
            title = l.replace(/^title:\s*/i, "").trim()
        } else {
            const parts = l.split(":")
            if (parts.length >= 2) {
                const label = parts[0].trim()
                const val = parseFloat(parts.slice(1).join(":").trim()) || 0
                bars.push({ label, value: val })
            }
        }
    }

    const maxVal = Math.max(...bars.map((b) => b.value), 1)

    return (
        <div key={`chart-bar-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Bar Chart
                </span>
            </div>
            <div className="space-y-3 pt-1">
                {bars.map((bar, i) => {
                    const pct = Math.min(100, Math.max(8, Math.round((bar.value / maxVal) * 100)))
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-[#10162F]">
                                <span>{bar.label}</span>
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border border-[#10162F]/20 text-[11px]">
                                    {bar.value}
                                </span>
                            </div>
                            <div className="h-5 w-full rounded-lg border-2 border-[#10162F] bg-[#FFFDF9] overflow-hidden p-0.5">
                                <div
                                    className="h-full rounded-md transition-all duration-700"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: PALETTE[i % PALETTE.length],
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function ChartPieItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    let title = "Distribution Breakdown"
    const slices: { label: string; value: number }[] = []

    for (const l of lines) {
        if (l.startsWith("title:")) {
            title = l.replace(/^title:\s*/i, "").trim()
        } else {
            const parts = l.split(":")
            if (parts.length >= 2) {
                const label = parts[0].trim()
                const val = parseFloat(parts.slice(1).join(":").trim()) || 0
                slices.push({ label, value: val })
            }
        }
    }

    const total = slices.reduce((sum, s) => sum + s.value, 0) || 1

    return (
        <div key={`chart-pie-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Pie Chart
                </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {(() => {
                            let accumulatedPercent = 0
                            return slices.map((s, idx) => {
                                const pct = (s.value / total) * 100
                                const strokeDasharray = `${pct} ${100 - pct}`
                                const strokeDashoffset = -accumulatedPercent
                                accumulatedPercent += pct
                                return (
                                    <circle
                                        key={idx}
                                        cx="18"
                                        cy="18"
                                        r="15.915"
                                        fill="transparent"
                                        stroke={PALETTE[idx % PALETTE.length]}
                                        strokeWidth="4"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                    />
                                )
                            })
                        })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total</span>
                        <span className="text-base font-black text-[#10162F]">{Math.round(total)}</span>
                    </div>
                </div>

                <div className="flex-1 space-y-2 w-full">
                    {slices.map((s, idx) => {
                        const pct = Math.round((s.value / total) * 100)
                        return (
                            <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg border border-gray-200 bg-[#FFFDF9]">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-full border border-black flex-shrink-0"
                                        style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                                    />
                                    <span className="font-bold text-[#10162F]">{s.label}</span>
                                </div>
                                <div className="font-mono text-gray-700">
                                    <span className="font-bold">{s.value}</span>{" "}
                                    <span className="text-gray-400">({pct}%)</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function ChartLineItem({ content, blockKey }: { content: string; blockKey: number }) {
    const lines = content.trim().split("\n").filter(Boolean)
    let title = "Trend Analysis"
    const points: { label: string; value: number }[] = []

    for (const l of lines) {
        if (l.startsWith("title:")) {
            title = l.replace(/^title:\s*/i, "").trim()
        } else {
            const parts = l.split(":")
            if (parts.length >= 2) {
                const label = parts[0].trim()
                const val = parseFloat(parts.slice(1).join(":").trim()) || 0
                points.push({ label, value: val })
            }
        }
    }

    const values = points.map((p) => p.value)
    const maxVal = Math.max(...values, 1)
    const minVal = Math.min(...values, 0)
    const range = maxVal - minVal || 1

    const svgWidth = 400
    const svgHeight = 160
    const padding = 30
    const plotWidth = svgWidth - padding * 2
    const plotHeight = svgHeight - padding * 2

    const svgPoints = points.map((p, i) => {
        const x = padding + (i / Math.max(1, points.length - 1)) * plotWidth
        const y = svgHeight - padding - ((p.value - minVal) / range) * plotHeight
        return { x, y, ...p }
    })

    const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(" ")

    return (
        <div key={`chart-line-${blockKey}`} className="my-6 rounded-2xl border-2 border-[#10162F] bg-white p-5 sm:p-6 shadow-[5px_5px_0px_0px_#10162F] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#3A10E5]" />
                    <span className="text-xs font-black uppercase text-[#10162F] tracking-wide">{title}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                    Line Graph
                </span>
            </div>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-h-56">
                    <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#E5E7EB" strokeDasharray="3 3" />
                    <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#E5E7EB" strokeDasharray="3 3" />
                    <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#10162F" strokeWidth="2" />

                    <polyline fill="none" stroke="#3A10E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polylineStr} />

                    {svgPoints.map((p, idx) => (
                        <g key={idx}>
                            <circle cx={p.x} cy={p.y} r="4.5" fill="#FFD15C" stroke="#10162F" strokeWidth="2" />
                            <text x={p.x} y={svgHeight - 12} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#4B5563">
                                {p.label}
                            </text>
                            <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#3A10E5">
                                {p.value}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    )
}

function CodeBlockItem({ code, codeLang, blockKey }: { code: string; codeLang: string; blockKey: number }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback
        }
    }

    return (
        <div
            key={`code-${blockKey}`}
            className="my-5 rounded-xl border-2 border-[#10162F] bg-[#0D1117] text-[#E6EDF3] overflow-hidden shadow-[4px_4px_0px_0px_#10162F]"
        >
            <div className="flex items-center justify-between px-4 py-2 bg-[#161B22] border-b border-gray-800 text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </span>
                    <span className="font-bold uppercase text-[11px] text-gray-300 ml-1">{codeLang || "code"}</span>
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Code</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed text-[#E6EDF3]">
                <code>{code}</code>
            </pre>
        </div>
    )
}

interface CodecademyContentRendererProps {
    content: string
    className?: string
}

export function CodecademyContentRenderer({ content, className = "" }: CodecademyContentRendererProps) {
    if (!content || !content.trim()) {
        return (
            <p className="text-sm text-gray-500 italic">
                No description provided yet.
            </p>
        )
    }

    const lines = content.split("\n")
    const elements: React.ReactNode[] = []
    let inTable = false
    let tableBuffer: string[] = []
    let inCodeBlock = false
    let codeBuffer: string[] = []
    let codeLang = ""

    const flushTable = (key: number) => {
        if (tableBuffer.length === 0) return null
        const rows = tableBuffer
            .map((line) =>
                line
                    .trim()
                    .replace(/^\|/, "")
                    .replace(/\|$/, "")
                    .split("|")
                    .map((c) => c.trim())
            )
            .filter((r) => r.length > 0 && !r.every((c) => /^[-:\s]+$/.test(c)))

        const headerRow = rows[0] || []
        const dataRows = rows.slice(1)

        const tbl = (
            <div key={`table-${key}`} className="my-6 overflow-x-auto">
                <table className="w-full border-collapse border-2 border-[#10162F] rounded-lg overflow-hidden bg-white text-sm shadow-[4px_4px_0px_0px_#10162F]">
                    {headerRow.length > 0 && (
                        <thead>
                            <tr className="bg-[#FFF5EB] border-b-2 border-[#10162F]">
                                {headerRow.map((cell, idx) => (
                                    <th
                                        key={idx}
                                        className="px-4 py-2.5 font-extrabold text-left text-[#10162F] border-r-2 border-[#10162F] last:border-r-0"
                                    >
                                        {parseInline(cell)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {dataRows.map((row, rIdx) => (
                            <tr
                                key={rIdx}
                                className={`border-b border-gray-200 last:border-b-0 hover:bg-[#FFFDF9] ${
                                    rIdx % 2 === 1 ? "bg-gray-50/70" : "bg-white"
                                }`}
                            >
                                {row.map((cell, cIdx) => (
                                    <td
                                        key={cIdx}
                                        className="px-4 py-2.5 text-gray-800 border-r border-gray-200 last:border-r-0"
                                    >
                                        {parseInline(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
        tableBuffer = []
        return tbl
    }

    const flushCode = (key: number) => {
        const code = codeBuffer.join("\n")
        const lang = (codeLang || "").toLowerCase().trim()
        let block: React.ReactNode = null

        if (lang === "video") {
            block = <VideoBlockItem key={`vid-${key}`} content={code} blockKey={key} />
        } else if (lang === "audio") {
            block = <AudioBlockItem key={`aud-${key}`} content={code} blockKey={key} />
        } else if (lang === "infographic:stats") {
            block = <InfographicStatsItem key={`stat-${key}`} content={code} blockKey={key} />
        } else if (lang === "infographic:steps") {
            block = <InfographicStepsItem key={`step-${key}`} content={code} blockKey={key} />
        } else if (lang === "infographic:compare") {
            block = <InfographicCompareItem key={`cmp-${key}`} content={code} blockKey={key} />
        } else if (lang === "chart:bar") {
            block = <ChartBarItem key={`cbar-${key}`} content={code} blockKey={key} />
        } else if (lang === "chart:pie") {
            block = <ChartPieItem key={`cpie-${key}`} content={code} blockKey={key} />
        } else if (lang === "chart:line") {
            block = <ChartLineItem key={`cline-${key}`} content={code} blockKey={key} />
        } else {
            block = <CodeBlockItem key={`code-${key}`} code={code} codeLang={codeLang} blockKey={key} />
        }

        codeBuffer = []
        codeLang = ""
        return block
    }

    // Parse inline formatting (bold, highlight, code) using unified inlineFmt
    const parseInline = (text: string): React.ReactNode => {
        if (!text) return null
        return <span dangerouslySetInnerHTML={{ __html: inlineFmt(text) }} />
    }

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i]
        const line = rawLine.trim()

        // Code block
        if (line.startsWith("```")) {
            if (inCodeBlock) {
                elements.push(flushCode(i))
                inCodeBlock = false
            } else {
                inCodeBlock = true
                codeLang = line.replace(/^```/, "").trim()
            }
            continue
        }

        if (inCodeBlock) {
            codeBuffer.push(rawLine)
            continue
        }

        // Table
        if (line.startsWith("|") && line.endsWith("|")) {
            inTable = true
            tableBuffer.push(line)
            continue
        } else if (inTable) {
            elements.push(flushTable(i))
            inTable = false
        }

        // Spacer
        if (!line) {
            elements.push(<div key={`sp-${i}`} className="h-2" />)
            continue
        }

        // Heading 1
        if (line.startsWith("# ")) {
            elements.push(
                <h1
                    key={i}
                    className="text-2xl sm:text-3xl font-extrabold text-[#10162F] tracking-tight mt-6 mb-3 border-b-2 border-[#10162F]/10 pb-2 flex items-center gap-2.5"
                >
                    <span className="h-2.5 w-2.5 bg-[#3A10E5] rounded-full inline-block flex-shrink-0" />
                    <span>{line.substring(2)}</span>
                </h1>
            )
            continue
        }

        // Heading 2 (Subheading)
        if (line.startsWith("## ")) {
            const hText = line.substring(3).trim()
            const isGreenBullet = hText.startsWith("●") || hText.startsWith("•")
            elements.push(
                <h2
                    key={i}
                    className={`text-xl sm:text-2xl font-extrabold tracking-tight mt-6 mb-2.5 flex items-center gap-2.5 ${
                        isGreenBullet ? "text-emerald-800 dark:text-emerald-400" : "text-[#10162F]"
                    }`}
                >
                    {isGreenBullet && <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0 inline-block" />}
                    <span>{isGreenBullet ? hText.replace(/^[●•]\s*/, "") : hText}</span>
                </h2>
            )
            continue
        }

        // Heading 3 (Subparagraph)
        if (line.startsWith("### ")) {
            const hText = line.substring(4).trim()
            const isGreenBullet = hText.startsWith("●") || hText.startsWith("•")
            elements.push(
                <h3
                    key={i}
                    className={`text-base sm:text-lg font-bold mt-4 mb-2 flex items-center gap-2 ${
                        isGreenBullet ? "text-emerald-700 dark:text-emerald-400" : "text-[#10162F]"
                    }`}
                >
                    {isGreenBullet ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
                    ) : (
                        <span className="text-[#3A10E5] font-black">#</span>
                    )}
                    <span>{isGreenBullet ? hText.replace(/^[●•]\s*/, "") : hText}</span>
                </h3>
            )
            continue
        }

        // Callout blocks: [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], or lines starting with >
        if (line.startsWith(">") || line.includes("[!NOTE]") || line.includes("[!TIP]") || line.includes("[!WARNING]") || line.includes("[!IMPORTANT]")) {
            const isTip = line.includes("[!TIP]")
            const isWarning = line.includes("[!WARNING]")
            const isExercise = line.includes("[!IMPORTANT]")
            const isObjective = line.toLowerCase().includes("objective") || line.includes("Engineering Objective")

            const calloutLines: string[] = []
            const firstClean = line.replace(/^>\s*/, "").replace(/\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/i, "").trim()
            if (firstClean) calloutLines.push(firstClean)

            while (i + 1 < lines.length && lines[i + 1].trim().startsWith(">")) {
                i++
                calloutLines.push(lines[i].trim().replace(/^>\s*/, ""))
            }

            if (isObjective) {
                elements.push(
                    <div
                        key={i}
                        className="my-5 p-4 sm:p-5 rounded-2xl border-2 border-sky-300 bg-[#F0F7FF] text-[#1E3A8A] shadow-xs"
                    >
                        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
                            {calloutLines.map((cl, cIdx) => (
                                <p key={cIdx}>{parseInline(cl)}</p>
                            ))}
                        </div>
                    </div>
                )
            } else if (isTip) {
                elements.push(
                    <div
                        key={i}
                        className="my-4 p-4 rounded-xl border-2 border-[#10162F] bg-[#FFFBEB] text-[#10162F] shadow-[4px_4px_0px_0px_#10162F]"
                    >
                        <div className="flex items-center gap-2 font-extrabold text-sm text-amber-900 mb-1">
                            <Lightbulb className="h-4 w-4 text-amber-600" />
                            <span>Pro Tip</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-1">
                            {calloutLines.map((cl, cIdx) => (
                                <p key={cIdx}>{parseInline(cl)}</p>
                            ))}
                        </div>
                    </div>
                )
            } else if (isWarning) {
                elements.push(
                    <div
                        key={i}
                        className="my-4 p-4 rounded-xl border-2 border-[#10162F] bg-[#FFF1F2] text-[#10162F] shadow-[4px_4px_0px_0px_#10162F]"
                    >
                        <div className="flex items-center gap-2 font-extrabold text-sm text-rose-900 mb-1">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <span>Watch Out</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-1">
                            {calloutLines.map((cl, cIdx) => (
                                <p key={cIdx}>{parseInline(cl)}</p>
                            ))}
                        </div>
                    </div>
                )
            } else if (isExercise) {
                elements.push(
                    <div
                        key={i}
                        className="my-4 p-4 rounded-xl border-2 border-[#3A10E5] bg-[#F5F3FF] text-[#10162F] shadow-[4px_4px_0px_0px_#3A10E5]"
                    >
                        <div className="flex items-center gap-2 font-extrabold text-sm text-[#3A10E5] mb-1">
                            <Sparkles className="h-4 w-4" />
                            <span>Hands-on Exercise</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-1">
                            {calloutLines.map((cl, cIdx) => (
                                <p key={cIdx}>{parseInline(cl)}</p>
                            ))}
                        </div>
                    </div>
                )
            } else {
                elements.push(
                    <div
                        key={i}
                        className="my-4 p-4.5 rounded-2xl border-2 border-sky-300 bg-[#F0F7FF] text-[#10162F] shadow-xs"
                    >
                        <div className="flex items-center gap-2 font-extrabold text-sm text-[#3A10E5] mb-1">
                            <Info className="h-4 w-4" />
                            <span>Important Takeaway</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-800 leading-relaxed space-y-1">
                            {calloutLines.map((cl, cIdx) => (
                                <p key={cIdx}>{parseInline(cl)}</p>
                            ))}
                        </div>
                    </div>
                )
            }
            continue
        }

        // Video: [video](url "title") or [video](url)
        const videoMatch = line.match(/^\[video\]\((.*?)(?:\s+"(.*?)")?\)/i)
        if (videoMatch) {
            const vUrl = videoMatch[1]
            const vTitle = videoMatch[2] || ""
            elements.push(
                <VideoBlockItem
                    key={i}
                    content={`url: ${vUrl}\ntitle: ${vTitle}`}
                    blockKey={i}
                />
            )
            continue
        }

        // Audio: [audio](url "title") or [audio](url)
        const audioMatch = line.match(/^\[audio\]\((.*?)(?:\s+"(.*?)")?\)/i)
        if (audioMatch) {
            const aUrl = audioMatch[1]
            const aTitle = audioMatch[2] || ""
            elements.push(
                <AudioBlockItem
                    key={i}
                    content={`url: ${aUrl}\ntitle: ${aTitle}`}
                    blockKey={i}
                />
            )
            continue
        }

        // Images: ![alt](url "caption") or ![alt](url)
        const imgMatch = line.match(/!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/)
        if (imgMatch) {
            const alt = imgMatch[1]
            const src = imgMatch[2]
            const caption = imgMatch[3]
            elements.push(
                <figure
                    key={i}
                    className="my-6 rounded-2xl border-2 border-[#10162F] bg-white overflow-hidden shadow-[4px_4px_0px_0px_#10162F]"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={alt || "Course illustration"}
                        className="w-full max-h-[480px] object-contain bg-[#FFFDF9] p-3"
                    />
                    {caption && (
                        <figcaption className="p-3 text-xs text-gray-700 bg-[#FFF5EB] border-t-2 border-[#10162F] font-bold text-center">
                            {caption}
                        </figcaption>
                    )}
                </figure>
            )
            continue
        }

        // Checkbox list item: - [ ] or - [x]
        if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
            const isChecked = line.startsWith("- [x] ")
            const text = line.substring(6)
            elements.push(
                <div key={i} className="flex items-start gap-2.5 my-1.5 text-sm text-gray-800">
                    <span
                        className={`h-4 w-4 mt-0.5 rounded flex items-center justify-center border-2 border-[#10162F] flex-shrink-0 ${
                            isChecked ? "bg-[#FFD15C]" : "bg-white"
                        }`}
                    >
                        {isChecked && <Check className="h-3 w-3 text-black stroke-[3]" />}
                    </span>
                    <span>{parseInline(text)}</span>
                </div>
            )
            continue
        }

        // Bullet list item
        if (line.startsWith("- ")) {
            elements.push(
                <div key={i} className="flex items-start gap-2.5 my-1.5 text-sm text-gray-800 pl-1">
                    <span className="h-2 w-2 rounded-full bg-[#3A10E5] mt-1.5 flex-shrink-0" />
                    <span>{parseInline(line.substring(2))}</span>
                </div>
            )
            continue
        }

        // Regular paragraph with parsed inline styling
        elements.push(
            <p key={i} className="text-sm sm:text-base text-gray-800 leading-relaxed my-2">
                {parseInline(line)}
            </p>
        )
    }

    if (inTable) elements.push(flushTable(lines.length))
    if (inCodeBlock) elements.push(flushCode(lines.length))

    return <div className={`space-y-1 ${className}`}>{elements}</div>
}
