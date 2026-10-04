"use client"

import React, { useState } from "react"
import "./rosera.css"
import { inlineFmt, sanitizeSvg, sanitizeHtml } from "@/lib/rosera/inline"
import {
    Sparkles,
    Check,
    Copy,
    Play,
    Terminal,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Lightbulb,
    AlertTriangle,
    Info,
    Target,
    Layers,
    Cpu,
    ArrowRight,
    RefreshCw,
    Award
} from "lucide-react"

// Types for Rosera Block Hierarchy
export interface RoseraCodeSnippet {
    language?: string
    filename?: string
    code: string
    runnable?: boolean
    expectedOutput?: string
}

export interface RoseraDiagramNode {
    id: string
    label: string
    subtitle?: string
    color?: "blue" | "sky" | "indigo" | "purple" | "emerald" | "amber" | "rose" | string
}

export interface RoseraDiagramStep {
    stepNumber?: number
    title: string
    detail: string
}

export interface RoseraDiagramStage {
    shape?: "box" | "pill" | "circle" | "card" | "neural" | "probabilities" | "arrow" | "custom"
    label?: string
    subtitle?: string
    bgColor?: string
    borderColor?: string
    textColor?: string
    width?: string | number
    minWidth?: string | number
    size?: string | number
    color?: string
    nodeColor?: string
    lineColor?: string
    labelColor?: string
    arrowColor?: string
    chips?: Array<{ label: string; value: string | number; bgColor?: string; textColor?: string; borderColor?: string }>
    nextToken?: string
    nextTokenColor?: string
    badge?: string
    badgeColor?: string
    customHtml?: string
    customSvg?: string
    [key: string]: any
}

export interface RoseraDiagramFlow {
    type?: string
    title?: string
    caption?: string
    bgColor?: string
    borderColor?: string
    direction?: "horizontal" | "vertical" | "grid"
    nodes?: RoseraDiagramNode[]
    steps?: RoseraDiagramStep[]
    stages?: RoseraDiagramStage[]
    rawSvg?: string
    rawHtml?: string
    [key: string]: any
}

export interface RoseraQuiz {
    question: string
    options: string[]
    correctIndex: number
    explanation?: string
}

export interface RoseraBlock {
    type: "paragraph" | "subheading" | "callout" | "code" | "diagram" | "quiz" | "tokenStream" | string
    content?: string
    level?: number
    calloutType?: "tip" | "note" | "warning" | "objective" | "formula" | string
    codeSnippet?: RoseraCodeSnippet
    diagramFlow?: RoseraDiagramFlow
    quiz?: RoseraQuiz
    // Additional flexible metadata
    [key: string]: any
}

// Normalizes schema v1 blocks ({t: "h2", x: "...", k: "tip", ...}) to RoseraBlock
function normalizeSchemaV1Block(b: any): RoseraBlock | null {
    if (!b || typeof b !== "object") return { type: "paragraph", content: String(b || "") }
    const type = b.t || b.type || "paragraph"

    switch (type) {
        case "h2":
            return { type: "subheading", level: 2, style: "pill-accent", content: b.x || b.content || "" }
        case "sub":
            return { type: "subheading", level: 3, content: b.x || b.content || "" }
        case "p":
        case "paragraph":
            return { type: "paragraph", content: b.x || b.content || "" }
        case "code":
            return {
                type: "code",
                codeSnippet: {
                    language: b.lang || "python",
                    filename: b.title || "main.py",
                    code: b.x || b.code || "",
                    runnable: b.runnable === true,
                    expectedOutput: b.expectedOutput,
                },
            }
        case "callout":
            return {
                type: "callout",
                calloutType: b.k || b.calloutType || "tip",
                content: b.x || b.content || "",
            }
        case "quiz":
            return {
                type: "quiz",
                quiz: {
                    question: b.q || b.question || "",
                    options: b.o || b.options || [],
                    correctIndex: b.a !== undefined ? b.a : (b.correctIndex || 0),
                    explanation: b.why || b.explanation || "",
                },
            }
        case "flow":
            return {
                ...b,
                type: "flow",
                steps: b.steps ?? [],
            }
        case "art":
            return (b.svg || b.rawSvg)
                ? { type: "diagram", diagramFlow: { rawSvg: b.svg || b.rawSvg } }
                : null
        case "infographic":
            return {
                type: "infographic",
                items: b.items || [],
            }
        case "table":
            return {
                type: "table",
                table: b.table || { headers: b.h || [], rows: b.r || [] },
            }
        case "chart":
            return {
                type: "chart",
                chart: b,
                title: b.title || "",
                d: b.d || [],
            }
        case "image":
            return {
                type: "image",
                src: b.src,
                alt: b.alt,
                caption: b.caption,
                content: b.src ? `![${b.alt || "image"}](${b.src})\n*${b.caption || ""}*` : "",
            }
        case "html":
        case "rawHtml":
        case "embed":
            return {
                type: "html",
                content: b.x || b.content || b.html || "",
            }
        case "list":
            return {
                type: "list",
                items: b.items || [],
                content: Array.isArray(b.items) ? b.items.map((it: any) => `- ${it}`).join("\n") : "",
            }
        case "interactive":
        case "widget":
            return {
                type: "interactive",
                widget: b.widget || "",
                title: b.title || b.widget || "Interactive Simulation",
                content: b.content || b.x || "",
            }
        default:
            return {
                ...b,
                type,
                content: b.x || b.content || "",
            }
    }
}

// -------------------------------------------------------------
// HELPER: PARSE CONTENT INTO BLOCKS
// Handles raw JSON, stringified JSON, or fallback markdown parsing
// -------------------------------------------------------------
export function parseRoseraBlocks(rawContent: string | any): RoseraBlock[] {
    if (!rawContent) return []

    // If already an array of blocks
    if (Array.isArray(rawContent)) {
        return rawContent.map(normalizeSchemaV1Block).filter(Boolean) as RoseraBlock[]
    }

    if (typeof rawContent === "object") {
        if (Array.isArray(rawContent.blocks)) {
            return rawContent.blocks.map(normalizeSchemaV1Block).filter(Boolean) as RoseraBlock[]
        }
        return []
    }

    const trimmed = String(rawContent).trim()

    // 1. Try parsing JSON format
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) return parsed.map(normalizeSchemaV1Block).filter(Boolean) as RoseraBlock[]
            if (Array.isArray(parsed.blocks)) return parsed.blocks.map(normalizeSchemaV1Block).filter(Boolean) as RoseraBlock[]
            if (parsed.topics && Array.isArray(parsed.topics[0]?.blocks)) {
                return parsed.topics[0].blocks.map(normalizeSchemaV1Block).filter(Boolean) as RoseraBlock[]
            }
        } catch {
            // Not pure JSON, proceed to HTML / markdown block extractor
        }
    }

    // 2. Direct HTML block detection - preserves custom HTML, CSS & layout intact
    if (
        trimmed.includes("<!DOCTYPE html") ||
        trimmed.includes("<html") ||
        (trimmed.startsWith("<") && trimmed.includes("</") && (trimmed.includes("style=") || trimmed.includes("<style") || trimmed.includes("class=")))
    ) {
        return [{ type: "html", content: trimmed }]
    }

    // 3. Fallback: Parse extended markdown into Rosera blocks
    return convertMarkdownToRoseraBlocks(trimmed)
}

function convertMarkdownToRoseraBlocks(markdown: string): RoseraBlock[] {
    const blocks: RoseraBlock[] = []
    const sections = markdown.split(/\n{2,}/)

    for (let i = 0; i < sections.length; i++) {
        const sec = sections[i].trim()
        if (!sec) continue

        // A. Heading
        if (sec.startsWith("#")) {
            const level = sec.match(/^#+/)?.[0].length || 2
            const content = sec.replace(/^#+\s*/, "").replace(/^●\s*/, "")
            blocks.push({
                type: "subheading",
                level,
                content,
            })
            continue
        }

        // B. Callouts (> [!TIP], > [!NOTE], etc.)
        if (sec.startsWith(">")) {
            const lines = sec.split("\n")
            let calloutType = "note"
            let text = ""

            lines.forEach((l) => {
                const clean = l.replace(/^>\s*/, "").trim()
                const matchType = clean.match(/^\[!(TIP|NOTE|WARNING|CAUTION|IMPORTANT)\]/i)
                if (matchType) {
                    calloutType = matchType[1].toLowerCase()
                } else {
                    text += (text ? "\n" : "") + clean
                }
            })

            // Clean leading bold label
            text = text.replace(/^\*\*(Engineering Objective|Objective|Pro Tip|Tip|Note|Warning):\*\*\s*/i, "")

            blocks.push({
                type: "callout",
                calloutType: calloutType as any,
                content: text,
            })
            continue
        }

        // C. Code snippet (```lang ... ```)
        if (sec.startsWith("```")) {
            const match = sec.match(/^```([a-zA-Z0-9_-]*)\n([\s\S]*?)```$/)
            if (match) {
                const lang = match[1] || "python"
                let codeBody = match[2]
                let filename = ""

                const fnMatch = codeBody.match(/^(?:#|\/\/)\s*File:\s*(.*?)\n/i)
                if (fnMatch) {
                    filename = fnMatch[1].trim()
                    codeBody = codeBody.replace(/^(?:#|\/\/)\s*File:\s*.*?\n/i, "")
                }

                // Check for subsequent expected terminal output
                let expectedOutput = ""
                if (i + 1 < sections.length && sections[i + 1].includes("Expected Terminal Output")) {
                    const nextSec = sections[i + 1]
                    const outMatch = nextSec.match(/```(?:text)?\n([\s\S]*?)```/)
                    if (outMatch) {
                        expectedOutput = outMatch[1].trim()
                        i++ // Skip expected output section
                    }
                }

                blocks.push({
                    type: "code",
                    codeSnippet: {
                        language: lang,
                        filename: filename || (lang === "python" ? "script.py" : "index.ts"),
                        code: codeBody.trim(),
                        runnable: true,
                        expectedOutput,
                    },
                })
                continue
            }
        }

        // D. Self-Check Quiz block
        if (sec.includes("Self-Check") || sec.includes("Knowledge Assessment")) {
            const qMatch = sec.match(/\*\*Question:\*\*\s*(.*?)(?=\n-|\n$)/)
            const options: string[] = []
            let correctIndex = 0

            const optMatches = sec.matchAll(/- \[(x| )\] Option [A-Z]:\s*(.*?)(?=\n|$)/gi)
            let idx = 0
            for (const m of optMatches) {
                if (m[1].toLowerCase() === "x") correctIndex = idx
                options.push(m[2].trim())
                idx++
            }

            let explanation = ""
            if (i + 1 < sections.length && sections[i + 1].includes("Explanation:")) {
                explanation = sections[i + 1].replace(/^>\s*/gm, "").replace(/.*?\*\*Explanation:\*\*\s*/i, "").trim()
                i++
            }

            if (options.length > 0) {
                blocks.push({
                    type: "quiz",
                    quiz: {
                        question: qMatch ? qMatch[1].trim() : "Review Assessment Question",
                        options,
                        correctIndex,
                        explanation,
                    },
                })
                continue
            }
        }

        // E. Fallback Paragraph
        blocks.push({
            type: "paragraph",
            content: sec,
        })
    }

    return blocks
}

// -------------------------------------------------------------
// SUB-COMPONENT: PARAGRAPH WITH RICH HIGHLIGHTS
// -------------------------------------------------------------
function RoseraParagraphBlock({ content }: { content: string }) {
    if (!content) return null

    return (
        <p className="text-sm sm:text-base text-[color:var(--rz-ink)] leading-relaxed my-3 font-normal">
            <span dangerouslySetInnerHTML={{ __html: inlineFmt(content) }} />
        </p>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: SUBHEADING BLOCK
// -------------------------------------------------------------
function RoseraSubheadingBlock({
    content,
    level = 2,
    style,
    accentColor = "var(--rz-green)",
    bgColor,
    textColor,
}: {
    content: string
    level?: number
    style?: string
    accentColor?: string
    bgColor?: string
    textColor?: string
}) {
    if (level <= 2 || style === "pill-accent" || bgColor) {
        return (
            <div
                style={{
                    backgroundColor: bgColor || "var(--rz-soft)",
                    borderLeft: `8px solid ${accentColor || "var(--rz-green)"}`,
                    color: textColor || "var(--rz-ink)",
                }}
                className="my-6 rounded-r-xl py-2.5 px-4 flex items-center shadow-xs"
            >
                <h3
                    className="font-extrabold text-xl sm:text-2xl tracking-tight m-0"
                    dangerouslySetInnerHTML={{ __html: inlineFmt(content) }}
                />
            </div>
        )
    }

    return (
        <div className="pt-5 pb-1">
            <h4
                style={{ color: textColor || "var(--rz-green)" }}
                className="font-extrabold text-lg sm:text-xl tracking-tight m-0"
                dangerouslySetInnerHTML={{ __html: inlineFmt(content) }}
            />
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: COLOR-CODED CALLOUT BLOCK
// -------------------------------------------------------------
function RoseraCalloutBlock({ calloutType = "note", content }: { calloutType?: string; content: string }) {
    const type = calloutType.toLowerCase()

    let theme = {
        bg: "bg-[color:var(--rz-card)]",
        border: "border-[color:var(--rz-ink)]",
        text: "text-[color:var(--rz-ink)]",
        titleText: "text-[color:var(--rz-ink)]",
        icon: <Info className="h-4 w-4 text-[color:var(--rz-primary)] shrink-0 mt-0.5" />,
        label: "Architecture Note",
    }

    if (type === "tip") {
        theme = {
            bg: "bg-[color:color-mix(in_srgb,var(--rz-green)_15%,var(--rz-card))]",
            border: "border-[color:var(--rz-ink)]",
            text: "text-[color:var(--rz-ink)]",
            titleText: "text-[color:var(--rz-green)]",
            icon: <Lightbulb className="h-4 w-4 text-[color:var(--rz-green)] shrink-0 mt-0.5" />,
            label: "Engineering Tip",
        }
    } else if (type === "objective") {
        theme = {
            bg: "bg-[color:var(--rz-soft)]",
            border: "border-[color:var(--rz-ink)]",
            text: "text-[color:var(--rz-ink)]",
            titleText: "text-[color:var(--rz-primary)]",
            icon: <Target className="h-4 w-4 text-[color:var(--rz-primary)] shrink-0 mt-0.5" />,
            label: "Engineering Objective",
        }
    } else if (type === "warning" || type === "warn" || type === "caution") {
        theme = {
            bg: "bg-[color:color-mix(in_srgb,rgb(244_63_94)_12%,var(--rz-card))]",
            border: "border-[color:var(--rz-ink)]",
            text: "text-[color:var(--rz-ink)]",
            titleText: "text-rose-800 dark:text-rose-300",
            icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
            label: "Warning / Critical Constraint",
        }
    }

    return (
        <div className={`my-4 p-4 sm:p-5 rounded-2xl border-2 ${theme.border} ${theme.bg} ${theme.text} shadow-[3px_3px_0px_var(--rz-ink)] transition-all`}>
            <div className="flex items-start gap-2.5">
                {theme.icon}
                <div className="space-y-1">
                    <div className={`text-xs font-black uppercase tracking-wider ${theme.titleText}`}>
                        {theme.label}
                    </div>
                    <div className="text-xs sm:text-sm leading-relaxed font-medium">
                        <span dangerouslySetInnerHTML={{ __html: inlineFmt(content || "") }} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: INTERACTIVE CODE PLAYGROUND BLOCK
// -------------------------------------------------------------
function RoseraCodeBlock({ snippet }: { snippet: RoseraCodeSnippet }) {
    const [copied, setCopied] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [hasRun, setHasRun] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRunSimulation = () => {
        setIsRunning(true)
        setTimeout(() => {
            setIsRunning(false)
            setHasRun(true)
        }, 600)
    }

    return (
        <div className="my-6 rounded-2xl border-[3px] border-[color:var(--rz-ink)] bg-[color:var(--rz-code)] text-white overflow-hidden shadow-[5px_5px_0px_var(--rz-green)] transition-all">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[color:var(--rz-lav)] border-b-2 border-[color:var(--rz-ink)] text-xs font-mono text-[color:var(--rz-ink)]">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-[color:var(--rz-primary)] text-white">
                        {snippet.language || "python"}
                    </span>
                    {snippet.filename && (
                        <span className="text-[color:var(--rz-ink)] font-bold text-xs sm:text-sm font-sans ml-1">
                            {snippet.filename}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {snippet.runnable === true && (
                        <button
                            type="button"
                            onClick={handleRunSimulation}
                            disabled={isRunning}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[color:var(--rz-green)] hover:brightness-105 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                        >
                            {isRunning ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                                <Play className="h-3 w-3 fill-current" />
                            )}
                            <span>{isRunning ? "Executing..." : "▶ Run Code"}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[color:var(--rz-yellow)] hover:brightness-95 text-[color:var(--rz-ink)] border-2 border-[color:var(--rz-ink)] text-[11px] font-extrabold shadow-xs transition-colors cursor-pointer"
                        title="Copy snippet"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3 w-3 text-[color:var(--rz-green)]" />
                                <span className="text-[color:var(--rz-green)]">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Code Body */}
            <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm overflow-x-auto leading-relaxed text-white bg-[color:var(--rz-code)]">
                <pre>
                    <code>{snippet.code}</code>
                </pre>
            </div>

            {/* Simulated Live Terminal Output */}
            {(hasRun || snippet.expectedOutput) && snippet.expectedOutput && (
                <div className="border-t border-[color:color-mix(in_srgb,var(--rz-ink)_20%,transparent)] bg-[color:var(--rz-code)] p-4 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between text-gray-400 border-b border-gray-700/50 pb-1.5 text-[11px]">
                        <span className="flex items-center gap-1.5 font-bold text-gray-300">
                            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                            Console Terminal Output
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Output
                        </span>
                    </div>
                    <pre className="text-emerald-400/90 whitespace-pre-wrap leading-normal pt-1">
                        {snippet.expectedOutput}
                    </pre>
                </div>
            )}
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: INTERACTIVE ARCHITECTURE DIAGRAM FLOW (GENERAL & DYNAMIC)
// -------------------------------------------------------------
function RoseraDiagramFlowBlock({ diagram }: { diagram: RoseraDiagramFlow }) {
    const nodes = diagram.nodes || []
    const steps = diagram.steps || []
    const stages = diagram.stages || []
    const [activeStepIndex, setActiveStepIndex] = useState(0)

    // CASE 1: Raw SVG Diagram Embed
    if (diagram.rawSvg) {
        return (
            <div
                style={{
                    backgroundColor: diagram.bgColor || "transparent",
                    borderColor: diagram.borderColor || "transparent",
                }}
                className="my-6 rounded-2xl overflow-hidden flex items-center justify-center p-4 border"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(diagram.rawSvg) }}
            />
        )
    }

    // CASE 2: Raw HTML/Canvas Diagram Embed
    if (diagram.rawHtml) {
        return (
            <div
                style={{
                    backgroundColor: diagram.bgColor || "transparent",
                    borderColor: diagram.borderColor || "transparent",
                }}
                className="my-6 rounded-2xl overflow-hidden p-4 border"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(diagram.rawHtml) }}
            />
        )
    }

    // CASE 3: Multi-Stage Architecture Flow (Pipelines, Neural Networks, Agents, RAG)
    if (stages.length > 0) {
        const outerBg = diagram.bgColor || "transparent"
        const outerBorder = diagram.borderColor || "var(--rz-ink)"

        return (
            <div className="my-6 space-y-3">
                {diagram.title && (
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[color:var(--rz-primary)] text-white">
                            ⚡ Architecture Pipeline
                        </span>
                        <h4 className="text-base font-black text-[color:var(--rz-ink)] dark:text-white">
                            {diagram.title}
                        </h4>
                    </div>
                )}
                {diagram.caption && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {diagram.caption}
                    </p>
                )}

                <div
                    style={{ backgroundColor: outerBg, borderColor: outerBorder }}
                    className="border-2 rounded-2xl p-6 sm:p-8 overflow-x-auto shadow-xs"
                >
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 min-w-fit mx-auto">
                        {stages.map((stage, idx) => {
                            const shape = stage.shape || "box"

                            // A. Yellow / Colored Prompt or Label Box
                            if (shape === "box") {
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: stage.bgColor || "var(--rz-yellow)",
                                            borderColor: stage.borderColor || "var(--rz-ink)",
                                            color: stage.textColor || "var(--rz-ink)",
                                            width: stage.width || undefined,
                                            minWidth: stage.minWidth || "160px",
                                        }}
                                        className="border-2 rounded-xl px-6 py-5 flex flex-col items-center justify-center text-center shadow-xs shrink-0"
                                    >
                                        <span className="font-black text-base md:text-lg">
                                            {stage.label || "Prompt"}
                                        </span>
                                        {stage.subtitle && (
                                            <span className="text-xs font-semibold opacity-75 mt-1">
                                                {stage.subtitle}
                                            </span>
                                        )}
                                    </div>
                                )
                            }

                            // B. Directional Arrow
                            if (shape === "arrow") {
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center shrink-0"
                                        style={{ color: stage.color || "var(--rz-primary)" }}
                                    >
                                        <svg className="w-10 h-6" viewBox="0 0 40 24" fill="none">
                                            <line
                                                x1="0"
                                                y1="12"
                                                x2="32"
                                                y2="12"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <polygon
                                                points="28,4 40,12 28,20"
                                                fill="currentColor"
                                            />
                                        </svg>
                                        {stage.label && (
                                            <span className="text-[10px] font-bold ml-1">
                                                {stage.label}
                                            </span>
                                        )}
                                    </div>
                                )
                            }

                            // C. Neural Network / Transformer Matrix
                            if (shape === "neural") {
                                const lineColor = stage.lineColor || "var(--rz-primary)"
                                const nodeColor = stage.nodeColor || "var(--rz-soft)"
                                const nodeBorder = stage.borderColor || "var(--rz-ink)"
                                const labelColor = stage.labelColor || "var(--rz-green)"

                                return (
                                    <div key={idx} className="flex flex-col items-center shrink-0">
                                        <div className="relative w-32 h-24 flex items-center justify-center">
                                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 90">
                                                <line x1="30" y1="20" x2="90" y2="35" stroke={lineColor} strokeWidth="1.5" />
                                                <line x1="30" y1="20" x2="90" y2="65" stroke={lineColor} strokeWidth="1.5" />
                                                <line x1="30" y1="45" x2="90" y2="35" stroke={lineColor} strokeWidth="1.5" />
                                                <line x1="30" y1="45" x2="90" y2="65" stroke={lineColor} strokeWidth="1.5" />
                                                <line x1="30" y1="70" x2="90" y2="35" stroke={lineColor} strokeWidth="1.5" />
                                                <line x1="30" y1="70" x2="90" y2="65" stroke={lineColor} strokeWidth="1.5" />

                                                <circle cx="30" cy="20" r="10" fill={nodeColor} stroke={nodeBorder} strokeWidth="2.5" />
                                                <circle cx="30" cy="45" r="10" fill={nodeColor} stroke={nodeBorder} strokeWidth="2.5" />
                                                <circle cx="30" cy="70" r="10" fill={nodeColor} stroke={nodeBorder} strokeWidth="2.5" />

                                                <circle cx="90" cy="35" r="10" fill={nodeColor} stroke={nodeBorder} strokeWidth="2.5" />
                                                <circle cx="90" cy="65" r="10" fill={nodeColor} stroke={nodeBorder} strokeWidth="2.5" />
                                            </svg>
                                        </div>
                                        <span
                                            className="text-xs font-black mt-1 tracking-wide"
                                            style={{ color: labelColor }}
                                        >
                                            {stage.label || "Transformer"}
                                        </span>
                                    </div>
                                )
                            }

                            // D. Probability Distribution Chips + Next Token
                            if (shape === "probabilities") {
                                const chips = stage.chips || []
                                return (
                                    <div key={idx} className="flex items-center gap-3 shrink-0">
                                        <div className="space-y-2 w-36">
                                            {chips.map((chip: any, cIdx: number) => (
                                                <div
                                                    key={cIdx}
                                                    style={{
                                                        backgroundColor: chip.bgColor || "var(--rz-soft)",
                                                        borderColor: chip.borderColor || "var(--rz-ink)",
                                                        color: chip.textColor || "var(--rz-ink)",
                                                    }}
                                                    className="border-2 rounded-xl px-4 py-2 font-black text-xs sm:text-sm flex items-center justify-between shadow-2xs"
                                                >
                                                    <span>{chip.label}</span>
                                                    <span className="font-extrabold text-xs">{chip.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {stage.nextToken && (
                                            <div className="flex items-center gap-2">
                                                <svg
                                                    className="w-8 h-6"
                                                    viewBox="0 0 32 24"
                                                    fill="none"
                                                    style={{ color: stage.arrowColor || "var(--rz-primary)" }}
                                                >
                                                    <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="4" />
                                                    <polygon points="20,4 32,12 20,20" fill="currentColor" />
                                                </svg>
                                                <span
                                                    className="font-extrabold text-sm sm:text-base whitespace-nowrap"
                                                    style={{ color: stage.nextTokenColor || "var(--rz-green)" }}
                                                >
                                                    {stage.nextToken}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            // E. Pill Shape (e.g. Tokens, Embeddings, Database)
                            if (shape === "pill") {
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: stage.bgColor || "var(--rz-soft)",
                                            borderColor: stage.borderColor || "var(--rz-ink)",
                                            color: stage.textColor || "var(--rz-ink)",
                                        }}
                                        className="border-2 rounded-full px-5 py-2 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xs shrink-0"
                                    >
                                        <span>{stage.label}</span>
                                        {stage.subtitle && (
                                            <span className="text-[11px] opacity-75 font-semibold">
                                                ({stage.subtitle})
                                            </span>
                                        )}
                                    </div>
                                )
                            }

                            // F. Card Shape
                            if (shape === "card") {
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: stage.bgColor || "var(--rz-card)",
                                            borderColor: stage.borderColor || "var(--rz-ink)",
                                            color: stage.textColor || "var(--rz-ink)",
                                            width: stage.width || "190px",
                                        }}
                                        className="border-2 rounded-2xl p-4 shadow-xs space-y-1.5 shrink-0"
                                    >
                                        {stage.badge && (
                                            <span
                                                className="text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block"
                                                style={{
                                                    backgroundColor: stage.badgeColor || "var(--rz-green)",
                                                    color: "white",
                                                }}
                                            >
                                                {stage.badge}
                                            </span>
                                        )}
                                        <div className="font-extrabold text-sm">{stage.label}</div>
                                        {stage.subtitle && (
                                            <p className="text-xs opacity-75 leading-tight">
                                                {stage.subtitle}
                                            </p>
                                        )}
                                    </div>
                                )
                            }

                            // Fallback generic stage
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        backgroundColor: stage.bgColor || "var(--rz-card)",
                                        borderColor: stage.borderColor || "var(--rz-ink)",
                                        color: stage.textColor || "var(--rz-ink)",
                                    }}
                                    className="border-2 rounded-xl p-3 font-bold text-xs shrink-0 text-center"
                                >
                                    {stage.label}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

    // CASE 4: Standard Sequential Node Sequence with Steps
    const getNodeColorClass = (color?: string, isActive?: boolean) => {
        switch (color) {
            case "sky":
                return isActive
                    ? "bg-sky-500 text-white border-sky-600 ring-4 ring-sky-300"
                    : "bg-sky-50 text-sky-950 border-sky-300"
            case "indigo":
                return isActive
                    ? "bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-300"
                    : "bg-indigo-50 text-indigo-950 border-indigo-300"
            case "purple":
                return isActive
                    ? "bg-purple-600 text-white border-purple-700 ring-4 ring-purple-300"
                    : "bg-purple-50 text-purple-950 border-purple-300"
            case "emerald":
                return isActive
                    ? "bg-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-300"
                    : "bg-emerald-50 text-emerald-950 border-emerald-300"
            case "amber":
                return isActive
                    ? "bg-amber-500 text-white border-amber-600 ring-4 ring-amber-300"
                    : "bg-amber-50 text-amber-950 border-amber-300"
            case "blue":
            default:
                return isActive
                    ? "bg-blue-600 text-white border-blue-700 ring-4 ring-blue-300"
                    : "bg-blue-50 text-blue-950 border-blue-300"
        }
    }

    return (
        <div className="my-6 rounded-2xl border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] p-5 sm:p-7 shadow-[5px_5px_0px_0px_var(--rz-ink)] space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[color:color-mix(in_srgb,var(--rz-ink)_15%,transparent)] pb-3">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[color:var(--rz-primary)] text-white">
                        ⚡ Interactive Architecture Flow
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-[color:var(--rz-ink)]">
                        {diagram.title || "Execution Pipeline"}
                    </h4>
                </div>
                {steps.length > 0 && (
                    <span className="text-xs font-bold opacity-70 text-[color:var(--rz-ink)]">
                        Step {activeStepIndex + 1} of {steps.length}
                    </span>
                )}
            </div>

            {diagram.caption && (
                <p className="text-xs text-[color:var(--rz-ink)] opacity-80 italic">
                    {diagram.caption}
                </p>
            )}

            {/* Interactive Flow Diagram Nodes Canvas */}
            {nodes.length > 0 && (
                <div className="p-4 sm:p-6 rounded-xl bg-[color:var(--rz-card)] border-2 border-[color:color-mix(in_srgb,var(--rz-ink)_20%,transparent)] overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[550px] gap-3">
                        {nodes.map((node, index) => {
                            const isCurrent = index === activeStepIndex
                            return (
                                <React.Fragment key={node.id || index}>
                                    <div
                                        onClick={() => setActiveStepIndex(index)}
                                        className={`flex-1 p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center relative ${getNodeColorClass(
                                            node.color,
                                            isCurrent
                                        )} ${isCurrent ? "scale-105 shadow-md" : "hover:scale-[1.02]"}`}
                                    >
                                        <div className="text-[10px] font-extrabold uppercase opacity-80 mb-0.5">
                                            Phase {index + 1}
                                        </div>
                                        <div className="text-xs font-black truncate">{node.label}</div>
                                        {node.subtitle && (
                                            <div className="text-[11px] font-medium opacity-90 truncate mt-0.5">
                                                {node.subtitle}
                                            </div>
                                        )}
                                    </div>

                                    {index < nodes.length - 1 && (
                                        <div className="flex items-center justify-center shrink-0 px-1 opacity-50">
                                            <ArrowRight className="h-4 w-4 stroke-[3] animate-pulse" />
                                        </div>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Step-by-Step Breakdown Controls */}
            {steps.length > 0 && (
                <div className="p-4 rounded-xl bg-[color:var(--rz-soft)] border-2 border-[color:var(--rz-ink)] space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-[color:var(--rz-primary)] text-white flex items-center justify-center text-xs font-black">
                                {activeStepIndex + 1}
                            </span>
                            <span className="font-black text-sm text-[color:var(--rz-ink)]">
                                {steps[activeStepIndex]?.title || `Execution Step ${activeStepIndex + 1}`}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                                disabled={activeStepIndex === 0}
                                className="p-1 rounded-lg border border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] text-[color:var(--rz-ink)] hover:brightness-95 disabled:opacity-40"
                                title="Previous Step"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))
                                }
                                disabled={activeStepIndex >= steps.length - 1}
                                className="p-1 rounded-lg border border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] text-[color:var(--rz-ink)] hover:brightness-95 disabled:opacity-40"
                                title="Next Step"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[color:var(--rz-ink)] leading-relaxed font-medium">
                        {steps[activeStepIndex]?.detail}
                    </p>
                </div>
            )}
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: INTERACTIVE KNOWLEDGE QUIZ BLOCK
// -------------------------------------------------------------
function RoseraQuizBlock({ quiz }: { quiz: RoseraQuiz }) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [showExplanation, setShowExplanation] = useState(false)
    const [isAnswered, setIsAnswered] = useState(false)

    const handleSelectOption = (index: number) => {
        if (isAnswered) return // already answered
        setSelectedIndex(index)
        setIsAnswered(true)
        setShowExplanation(true)
    }

    const handleReset = () => {
        setSelectedIndex(null)
        setIsAnswered(false)
        setShowExplanation(false)
    }

    const isCorrect = selectedIndex === quiz.correctIndex

    return (
        <div className="my-6 rounded-2xl border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] p-5 sm:p-7 shadow-[5px_5px_0px_0px_var(--rz-ink)] space-y-5 transition-all">
            {/* Quiz Header */}
            <div className="flex items-center justify-between border-b-2 border-[color:color-mix(in_srgb,var(--rz-ink)_15%,transparent)] pb-3">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[color:var(--rz-yellow)] text-[color:var(--rz-ink)] border border-[color:var(--rz-ink)]">
                        🧪 Interactive Self-Check
                    </span>
                    <span className="text-xs font-bold opacity-75 text-[color:var(--rz-ink)]">Knowledge Assessment</span>
                </div>
                {isAnswered && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs text-[color:var(--rz-primary)] hover:underline font-bold flex items-center gap-1"
                    >
                        <RefreshCw className="h-3 w-3" />
                        <span>Try Again</span>
                    </button>
                )}
            </div>

            {/* Question */}
            <h4 className="text-base sm:text-lg font-black text-[color:var(--rz-ink)] leading-snug">
                {quiz.question}
            </h4>

            {/* Options */}
            <div className="space-y-2.5">
                {quiz.options.map((option, idx) => {
                    const isThisSelected = selectedIndex === idx
                    const isThisCorrect = idx === quiz.correctIndex

                    let cardStyle =
                        "border-[color:color-mix(in_srgb,var(--rz-ink)_20%,transparent)] bg-[color:var(--rz-card)] hover:border-[color:var(--rz-primary)] hover:bg-[color:color-mix(in_srgb,var(--rz-primary)_5%,transparent)] text-[color:var(--rz-ink)]"

                    if (isAnswered) {
                        if (isThisCorrect) {
                            cardStyle =
                                "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500"
                        } else if (isThisSelected) {
                            cardStyle =
                                "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500"
                        } else {
                            cardStyle = "border-gray-200 bg-gray-50 text-gray-400 opacity-60"
                        }
                    }

                    return (
                        <div
                            key={idx}
                            onClick={() => handleSelectOption(idx)}
                            className={`p-3.5 sm:p-4 rounded-xl border-2 font-bold text-xs sm:text-sm flex items-start gap-3 cursor-pointer transition-all ${cardStyle}`}
                        >
                            <span
                                className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
                                    isAnswered && isThisCorrect
                                        ? "bg-emerald-500 text-white border-emerald-600"
                                        : isAnswered && isThisSelected
                                        ? "bg-rose-500 text-white border-rose-600"
                                        : "bg-white dark:bg-gray-800 text-[color:var(--rz-ink)] dark:text-white border-gray-300"
                                }`}
                            >
                                {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1 pt-0.5 leading-normal">{option}</span>
                            {isAnswered && isThisCorrect && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            {isAnswered && isThisSelected && !isThisCorrect && (
                                <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Post Answer Feedback & Explanation */}
            {isAnswered && (
                <div
                    className={`p-4 sm:p-5 rounded-xl border-2 animate-in fade-in-50 duration-200 space-y-2 ${
                        isCorrect
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                            : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isCorrect ? (
                                <>
                                    <Award className="h-5 w-5 text-emerald-600" />
                                    <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                                        Correct! Outstanding comprehension (+10 XP)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                                    <span className="font-black text-sm text-rose-900 dark:text-rose-200">
                                        Incorrect Choice
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {quiz.explanation && (
                        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium pt-1 border-t border-gray-200/50">
                            <strong>Why:</strong> {quiz.explanation}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: FLUID DYNAMIC TABLE BLOCK (NEO-BRUTALIST STYLING)
// -------------------------------------------------------------
function RoseraTableBlock({ table }: { table: any }) {
    if (!table) return null
    const headers = table.headers || []
    const rows = table.rows || []

    const renderCellContent = (cell: string) => {
        if (!cell || typeof cell !== "string") return cell
        return <span dangerouslySetInnerHTML={{ __html: inlineFmt(cell) }} />
    }

    return (
        <div className="my-6 rounded-xl border-2 border-[color:var(--rz-ink)] bg-white overflow-hidden shadow-[4px_4px_0px_var(--rz-ink)]">
            {table.title && (
                <div className="px-5 py-3 bg-[color:var(--rz-card)] border-b-2 border-[color:var(--rz-ink)] font-bold text-sm text-[color:var(--rz-ink)] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[color:var(--rz-primary)]" />
                    <span>{table.title}</span>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    {headers.length > 0 && (
                        <thead className="bg-[color:var(--rz-primary)] text-white">
                            <tr>
                                {headers.map((h: string, idx: number) => (
                                    <th
                                        key={idx}
                                        className="px-4 py-3 font-extrabold text-xs sm:text-sm tracking-wide border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-primary)] text-white"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {rows.map((row: string[], rIdx: number) => (
                            <tr
                                key={rIdx}
                                className={rIdx % 2 === 0 ? "bg-white" : "bg-[color:var(--rz-card)]"}
                            >
                                {Array.isArray(row) ? (
                                    row.map((cell: string, cIdx: number) => (
                                        <td
                                            key={cIdx}
                                            className="px-4 py-3 font-medium text-xs sm:text-sm text-[color:var(--rz-ink)] border-2 border-[color:var(--rz-ink)]"
                                        >
                                            {renderCellContent(cell)}
                                        </td>
                                    ))
                                ) : (
                                    <td className="px-4 py-3 border-2 border-[color:var(--rz-ink)]">
                                        {JSON.stringify(row)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: FLUID ARCHITECTURE FLOW (NEO-BRUTALIST STEPS)
// -------------------------------------------------------------
function RoseraFlowBlock({ steps }: { steps: any[] }) {
    if (!Array.isArray(steps) || steps.length === 0) return null

    return (
        <div className="my-6 rounded-2xl border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] p-5 shadow-[4px_4px_0px_var(--rz-ink)]">
            <div className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
                {steps.map((s, idx) => {
                    const title = Array.isArray(s) ? s[0] : s.title || s
                    const desc = Array.isArray(s) ? s[1] : s.detail || s.desc || ""
                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && (
                                <div className="self-center flex items-center justify-center text-[color:var(--rz-primary)] text-xl font-black px-1">
                                    ➜
                                </div>
                            )}
                            <div className="flex-1 min-w-[130px] max-w-[210px] bg-[color:var(--rz-card)] border-2 border-[color:var(--rz-ink)] rounded-xl p-3.5 text-center shadow-[3px_3px_0px_var(--rz-primary)]">
                                <b className="block font-bold text-sm text-[color:var(--rz-green)] leading-snug">{title}</b>
                                {desc && (
                                    <small className="block text-xs text-[color:var(--rz-ink)] opacity-80 leading-tight mt-1.5 font-medium">
                                        {desc}
                                    </small>
                                )}
                            </div>
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: FLUID INFOGRAPHIC GRID
// -------------------------------------------------------------
function RoseraInfographicBlock({ items }: { items: any[] }) {
    if (!Array.isArray(items) || items.length === 0) return null

    return (
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, idx) => {
                const icon = Array.isArray(item) ? item[0] : item.icon || "✦"
                const title = Array.isArray(item) ? item[1] : item.title || ""
                const desc = Array.isArray(item) ? item[2] : item.desc || item.detail || ""
                return (
                    <div
                        key={idx}
                        className="bg-[color:var(--rz-card)] border-2 border-[color:var(--rz-ink)] rounded-xl p-4 shadow-[4px_4px_0px_var(--rz-green)]"
                    >
                        <span className="text-3xl block mb-2">{icon}</span>
                        <b className="block font-bold text-base text-[color:var(--rz-ink)]">{title}</b>
                        <p className="text-xs text-[color:var(--rz-ink)] opacity-80 mt-1.5 leading-relaxed font-medium">{desc}</p>
                    </div>
                )
            })}
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: FLUID HORIZONTAL COMPARISON BAR CHART
// -------------------------------------------------------------
function RoseraChartBlock({ chart }: { chart: any }) {
    if (!chart) return null
    const title = chart.title || "Metrics"
    const data: Array<[string, number]> = chart.d || chart.data || []
    if (data.length === 0) return null

    const maxVal = Math.max(...data.map((r) => r[1])) || 1

    return (
        <div className="my-6 bg-[color:var(--rz-card)] border-2 border-[color:var(--rz-ink)] rounded-2xl p-5 sm:p-6 shadow-[5px_5px_0px_var(--rz-primary)] space-y-3.5">
            <b className="block font-bold text-base text-[color:var(--rz-ink)]">{title}</b>
            <div className="space-y-3">
                {data.map((row, idx) => {
                    const label = row[0]
                    const val = row[1]
                    const pct = Math.max(4, Math.round((val / maxVal) * 100))
                    return (
                        <div
                            key={idx}
                            className="grid grid-cols-[130px_1fr_80px] gap-3 items-center text-xs font-bold text-[color:var(--rz-ink)]"
                        >
                            <span className="truncate">{label}</span>
                            <div className="h-5 bg-[color:var(--rz-soft)] border border-[color:var(--rz-ink)] rounded-full overflow-hidden p-[1px]">
                                <div
                                    className="h-full bg-[color:var(--rz-green)] rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-right font-mono text-[11px] text-[color:var(--rz-ink)] opacity-75">
                                {typeof val === "number" ? val.toLocaleString() : val}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: FLUID RAW HTML / CUSTOM SVG EMBED (SAFE SANDBOX)
// -------------------------------------------------------------
function RoseraHtmlBlock({ content }: { content: string }) {
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const [iframeHeight, setIframeHeight] = React.useState<number>(550)
    const looksFullscreenApp = /100d?vh|h-screen|min-h-screen/.test(content)
    const [isFixedScrollMode, setIsFixedScrollMode] = React.useState<boolean>(looksFullscreenApp)

    const isFullDocument =
        content.includes("<!DOCTYPE") ||
        content.includes("<html") ||
        content.includes("<body") ||
        content.includes("<script") ||
        content.includes("<style")

    // Lane B: Safe Sandboxed Embed with CSP, Storage Shim, and Auto-Height Reporting
    const safeSrcDoc = React.useMemo(() => {
        if (!isFullDocument) return content

        const resetStyle = !isFixedScrollMode
            ? '<style id="rosera-embed-reset">html, body { height: auto !important; min-height: 0 !important; } header.standalone-header, nav.standalone-nav, aside.standalone-sidebar { display: none !important; }</style>'
            : '<style id="rosera-embed-reset">header.standalone-header, nav.standalone-nav, aside.standalone-sidebar { display: none !important; }</style>'

        const embedPatcher = `
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://unpkg.com https://esm.sh https://aistudiocdn.com; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'none';">
${resetStyle}
<script id="rosera-embed-bridge">
  // In-memory storage shim for opaque-origin sandboxed iframes using Object.defineProperty
  (function() {
    var mem = {};
    var shim = {
      getItem: function(k) { return mem[k] !== undefined ? mem[k] : null; },
      setItem: function(k, v) { mem[k] = String(v); },
      removeItem: function(k) { delete mem[k]; },
      clear: function() { mem = {}; },
      key: function(i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, get: function() { return shim; } });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, get: function() { return shim; } });
    } catch(e) {
      try {
        window.localStorage = shim;
        window.sessionStorage = shim;
      } catch(e2) {}
    }
  })();

  window.__EMBED_MODE__ = true;
  function __roseraReportHeight() {
    try {
      var h = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0, document.body.offsetHeight || 0);
      if (h > 50) {
        window.parent.postMessage({ type: 'ROSERA_IFRAME_RESIZE', height: h }, '*');
      }
    } catch(e) {}
  }
  window.addEventListener('load', function() {
    __roseraReportHeight();
    setTimeout(__roseraReportHeight, 300);
    setTimeout(__roseraReportHeight, 1000);
  });
  window.addEventListener('resize', __roseraReportHeight);
</script>`

        if (/<head[^>]*>/i.test(content)) {
            return content.replace(/<head[^>]*>/i, (m) => `${m}${embedPatcher}`)
        } else if (content.includes("<html>")) {
            return content.replace("<html>", `<html><head>${embedPatcher}</head>`)
        }
        return `<head>${embedPatcher}</head>${content}`
    }, [content, isFullDocument, isFixedScrollMode])

    // Listen for postMessage height and progress updates safely without resize loop
    React.useEffect(() => {
        if (!isFullDocument || isFixedScrollMode) return

        const handleMessage = (e: MessageEvent) => {
            // Verify message comes from our iframe
            if (e.source !== iframeRef.current?.contentWindow) return

            if (e.data?.type === "ROSERA_IFRAME_RESIZE" && typeof e.data.height === "number") {
                const targetHeight = Math.max(380, Math.min(e.data.height, 5000))
                setIframeHeight((prev) => (Math.abs(prev - targetHeight) > 10 ? targetHeight : prev))
            }
        }

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [isFullDocument, isFixedScrollMode])

    if (!content) return null

    if (isFullDocument) {
        return (
            <div className="my-5 w-full rounded-2xl overflow-hidden border-2 border-[color:color-mix(in_srgb,var(--rz-primary)_20%,transparent)] bg-[color:var(--rz-card)] shadow-sm relative group">
                {/* Control bar: Fixed Scroll Toggle */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[color:var(--rz-card)] border-b border-[color:color-mix(in_srgb,var(--rz-ink)_15%,transparent)] text-[11px] font-bold text-[color:var(--rz-ink)] opacity-90">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-[color:var(--rz-green)] animate-pulse" />
                        Interactive Sandboxed Module
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsFixedScrollMode(!isFixedScrollMode)}
                        className="px-2 py-0.5 rounded bg-[color:var(--rz-soft)] hover:brightness-95 text-[color:var(--rz-ink)] transition-colors cursor-pointer"
                    >
                        {isFixedScrollMode ? "Auto-expand height" : "Fixed scroll view"}
                    </button>
                </div>
                <iframe
                    ref={iframeRef}
                    srcDoc={safeSrcDoc}
                    title="Imported Interactive Content"
                    className="w-full border-0 transition-all duration-300"
                    style={{
                        height: isFixedScrollMode ? "max(600px, calc(100dvh - 140px))" : `${iframeHeight}px`,
                        minHeight: "380px",
                    }}
                    sandbox="allow-scripts allow-popups"
                    allow="clipboard-write"
                />
            </div>
        )
    }

    return (
        <div
            className="my-5 rounded-2xl overflow-hidden rosera-custom-html-block"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: INTERACTIVE TOKEN STREAM PLAYGROUND
// -------------------------------------------------------------
function RoseraTokenStreamBlock({ defaultText }: { defaultText?: string }) {
    const [inputText, setInputText] = useState(
        defaultText || "Large Language Models decompose text into statistical token chunks."
    )

    // Simplified BPE approximation for visual demonstration
    const words = inputText.trim() ? inputText.trim().split(/\s+/) : []
    const charCount = inputText.length
    const wordCount = words.length
    const estimatedTokens = Math.max(1, Math.round(charCount / 3.8))

    const sampleTokens = words.flatMap((w) => {
        if (w.length > 6) {
            return [w.substring(0, 4), w.substring(4)]
        }
        return [w]
    })

    const tokenColors = [
        "bg-blue-100 text-blue-900 border-blue-300",
        "bg-emerald-100 text-emerald-900 border-emerald-300",
        "bg-amber-100 text-amber-900 border-amber-300",
        "bg-purple-100 text-purple-900 border-purple-300",
        "bg-rose-100 text-rose-900 border-rose-300",
        "bg-sky-100 text-sky-900 border-sky-300",
    ]

    return (
        <div className="my-6 rounded-2xl border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] p-5 sm:p-6 shadow-[5px_5px_0px_var(--rz-ink)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[color:color-mix(in_srgb,var(--rz-ink)_15%,transparent)] pb-3">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[color:var(--rz-primary)] text-white">
                        ⚡ Live Token Sandbox
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-[color:var(--rz-ink)]">
                        Interactive Tokenizer &amp; Context Budget Simulator
                    </h4>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-[color:var(--rz-ink)] opacity-75">
                    <span>{charCount} chars</span>
                    <span>•</span>
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                        ~{estimatedTokens} tokens
                    </span>
                </div>
            </div>

            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type any prompt or sentence here to see live token decomposition..."
                className="w-full h-20 p-3 rounded-xl border-2 border-gray-300 focus:border-[color:var(--rz-primary)] focus:ring-1 focus:ring-[color:var(--rz-primary)] text-xs sm:text-sm font-mono bg-[color:var(--rz-card)] text-[color:var(--rz-ink)] resize-none outline-none"
            />

            <div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Visual Subword Token Decomposition Stream:
                </div>
                <div className="flex items-center gap-1.5 flex-wrap p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 min-h-[50px]">
                    {sampleTokens.map((tok, i) => (
                        <span
                            key={i}
                            className={`px-2 py-0.5 rounded-md border text-xs font-mono font-bold shadow-2xs ${
                                tokenColors[i % tokenColors.length]
                            }`}
                        >
                            {tok}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

// -------------------------------------------------------------
// SUB-COMPONENT: ADAPTIVE FALLBACK FOR NOVEL/ARBITRARY BLOCKS
// Ensures Rosera is NEVER rigid: any unknown LLM block is fluidly rendered
// -------------------------------------------------------------
function RoseraAdaptiveBlock({ block }: { block: any }) {
    if (!block) return null

    // If it has content property, display it gracefully
    if (block.content && typeof block.content === "string") {
        return <RoseraParagraphBlock content={block.content} />
    }

    return (
        <div className="my-4 p-4 rounded-xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--rz-ink)_30%,transparent)] bg-[color:var(--rz-card)] text-[color:var(--rz-ink)] space-y-2">
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[color:var(--rz-ink)] text-white">
                    {block.type || "Dynamic Block"}
                </span>
                {block.title && <span className="font-extrabold text-xs">{block.title}</span>}
            </div>
            <div className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                <pre>{JSON.stringify(block, null, 2)}</pre>
            </div>
        </div>
    )
}

export interface RoseraTheme {
    colors?: {
        bg?: string
        card?: string
        ink?: string
        primary?: string
        green?: string
        yellow?: string
        soft?: string
        code?: string
        [key: string]: string | undefined
    }
    fonts?: {
        head?: string
        body?: string
        mono?: string
        [key: string]: string | undefined
    }
}

// -------------------------------------------------------------
// MAIN EXPORTED COMPONENT: ROSERA RENDERER (FLUID & ADAPTIVE)
// -------------------------------------------------------------
export function RoseraRenderer({
    content,
    theme,
    courseTitle,
}: {
    content: string | RoseraBlock[]
    theme?: RoseraTheme
    courseTitle?: string
}) {
    const blocks = parseRoseraBlocks(content)

    // Build CSS variable inline style object if theme is provided
    const themeStyle = React.useMemo(() => {
        if (!theme?.colors && !theme?.fonts) return undefined
        const styleObj: Record<string, string> = {}
        if (theme.colors) {
            Object.entries(theme.colors).forEach(([k, v]) => {
                if (v) styleObj[`--tutorial-${k}`] = v
            })
        }
        if (theme.fonts) {
            Object.entries(theme.fonts).forEach(([k, v]) => {
                if (v && /^[\w\s-]+$/.test(v)) {
                    styleObj[`--tutorial-font-${k}`] = `'${v}', ${k === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif"}`
                }
            })
        }
        return styleObj
    }, [theme])

    // Dynamically load Google Fonts link if font names specified
    React.useEffect(() => {
        if (!theme?.fonts) return
        const fontNames = Object.values(theme.fonts)
            .filter((f): f is string => Boolean(f && typeof f === "string" && /^[\w\s-]+$/.test(f)))
            .map((f) => f.trim())
            .filter(
                (f) =>
                    !["system-ui", "sans-serif", "serif", "monospace", "ui-monospace", "inherit", "initial"].includes(
                        f.toLowerCase()
                    )
            )

        if (fontNames.length === 0) return

        const uniqueFonts = Array.from(new Set(fontNames))
        const familiesParam = uniqueFonts.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800;900`).join("&")
        const href = `https://fonts.googleapis.com/css2?${familiesParam}&display=swap`

        const linkId = "rosera-google-fonts"
        let linkEl = document.getElementById(linkId) as HTMLLinkElement | null
        if (!linkEl) {
            linkEl = document.createElement("link")
            linkEl.id = linkId
            linkEl.rel = "stylesheet"
            document.head.appendChild(linkEl)
        }
        linkEl.href = href
    }, [theme?.fonts])

    if (!blocks || blocks.length === 0) {
        return (
            <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                No interactive blocks authored for this topic yet.
            </div>
        )
    }

    return (
        <div className="rosera-interactive-canvas space-y-1" style={themeStyle as any}>
            {blocks.map((block, index) => {
                const key = `rosera-block-${index}`

                switch (block.type) {
                    case "subheading":
                        return (
                            <RoseraSubheadingBlock
                                key={key}
                                content={block.content || ""}
                                level={block.level || 2}
                                style={block.style}
                                accentColor={block.accentColor}
                                bgColor={block.bgColor}
                                textColor={block.textColor}
                            />
                        )

                    case "callout":
                        return (
                            <RoseraCalloutBlock
                                key={key}
                                calloutType={block.calloutType}
                                content={block.content || ""}
                            />
                        )

                    case "code":
                        return block.codeSnippet ? (
                            <RoseraCodeBlock key={key} snippet={block.codeSnippet} />
                        ) : null

                    case "flow":
                        if (block.steps && Array.isArray(block.steps) && block.steps.length > 0) {
                            return <RoseraFlowBlock key={key} steps={block.steps} />
                        }
                        return block.diagramFlow || block.stages || block.nodes || block.rawSvg || block.rawHtml ? (
                            <RoseraDiagramFlowBlock key={key} diagram={block.diagramFlow || block} />
                        ) : null

                    case "infographic":
                        return <RoseraInfographicBlock key={key} items={block.items || []} />

                    case "chart":
                        return <RoseraChartBlock key={key} chart={block} />

                    case "diagram":
                    case "pipeline":
                    case "architecture":
                        return block.diagramFlow || block.stages || block.nodes || block.rawSvg || block.rawHtml ? (
                            <RoseraDiagramFlowBlock key={key} diagram={block.diagramFlow || block} />
                        ) : null

                    case "quiz":
                        return block.quiz ? (
                            <RoseraQuizBlock key={key} quiz={block.quiz} />
                        ) : null

                    case "table":
                    case "comparisonTable":
                        return <RoseraTableBlock key={key} table={block.table || block} />

                    case "html":
                    case "rawHtml":
                    case "embed":
                        return <RoseraHtmlBlock key={key} content={block.content || block.html || ""} />

                    case "tokenStream":
                    case "tokenSimulator":
                        return <RoseraTokenStreamBlock key={key} defaultText={block.content} />

                    case "interactive":
                    case "widget":
                        return (
                            <div
                                key={key}
                                className="my-6 rounded-2xl border-2 border-[color:var(--rz-primary)] bg-[color:var(--rz-card)] p-5 sm:p-6 shadow-[4px_4px_0px_var(--rz-primary)] space-y-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[color:var(--rz-primary)] text-white">
                                        ⚡ Interactive Tool
                                    </span>
                                    <h4 className="font-extrabold text-sm sm:text-base text-[color:var(--rz-ink)]">
                                        {block.title || block.widget || "Interactive Simulation"}
                                    </h4>
                                </div>
                                <p className="text-xs sm:text-sm text-[color:var(--rz-ink)] opacity-80 font-medium">
                                    Active interactive sandbox available in web studio mode for <strong>{block.title || block.widget}</strong>.
                                </p>
                            </div>
                        )

                    case "image":
                        return block.src ? (
                            <div key={key} className="my-6 rounded-2xl overflow-hidden border-2 border-[color:var(--rz-ink)] bg-[color:var(--rz-card)] p-3 shadow-[4px_4px_0px_var(--rz-ink)]">
                                <img
                                    src={block.src}
                                    alt={block.alt || "Lesson diagram"}
                                    className="w-full h-auto max-h-[500px] object-contain rounded-xl"
                                />
                                {block.caption && (
                                    <p className="text-center text-xs font-bold text-[color:var(--rz-ink)] opacity-75 mt-2 italic">
                                        {block.caption}
                                    </p>
                                )}
                            </div>
                        ) : null

                    case "list":
                        return Array.isArray(block.items) && block.items.length > 0 ? (
                            <ul key={key} className="my-3 space-y-2 list-disc list-inside text-sm text-[color:var(--rz-ink)]">
                                {block.items.map((item: any, i: number) => (
                                    <li key={i} className="leading-relaxed">
                                        <span dangerouslySetInnerHTML={{ __html: inlineFmt(item) }} />
                                    </li>
                                ))}
                            </ul>
                        ) : null

                    case "paragraph":
                        return (
                            <RoseraParagraphBlock
                                key={key}
                                content={block.content || ""}
                            />
                        )

                    default:
                        // Fluid adaptive fallback - never breaks or discards unknown LLM blocks
                        return <RoseraAdaptiveBlock key={key} block={block} />
                }
            })}
        </div>
    )
}
