"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Sparkles,
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    FileCode,
    Globe,
    Layers,
    ArrowRight,
    Loader2,
    Copy,
    Check
} from "lucide-react"
import { toast } from "sonner"
import { importTutorialPackage, ImportTutorialResult } from "@/lib/actions/admin/tutorial-import"
import { getTutorialCoursesAction } from "@/lib/actions/admin/courses"

export interface ParsedTutorialData {
    title: string
    technology: string
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
    description: string
    theme?: {
        colors?: Record<string, string>
        fonts?: Record<string, string>
        backgroundColor?: string
        textColor?: string
        primaryColor?: string
        [key: string]: any
    }
    packageJson?: any
    chapters: Array<{
        title: string
        description?: string
        lessons: Array<{
            title: string
            content: string
            durationText?: string
            duration?: number
        }>
    }>
    formatType: "GENAI_TUTORIAL_JSON" | "CURRICULUM_JSON" | "HTML_EMBED" | "EXTENDED_MDX" | "RAW_TEXT"
    rawContent: string
}

interface TutorialImportModalProps {
    isOpen: boolean
    onClose: () => void
    courseId?: string
    onSuccess?: (courseId: string) => void
    onApplyToEditor?: (data: {
        title: string
        technology: string
        difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
        content: string
    }) => void
}

export function convertBlocksToMarkdown(blocks: any[]): string {
    if (!Array.isArray(blocks) || blocks.length === 0) return ""

    const parts: string[] = []

    for (const block of blocks) {
        if (!block) continue
        const type = block.type

        switch (type) {
            case "paragraph": {
                if (block.content) {
                    parts.push(block.content)
                }
                break
            }
            case "subheading": {
                if (block.content) {
                    parts.push(`\n## ● ${block.content}\n`)
                }
                break
            }
            case "callout": {
                const calloutType = (block.calloutType || "note").toUpperCase()
                const label =
                    calloutType === "TIP"
                        ? "Engineering Tip"
                        : calloutType === "WARNING"
                        ? "Warning"
                        : "Note"
                parts.push(`\n> [!${calloutType}]\n> **${label}:** ${block.content || ""}\n`)
                break
            }
            case "code": {
                const snip = block.codeSnippet || block
                let snippetMd = `\n\`\`\`${snip.language || "python"}\n`
                if (snip.filename) snippetMd += `# File: ${snip.filename}\n`
                snippetMd += `${snip.code || ""}\n\`\`\`\n`
                if (snip.expectedOutput) {
                    snippetMd += `\n**Expected Terminal Output:**\n\`\`\`text\n${snip.expectedOutput}\n\`\`\`\n`
                }
                parts.push(snippetMd)
                break
            }
            case "diagram": {
                const d = block.diagramFlow || block
                let diag = `\n### ⚡ Architecture Flow: ${d.title || "Execution Pipeline"}\n`
                if (d.caption) diag += `*${d.caption}*\n\n`
                if (Array.isArray(d.nodes) && d.nodes.length > 0) {
                    diag += "```mermaid\nflowchart LR\n"
                    d.nodes.forEach((n: any, idx: number) => {
                        const lbl = (n.label || `Step ${idx + 1}`).replace(/["\(\)\[\]\{\}]/g, "")
                        diag += `  node${idx}["${lbl}"]\n`
                        if (idx > 0) {
                            diag += `  node${idx - 1} --> node${idx}\n`
                        }
                    })
                    diag += "```\n\n"
                }
                if (Array.isArray(d.steps) && d.steps.length > 0) {
                    diag += "**Step-by-Step Breakdown:**\n"
                    d.steps.forEach((s: any) => {
                        diag += `- **${s.title || "Step"}:** ${s.detail || ""}\n`
                    })
                    diag += "\n"
                }
                parts.push(diag)
                break
            }
            case "quiz": {
                const q = block.quiz || block
                let quiz = `\n### 🧪 Knowledge Self-Check\n**Question:** ${q.question || ""}\n\n`
                if (Array.isArray(q.options)) {
                    q.options.forEach((opt: string, idx: number) => {
                        const isCorrect = idx === q.correctIndex
                        quiz += `- ${isCorrect ? "[x]" : "[ ]"} Option ${String.fromCharCode(65 + idx)}: ${opt}\n`
                    })
                }
                if (q.explanation) {
                    quiz += `\n> [!NOTE]\n> **Explanation:** ${q.explanation}\n`
                }
                parts.push(quiz)
                break
            }
            default: {
                if (block.content) {
                    parts.push(block.content)
                }
            }
        }
    }

    return parts.join("\n\n").trim()
}

export function mapGenAiBlockToRoseraBlock(b: any): any {
    if (!b) return null
    if (typeof b === "string") {
        return { type: "paragraph", content: b }
    }
    const type = String(b.type || b.t || "paragraph").toLowerCase()

    switch (type) {
        case "p":
        case "paragraph":
        case "text":
            return {
                type: "paragraph",
                content: b.x || b.content || b.text || b.body || "",
            }

        case "h2":
        case "heading":
        case "header":
            return {
                type: "subheading",
                content: b.x || b.content || b.text || b.title || "",
                level: b.level || 2,
                style: b.style || "pill-accent",
                bgColor: b.bgColor || "#d3e3ff",
                accentColor: b.accentColor || "#0e9f78",
                textColor: b.textColor || "#1f2a6b",
            }

        case "sub":
            return {
                type: "subheading",
                content: b.x || b.content || b.text || b.title || "",
                level: b.level || 3,
                textColor: b.textColor || "#0e9f78",
            }

        case "callout":
        case "note":
        case "tip":
        case "warn":
        case "warning":
        case "objective":
            return {
                type: "callout",
                calloutType: b.k || b.calloutType || type,
                content: b.x || b.content || b.text || "",
            }

        case "code":
        case "codesnippet":
            return {
                type: "code",
                codeSnippet: b.codeSnippet || {
                    language: b.lang || b.language || "python",
                    filename: b.title || b.filename || (b.lang === "python" ? "main.py" : "index.ts"),
                    code: b.x || b.code || "",
                    runnable: true,
                    expectedOutput: b.expectedOutput,
                },
            }

        case "art": {
            const rawSvg =
                b.svg ||
                `<svg class="art w-full h-auto" viewBox="0 0 720 200" role="img" aria-label="Text to tokens to model to next token"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#3b2fd6"/></marker></defs><rect x="14" y="60" width="130" height="80" rx="14" fill="#ffe066" stroke="#1f2a6b" stroke-width="3"/><text x="79" y="95" text-anchor="middle" font-size="16" font-weight="700" fill="#1f2a6b">The sky is</text><text x="79" y="120" text-anchor="middle" font-size="13" fill="#1f2a6b">your prompt</text><path d="M146 100H208" stroke="#3b2fd6" stroke-width="4" marker-end="url(#ar)"/><g fill="#d3e3ff" stroke="#1f2a6b" stroke-width="3"><circle cx="280" cy="60" r="18"/><circle cx="280" cy="100" r="18"/><circle cx="280" cy="140" r="18"/><circle cx="360" cy="80" r="18"/><circle cx="360" cy="120" r="18"/></g><g stroke="#3b2fd6" stroke-width="2"><path d="M298 60L342 80M298 100L342 80M298 100L342 120M298 140L342 120M298 60L342 120"/></g><text x="320" y="182" text-anchor="middle" font-size="14" font-weight="700" fill="#0e9f78">Transformer</text><path d="M390 100H450" stroke="#3b2fd6" stroke-width="4" marker-end="url(#ar)"/><g font-size="14" font-weight="700" fill="#1f2a6b"><rect x="462" y="40" width="120" height="30" rx="8" fill="#b8f0d8" stroke="#1f2a6b" stroke-width="3"/><text x="472" y="61">blue 72%</text><rect x="462" y="85" width="120" height="30" rx="8" fill="#d3e3ff" stroke="#1f2a6b" stroke-width="3"/><text x="472" y="106">clear 18%</text><rect x="462" y="130" width="120" height="30" rx="8" fill="#d3e3ff" stroke="#1f2a6b" stroke-width="3"/><text x="472" y="151">grey 6%</text></g><path d="M584 55H620" stroke="#3b2fd6" stroke-width="4" marker-end="url(#ar)"/><text x="660" y="60" text-anchor="middle" font-size="16" font-weight="700" fill="#0e9f78">next token</text></svg>`

            return {
                type: "diagram",
                diagramFlow: {
                    title: "Transformer Prediction Pipeline",
                    rawSvg,
                    bgColor: "#f5f9ff",
                    borderColor: "#1f2a6b",
                },
            }
        }

        case "flow":
            return {
                type: "flow",
                steps: b.steps || [],
            }

        case "infographic":
            return {
                type: "infographic",
                items: b.items || [],
            }

        case "chart":
            return {
                type: "chart",
                title: b.title || "Metrics",
                d: b.d || [],
            }

        case "diagram":
        case "pipeline":
        case "architecture":
            return {
                type: "diagram",
                diagramFlow: b.diagramFlow || {
                    title: b.title,
                    caption: b.caption,
                    type: b.diagramType || "pipeline",
                    bgColor: b.bgColor,
                    borderColor: b.borderColor,
                    stages: b.stages,
                    nodes: b.nodes,
                    steps: b.steps,
                    rawSvg: b.rawSvg || b.svg,
                    rawHtml: b.rawHtml || b.html,
                },
            }

        case "quiz":
        case "assessment":
            return {
                type: "quiz",
                quiz: b.quiz || {
                    question: b.q || b.question || "",
                    options: b.o || b.options || [],
                    correctIndex: b.a !== undefined ? b.a : b.correctIndex ?? 0,
                    explanation: b.why || b.explanation || "",
                },
            }

        case "tokenstream":
        case "tokensimulator":
            return {
                type: "tokenStream",
                content: b.x || b.content || b.text,
            }

        case "table":
        case "comparisontable":
            return {
                type: "table",
                table: b.table || {
                    headers: b.h || (b.headers || []),
                    rows: b.r || (b.rows || []),
                },
            }

        case "html":
        case "embed":
            return {
                type: "html",
                content: b.x || b.content || b.html || "",
            }

        default:
            return {
                type: "paragraph",
                content: b.x || b.content || b.text || JSON.stringify(b),
            }
    }
}

export function parseGenAiTutorialJson(data: any, rawSource: string): ParsedTutorialData {
    const root = data.course || data.tutorial || data

    const title =
        root.title ||
        root.name ||
        root.courseTitle ||
        data.meta?.title ||
        root.meta?.title ||
        "GenAI Engineer Masterclass"

    const technology =
        root.technology ||
        root.subject ||
        root.category ||
        data.meta?.subject ||
        root.meta?.subject ||
        "Generative AI"

    const rawDifficulty = String(root.difficulty || data.meta?.level || root.meta?.level || "BEGINNER").toUpperCase()
    const difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" =
        rawDifficulty === "ADVANCED"
            ? "ADVANCED"
            : rawDifficulty === "INTERMEDIATE"
            ? "INTERMEDIATE"
            : "BEGINNER"

    const theme = root.theme || data.theme || {}

    // Sujhav 1: phases ko aapke chapters mein, aur chapters/topics ko lessons mein badlo
    const rawPhases = root.phases || data.phases || []
    const chapters: ParsedTutorialData["chapters"] = []

    if (Array.isArray(rawPhases) && rawPhases.length > 0) {
        rawPhases.forEach((phase: any, pIdx: number) => {
            const phaseTitle = phase.title || phase.name || `Phase ${pIdx + 1}: Core Foundations`
            const rawItems = phase.chapters || phase.topics || phase.lessons || phase.items || []

            const lessonsList: Array<{
                title: string
                content: string
                durationText?: string
                duration?: number
            }> = []

            rawItems.forEach((item: any, iIdx: number) => {
                const lessonTitle = item.title || item.name || `Topic ${iIdx + 1}`
                const durationMin = item.durationMinutes || parseInt(item.readTime || "15", 10) || 15
                const durationText = item.readTime || `${durationMin} min read`

                let lessonContent = ""

                if (Array.isArray(item.blocks) && item.blocks.length > 0) {
                    const mappedBlocks = item.blocks.map(mapGenAiBlockToRoseraBlock).filter(Boolean)
                    lessonContent = JSON.stringify({
                        title: lessonTitle,
                        summary: item.summary,
                        objective: item.objective,
                        durationMinutes: durationMin,
                        blocks: mappedBlocks,
                    })
                } else if (item.diagram || item.stages) {
                    lessonContent = JSON.stringify({
                        title: lessonTitle,
                        blocks: [{ type: "diagram", diagramFlow: item.diagram || { stages: item.stages } }],
                    })
                } else if (item.html) {
                    lessonContent = JSON.stringify({
                        title: lessonTitle,
                        blocks: [{ type: "html", content: item.html }],
                    })
                } else if (item.soon) {
                    lessonContent = JSON.stringify({
                        title: lessonTitle,
                        blocks: [
                            {
                                type: "callout",
                                calloutType: "note",
                                content: `**${lessonTitle}** is scheduled for an upcoming release of this curriculum. Hands-on engineering labs, code exercises, and live assessments are currently being prepared.`,
                            },
                        ],
                    })
                } else {
                    lessonContent =
                        item.content ||
                        item.body ||
                        item.text ||
                        `# ${lessonTitle}\n\nContent for ${lessonTitle}...`
                    if (item.objective) {
                        lessonContent = `> **Engineering Objective:** ${item.objective}\n\n${lessonContent}`
                    } else if (item.summary) {
                        lessonContent = `> **Topic Summary:** ${item.summary}\n\n${lessonContent}`
                    }
                }

                lessonsList.push({
                    title: lessonTitle,
                    content: lessonContent,
                    durationText,
                    duration: durationMin,
                })
            })

            chapters.push({
                title: phaseTitle,
                description: phase.description || null,
                lessons:
                    lessonsList.length > 0
                        ? lessonsList
                        : [{ title: phaseTitle, content: `# ${phaseTitle}\n\nContent...` }],
            })
        })
    } else if (Array.isArray(root.chapters) && root.chapters.length > 0) {
        // Standard chapters structure
        root.chapters.forEach((ch: any, cIdx: number) => {
            const chTitle = ch.title || `Chapter ${cIdx + 1}`
            const chLessons = ch.lessons || ch.topics || []

            const lessonsList = chLessons.map((l: any, lIdx: number) => {
                const lTitle = l.title || `Lesson ${lIdx + 1}`
                const durationMin = l.duration || 15
                let content = ""
                if (Array.isArray(l.blocks) && l.blocks.length > 0) {
                    const mappedBlocks = l.blocks.map(mapGenAiBlockToRoseraBlock).filter(Boolean)
                    content = JSON.stringify({
                        title: lTitle,
                        blocks: mappedBlocks,
                    })
                } else {
                    content = l.content || l.body || l.text || `# ${lTitle}\n\nContent...`
                }
                return {
                    title: lTitle,
                    content,
                    durationText: l.durationText || l.readTime || `${durationMin} min read`,
                    duration: durationMin,
                }
            })

            chapters.push({
                title: chTitle,
                description: ch.description || null,
                lessons:
                    lessonsList.length > 0
                        ? lessonsList
                        : [{ title: chTitle, content: ch.content || "" }],
            })
        })
    }

    let courseOverview = root.description || ""
    if (root.subtitle) {
        courseOverview = `### ${root.subtitle}\n\n${courseOverview}`
    }
    if (root.prerequisites) {
        courseOverview += `\n\n**Prerequisites:** ${root.prerequisites}`
    }
    const packageJson = {
        schema: data.schema || 1,
        theme,
        meta: {
            id: data.meta?.id || data.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            title,
            brand: data.meta?.brand || "aspirantbook",
            subject: technology,
            level: data.meta?.level || difficulty,
            status: data.meta?.status || "Free",
            intro: data.meta?.intro || courseOverview.trim(),
            rating: data.meta?.rating,
            learners: data.meta?.learners,
            includes: data.meta?.includes,
            stats: data.meta?.stats,
        },
        phases: (rawPhases.length > 0)
            ? rawPhases.map((p: any, pIdx: number) => ({
                id: p.id || `p${pIdx + 1}`,
                title: p.title || p.name || `Phase ${pIdx + 1}`,
                order: p.order,
                chapters: (p.chapters || p.topics || p.lessons || []).map((c: any, cIdx: number) => ({
                    id: c.id || `c${cIdx + 1}`,
                    title: c.title || c.name || `Topic ${cIdx + 1}`,
                    soon: c.soon ? 1 : undefined,
                    order: c.order,
                    blocks: c.blocks || [],
                })),
            }))
            : (Array.isArray(root.chapters) && root.chapters.length > 0)
            ? root.chapters.map((ch: any, cIdx: number) => ({
                id: ch.id || `p${cIdx + 1}`,
                title: ch.title || `Phase ${cIdx + 1}: ${ch.title}`,
                order: ch.order || (cIdx + 1) * 1000,
                chapters: (ch.lessons || ch.topics || ch.chapters || []).map((l: any, lIdx: number) => ({
                    id: l.id || `c${cIdx + 1}_${lIdx + 1}`,
                    title: l.title || l.name || `Topic ${lIdx + 1}`,
                    soon: l.soon ? 1 : undefined,
                    order: l.order || (lIdx + 1) * 1000,
                    blocks: l.blocks || (l.content ? [{ t: "p", x: l.content }] : []),
                })),
            }))
            : [
                {
                    id: "p1",
                    title: `${title} - Core Modules`,
                    order: 1000,
                    chapters: [
                        {
                            id: "c1",
                            title: title,
                            order: 1000,
                            blocks: [{ t: "p", x: courseOverview || `Welcome to ${title}` }],
                        },
                    ],
                },
            ],
    }

    return {
        title,
        technology,
        difficulty,
        theme,
        packageJson,
        description: courseOverview.trim(),
        chapters,
        formatType: "GENAI_TUTORIAL_JSON",
        rawContent: rawSource,
    }
}

export function parseTutorialInput(raw: string): ParsedTutorialData {
    const trimmed = raw.trim()

    // 1. Sujhav 1: HTML mein <script type="application/json" id="tutorial-data"> dhundo!
    const tutorialScriptMatch =
        trimmed.match(/<script\b[^>]*\bid=["']tutorial-data["'][^>]*>([\s\S]*?)<\/script>/i) ||
        trimmed.match(/<script\b[^>]*type=["']application\/json["'][^>]*\bid=["']tutorial-data["'][^>]*>([\s\S]*?)<\/script>/i) ||
        trimmed.match(/<script\b[^>]*\bid=["']tutorial-data["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i) ||
        trimmed.match(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i)

    if (tutorialScriptMatch) {
        try {
            const embeddedJson = JSON.parse(tutorialScriptMatch[1].trim())
            if (
                embeddedJson.phases ||
                embeddedJson.chapters ||
                embeddedJson.course ||
                embeddedJson.title ||
                embeddedJson.meta
            ) {
                if (!embeddedJson.title && !embeddedJson.course?.title && !embeddedJson.meta?.title) {
                    const htmlTitleMatch = trimmed.match(/<title>(.*?)<\/title>/i)
                    if (htmlTitleMatch) {
                        embeddedJson.title = htmlTitleMatch[1].replace(/<[^>]+>/g, "").trim()
                    }
                }
                if (!embeddedJson.description && !embeddedJson.meta?.intro) {
                    const descMatch = trimmed.match(/<meta\b[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
                    if (descMatch) {
                        embeddedJson.description = descMatch[1].trim()
                    }
                }
                return parseGenAiTutorialJson(embeddedJson, trimmed)
            }
        } catch (e) {
            console.warn("Found script tag but failed to parse JSON:", e)
        }
    }

    // 2. Pure JSON Input (.json file uploaded or pasted)
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const data = JSON.parse(trimmed)
            return parseGenAiTutorialJson(data, trimmed)
        } catch {
            // Not valid JSON, continue to HTML / MDX
        }
    }

    // 3. Standalone Web Embed (HTML) - Fallback ONLY if NO tutorial-data JSON found
    if (
        trimmed.includes("<!DOCTYPE html") ||
        (trimmed.includes("<html") && trimmed.includes("</html>")) ||
        (trimmed.startsWith("<") && trimmed.includes("</"))
    ) {
        let title = "Imported Web Masterclass"
        const titleMatch =
            trimmed.match(/<title>(.*?)<\/title>/i) || trimmed.match(/<h1\b[^>]*>(.*?)<\/h1>/i)
        if (titleMatch) {
            title = titleMatch[1]
                .replace(/<[^>]+>/g, "")
                .replace(/\|\s*(aspirantbook|trillionskill|embed).*$/i, "")
                .trim()
        }

        // Extract a clean description snippet for course card
        const bodyText = trimmed
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 280)

        // Store the raw HTML as a first-class Rosera HTML Block so styles and layout are preserved
        const htmlBlockContent = JSON.stringify({
            title,
            blocks: [
                {
                    type: "html",
                    content: trimmed,
                },
            ],
        })

        const embedId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "imported-web-masterclass"
        const embedPackageJson = {
            schema: 1,
            meta: {
                id: embedId,
                title,
                brand: "aspirantbook",
                subject: "Web Development",
                level: "INTERMEDIATE",
                status: "Free",
                intro: bodyText || `Interactive tutorial: ${title}`,
            },
            phases: [
                {
                    id: "p1",
                    title: "Phase 1: Foundations",
                    order: 1000,
                    chapters: [
                        {
                            id: "c1",
                            title,
                            order: 1000,
                            blocks: [
                                {
                                    t: "html",
                                    x: trimmed,
                                },
                            ],
                        },
                    ],
                },
            ],
        }

        return {
            title,
            technology: "Generative AI",
            difficulty: "INTERMEDIATE",
            description: bodyText || `Interactive tutorial: ${title}`,
            packageJson: embedPackageJson,
            chapters: [
                {
                    title: "Phase 1: Foundations",
                    description: "Interactive learning module",
                    lessons: [
                        {
                            title,
                            content: htmlBlockContent,
                            durationText: "20 min read",
                            duration: 20,
                        },
                    ],
                },
            ],
            formatType: "HTML_EMBED",
            rawContent: trimmed,
        }
    }

    // 4. Extended Markdown / MDX with YAML Frontmatter
    let title = "Imported Extended Markdown Tutorial"
    let technology = "General AI"
    let difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" = "BEGINNER"
    let body = trimmed

    if (trimmed.startsWith("---")) {
        const endFm = trimmed.indexOf("---", 3)
        if (endFm !== -1) {
            const frontmatter = trimmed.substring(3, endFm)
            body = trimmed.substring(endFm + 3).trim()

            const tMatch = frontmatter.match(/title:\s*["']?(.*?)["']?$/m)
            if (tMatch) title = tMatch[1].trim()

            const techMatch = frontmatter.match(/(?:technology|tech|subject):\s*["']?(.*?)["']?$/m)
            if (techMatch) technology = techMatch[1].trim()

            const diffMatch = frontmatter.match(/difficulty:\s*["']?(.*?)["']?$/m)
            if (diffMatch && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(diffMatch[1].toUpperCase())) {
                difficulty = diffMatch[1].toUpperCase() as any
            }
        }
    } else {
        // Find first H1
        const h1Match = trimmed.match(/^#\s+(.*$)/m)
        if (h1Match) {
            title = h1Match[1].trim()
        }
    }

    const mdxId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "imported-markdown-tutorial"
    const mdxPackageJson = {
        schema: 1,
        meta: {
            id: mdxId,
            title,
            brand: "aspirantbook",
            subject: technology,
            level: difficulty,
            status: "Free",
            intro: body.slice(0, 200).replace(/[#*`_]/g, "").trim(),
        },
        phases: [
            {
                id: "p1",
                title: "Phase 1: Fundamental Concepts",
                order: 1000,
                chapters: [
                    {
                        id: "c1",
                        title,
                        order: 1000,
                        blocks: [
                            {
                                t: "p",
                                x: body,
                            },
                        ],
                    },
                ],
            },
        ],
    }

    return {
        title,
        technology,
        difficulty,
        description: body,
        packageJson: mdxPackageJson,
        chapters: [
            {
                title: "Chapter 1: Fundamental Concepts",
                lessons: [{ title, content: body, durationText: "20 min read", duration: 20 }],
            },
        ],
        formatType: "EXTENDED_MDX",
        rawContent: trimmed,
    }
}

export function TutorialImportModal({
    isOpen,
    onClose,
    courseId,
    onSuccess,
    onApplyToEditor,
}: TutorialImportModalProps) {
    const router = useRouter()
    const [rawInput, setRawInput] = useState("")
    const [activeTab, setActiveTab] = useState<"paste" | "upload" | "sample">("paste")
    const [isImporting, setIsImporting] = useState(false)
    const [isDryRunning, setIsDryRunning] = useState(false)
    const [dryRunResult, setDryRunResult] = useState<ImportTutorialResult | null>(null)
    const [publishImmediately, setPublishImmediately] = useState(true)
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || "")
    const [availableTutorials, setAvailableTutorials] = useState<Array<{ id: string; title: string; slug: string }>>([])

    React.useEffect(() => {
        if (isOpen) {
            getTutorialCoursesAction().then((courses) => {
                setAvailableTutorials(courses)
            }).catch(() => {})
        }
    }, [isOpen])

    React.useEffect(() => {
        if (courseId) {
            setSelectedCourseId(courseId)
        }
    }, [courseId])

    const parsedData = rawInput.trim() ? parseTutorialInput(rawInput) : null

    // Trigger atomic dry-run whenever a valid package is parsed
    React.useEffect(() => {
        if (!isOpen || !parsedData?.packageJson) {
            setDryRunResult(null)
            return
        }

        let isMounted = true
        setIsDryRunning(true)
        const targetId = selectedCourseId || courseId
        importTutorialPackage(parsedData.packageJson, { dryRun: true, courseId: targetId })
            .then((res) => {
                if (isMounted) setDryRunResult(res)
            })
            .catch((err) => {
                console.error("Dry run error:", err)
            })
            .finally(() => {
                if (isMounted) setIsDryRunning(false)
            })

        return () => {
            isMounted = false
        }
    }, [isOpen, rawInput, selectedCourseId, courseId])

    if (!isOpen) return null

    const handleApplyToEditor = () => {
        if (!parsedData) {
            toast.error("Please paste or upload a tutorial package first.")
            return
        }
        if (onApplyToEditor) {
            onApplyToEditor({
                title: parsedData.title,
                technology: parsedData.technology,
                difficulty: parsedData.difficulty,
                content: parsedData.description,
            })
            toast.success("Tutorial content successfully applied to Rosera Editor!")
            onClose()
        }
    }

    const handleDirectDatabaseImport = async () => {
        if (!parsedData) {
            toast.error("Please paste or upload a tutorial package first.")
            return
        }

        setIsImporting(true)
        try {
            // If schema v1 package is present, execute via atomic importTutorialPackage server action
            if (parsedData.packageJson) {
                const targetId = selectedCourseId || courseId
                const result = await importTutorialPackage(parsedData.packageJson, {
                    dryRun: false,
                    publishImmediately,
                    courseId: targetId,
                })

                if (!result.success || !result.courseId) {
                    throw new Error(result.error || "Failed to merge tutorial package")
                }

                toast.success(
                    `Merged "${result.title}"! (+${result.summary.created} new, ${result.summary.updated} updated, ${result.summary.unlocked} unlocked, ${result.summary.unchanged} unchanged${result.summary.conflicts > 0 ? `, ${result.summary.conflicts} conflicts flagged` : ""})`
                )
                onClose()
                if (onSuccess) {
                    onSuccess(result.courseId)
                } else {
                    router.push(`/admin/tutorials/${result.courseId}/edit`)
                }
                return
            }

            // Legacy fallback for non-schema packages
            const res = await fetch("/api/admin/tutorials/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    title: parsedData.title,
                    technology: parsedData.technology,
                    difficulty: parsedData.difficulty,
                    description: parsedData.description,
                    theme: parsedData.theme,
                    chapters: parsedData.chapters,
                }),
            })

            const result = await res.json()
            if (!res.ok) {
                throw new Error(result.error || "Failed to import course")
            }

            toast.success(
                `Successfully imported "${result.title}" with ${result.chaptersCount} chapters and ${result.totalLessons} lessons!`
            )
            onClose()
            if (onSuccess) {
                onSuccess(result.courseId)
            } else {
                router.push(`/admin/tutorials/${result.courseId}/edit`)
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to import tutorial package")
        } finally {
            setIsImporting(false)
        }
    }

    const loadSampleAIStudioPackage = () => {
        const sample = JSON.stringify(
            {
                title: "Complete GenAI Engineer Masterclass: Zero to Hero",
                technology: "GenAI Engineer",
                difficulty: "INTERMEDIATE",
                phases: [
                    {
                        title: "Phase 1 · Core Principles",
                        chapters: [
                            {
                                title: "Chapter 1: The Transformer Engine & Tokenization Mechanics",
                                topics: [
                                    {
                                        title: "1.1 Tokenization Mechanics & Context Limits",
                                        readTime: "25 min read",
                                        objective:
                                            "How text transforms into numerical matrices, Byte-Pair Encoding (BPE), and why token awareness prevents silent truncation.",
                                        content:
                                            "Modern Large Language Models do not read characters or words directly; they operate over ==discrete numerical tokens== produced by statistical tokenizers like Byte-Pair Encoding (BPE) or WordPiece.\n\nUnderstanding tokenization is the fundamental requirement for any serious GenAI Engineer, as every billing tier, context window boundary, and multi-lingual penalty is determined at the token level.\n\n## ● The Mathematics of Token Decomposition\n\n```python\nimport tiktoken\n\nenc = tiktoken.get_encoding('cl100k_base')\ntokens = enc.encode('TrillionSkill GenAI Masterclass')\nprint('Token IDs:', tokens)\nprint('Token Count:', len(tokens))\n```\n\n> [!TIP]\n> Always verify token lengths before transmitting user input to avoid silent context window clipping!",
                                    },
                                    {
                                        title: "1.2 Advanced Prompt Architecture & Few-Shot Learning",
                                        readTime: "30 min read",
                                        content:
                                            "Explore production-grade system prompts, XML tagging, chain-of-thought grounding, and few-shot exemplars.",
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        title: "Phase 2 · Production RAG & Vector Data",
                        chapters: [
                            {
                                title: "Chapter 2: Vector Embeddings & Similarity Search",
                                topics: [
                                    {
                                        title: "2.1 Dense vs Sparse Vector Search",
                                        readTime: "20 min read",
                                        content:
                                            "Comparing HNSW, BM25, and hybrid reciprocal rank fusion algorithms.",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            null,
            2
        )
        setRawInput(sample)
        setActiveTab("paste")
        toast.info("Loaded Google AI Studio Curriculum Package Template!")
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            setRawInput(text)
            toast.success(`Loaded file "${file.name}"!`)
        }
        reader.readAsText(file)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
            <div className="bg-white rounded-3xl border-2 border-[#10162F] max-w-3xl w-full p-5 sm:p-7 shadow-[6px_6px_0px_0px_#10162F] space-y-5 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#3A10E5] text-white flex items-center justify-center font-black shadow-[2px_2px_0px_#10162F] border border-[#10162F]">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-[#10162F]">
                                    Universal Tutorial Import Engine
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-[#10162F]">
                                    AI &amp; JSON Studio
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Import Google AI Studio JSON packages, MDX with highlights, or standalone web embeds directly.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Import Tabs */}
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                    <button
                        onClick={() => setActiveTab("paste")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "paste"
                                ? "bg-[#3A10E5] text-white shadow-xs"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <FileCode className="h-3.5 w-3.5" />
                        Paste Code / JSON / MDX
                    </button>
                    <button
                        onClick={() => setActiveTab("upload")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "upload"
                                ? "bg-[#3A10E5] text-white shadow-xs"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Upload File (.json, .html, .md)
                    </button>
                    <button
                        onClick={loadSampleAIStudioPackage}
                        className="ml-auto px-3 py-1 rounded-xl text-[11px] font-bold text-[#3A10E5] bg-[#3A10E5]/10 hover:bg-[#3A10E5]/20 transition-all flex items-center gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        Load GenAI Masterclass Demo
                    </button>
                </div>

                {/* Active Tab Content */}
                {activeTab === "paste" && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                            <span>Paste your Google AI Studio output, Curriculum JSON, MDX, or HTML Embed:</span>
                            {rawInput && (
                                <button
                                    onClick={() => setRawInput("")}
                                    className="text-rose-600 hover:underline text-[11px]"
                                >
                                    Clear Input
                                </button>
                            )}
                        </div>
                        <textarea
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            placeholder='Paste here:
1. Google AI Studio Curriculum JSON (phases, chapters, topics)
2. Extended Markdown with highlights (==highlight==, > [!NOTE])
3. Standalone Web Embed HTML'
                            className="w-full h-48 sm:h-56 p-3.5 font-mono text-xs border-2 border-[#10162F] rounded-2xl bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#3A10E5] resize-none"
                        />
                    </div>
                )}

                {activeTab === "upload" && (
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-[#FFFDF9] space-y-3">
                        <Upload className="h-10 w-10 text-[#3A10E5] mx-auto" />
                        <h4 className="text-sm font-bold text-[#10162F]">
                            Select a file to import into Tutorial Studio
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            Supports Curriculum JSON (`.json`), Standalone HTML (`.html`), and Extended Markdown (`.md`, `.mdx`).
                        </p>
                        <label className="inline-block cursor-pointer px-4 py-2 rounded-xl bg-[#3A10E5] text-white font-bold text-xs shadow-xs hover:bg-[#300ec2] transition-colors">
                            <span>Browse Computer</span>
                            <input
                                type="file"
                                accept=".json,.html,.htm,.md,.mdx,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}

                {/* Detected Live Summary Card */}
                {parsedData && (
                    <div className="p-4 rounded-2xl bg-[#F0F7FF] border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] space-y-3 animate-in fade-in-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#3A10E5] text-white">
                                    {parsedData.formatType === "GENAI_TUTORIAL_JSON"
                                        ? "GenAI Multi-Phase Tutorial"
                                        : parsedData.formatType === "CURRICULUM_JSON"
                                        ? "Google AI Studio / Curriculum JSON"
                                        : parsedData.formatType === "HTML_EMBED"
                                        ? "Standalone HTML Embed"
                                        : "Extended Markdown / MDX"}
                                </span>
                                {parsedData.theme && Object.keys(parsedData.theme).length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E4E0FB] text-[#1B254B] border border-[#5844E8]">
                                        Theme Preserved
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Validated &amp; Ready
                            </span>
                        </div>

                        <div>
                            <h3 className="text-base font-black text-[#10162F]">
                                {parsedData.title}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 font-semibold flex-wrap">
                                <span>Subject: <strong>{parsedData.technology}</strong></span>
                                <span>•</span>
                                <span>Difficulty: <strong>{parsedData.difficulty}</strong></span>
                                {parsedData.chapters.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <span>
                                            Curriculum: <strong>{parsedData.chapters.length} Chapters / Phases</strong> (
                                            {parsedData.chapters.reduce((s, c) => s + c.lessons.length, 0)} Topics)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Visual Breakdown pill tags */}
                        {parsedData.chapters.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-sky-200">
                                {parsedData.chapters.slice(0, 4).map((ch, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-white border border-sky-300 text-[10px] font-bold text-sky-900 truncate max-w-[200px]"
                                    >
                                        {ch.title}
                                    </span>
                                ))}
                                {parsedData.chapters.length > 4 && (
                                    <span className="text-[10px] font-bold text-sky-700">
                                        +{parsedData.chapters.length - 4} more
                                    </span>
                                )}
                            </div>
                        )}

                        {/* M2: Atomic Dry-Run Merge Plan Preview */}
                        {isDryRunning && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 pt-1">
                                <Loader2 className="h-3 w-3 animate-spin text-[#3A10E5]" />
                                <span>Analyzing merge diff against current curriculum...</span>
                            </div>
                        )}

                        {dryRunResult && dryRunResult.success && (
                            <div className="pt-2 border-t border-sky-200 space-y-2">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-900 flex items-center justify-between">
                                    <span>Merge Plan Preview:</span>
                                    {dryRunResult.courseId ? (
                                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                            Matching Existing Course
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                                            New Course Creation
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {dryRunResult.summary.created > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            +{dryRunResult.summary.created} To Create
                                        </span>
                                    )}
                                    {dryRunResult.summary.updated > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                            {dryRunResult.summary.updated} To Update
                                        </span>
                                    )}
                                    {dryRunResult.summary.unlocked > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                            {dryRunResult.summary.unlocked} Placeholders to Unlock
                                        </span>
                                    )}
                                    {dryRunResult.summary.unchanged > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                                            {dryRunResult.summary.unchanged} Unchanged
                                        </span>
                                    )}
                                    {dryRunResult.summary.conflicts > 0 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                            {dryRunResult.summary.conflicts} Conflict Drafts
                                        </span>
                                    )}
                                </div>

                                {dryRunResult.summary.conflicts > 0 && (
                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900">
                                        <strong>⚠️ Editor Modification Protected:</strong> One or more lessons contain newer manual edits in the studio. To avoid overwriting your work, the incoming package version will be saved as a review draft.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Merge into Existing Course Dropdown */}
                {parsedData?.packageJson && availableTutorials.length > 0 && (
                    <div className="p-3 bg-white rounded-2xl border-2 border-[#10162F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-extrabold text-[#10162F] mb-1">
                                🎯 Merge into existing course:
                            </label>
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full bg-[#FFFDF9] border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-[#10162F] focus:outline-none focus:ring-2 focus:ring-[#3A10E5]"
                            >
                                <option value="">Auto-detect / Create new tutorial</option>
                                {availableTutorials.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.slug})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Publish vs Draft Mode Picker */}
                {parsedData?.packageJson && (
                    <div className="p-3 bg-[#FDFBF7] rounded-2xl border-2 border-[#10162F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                id="publishImmediatelyToggle"
                                checked={publishImmediately}
                                onChange={(e) => setPublishImmediately(e.target.checked)}
                                className="h-4 w-4 rounded accent-[#0E9F78]"
                            />
                            <label htmlFor="publishImmediatelyToggle" className="text-xs font-extrabold text-[#10162F] cursor-pointer">
                                {publishImmediately
                                    ? "🚀 Live Mode: Publish immediately for learners"
                                    : "📝 Safe Draft Mode: Import as working drafts (Learners won't see until approved)"}
                            </label>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                            publishImmediately ? "bg-emerald-100 text-emerald-900 border border-emerald-400" : "bg-amber-100 text-amber-900 border border-amber-400"
                        }`}>
                            {publishImmediately ? "Will Be Live" : "Will Be Draft"}
                        </span>
                    </div>
                )}

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-[#10162F] text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            onClick={handleDirectDatabaseImport}
                            disabled={!parsedData || isImporting}
                            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl border-2 border-[#10162F] text-white font-black text-xs shadow-[3px_3px_0px_#10162F] disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
                                publishImmediately ? "bg-[#0E9F78] hover:bg-[#0b8463]" : "bg-[#3A10E5] hover:bg-[#300ec2]"
                            }`}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Merging into Tutorial...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-3.5 w-3.5 text-[#FFD15C]" />
                                    <span>
                                        {dryRunResult?.summary?.updated && dryRunResult.summary.updated > 0
                                            ? `✨ Merge Phase into Tutorial (${publishImmediately ? "Live" : "as Draft"}) →`
                                            : publishImmediately
                                            ? "🚀 Import & Publish Live →"
                                            : "📥 Import as Draft →"}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
