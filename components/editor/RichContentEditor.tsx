"use client"

import React, { useState, useRef } from "react"
import {
    Bold,
    Italic,
    Strikethrough,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Pilcrow,
    Table as TableIcon,
    Image as ImageIcon,
    List,
    ListOrdered,
    CheckSquare,
    Eye,
    Edit3,
    Columns,
    Sparkles,
    AlertCircle,
    Lightbulb,
    Info,
    Upload,
    X,
    Check,
    ChevronDown,
    Code2,
    ClipboardPaste,
    Video,
    Headphones,
    BarChart2,
    PieChart,
    TrendingUp,
    Layers,
    CheckCircle2,
    Plus,
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodecademyContentRenderer } from "./CodecademyContentRenderer"
import { toast } from "sonner"

interface RichContentEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    minHeight?: string
    disabled?: boolean
}

function detectLanguage(code: string): string {
    if (!code) return "python"
    if (/:\s*(string|number|boolean|any|void)\b|<[A-Z]\w*>/m.test(code)) return "typescript"
    if (/^\s*(import|from|def |class |print\(|if __name__|elif |except |self\.)/m.test(code)) return "python"
    if (/^\s*(import |export |const |let |var |function |console\.log|=>|<\/?[a-z])/m.test(code)) return "javascript"
    if (/^\s*(public class |public static void |System\.out\.println)/m.test(code)) return "java"
    if (/^\s*(#include |std::|int main\()/m.test(code)) return "cpp"
    if (/^\s*(SELECT |INSERT INTO |UPDATE |DELETE FROM |CREATE TABLE )/mi.test(code)) return "sql"
    if (/^\s*(<!DOCTYPE|<html|<div|<style)/i.test(code)) return "html"
    if (/^\s*(\$ |npm |pnpm |yarn |pip |git |docker |curl )/m.test(code)) return "bash"
    if (/^\s*(fn\s+\w+|let\s+mut|impl\s+|use\s+std::)/m.test(code)) return "rust"
    if (/^\s*(package\s+main|func\s+\w+|import\s+\()/m.test(code)) return "go"
    if (/^\s*[\{\[][\s\S]*[\}\]]$/.test(code.trim())) return "json"
    return "python"
}

// Convert HTML <table> from web pages into clean Markdown table format
function htmlTableToMarkdown(table: Element): string {
    const rows = Array.from(table.querySelectorAll("tr"))
    if (rows.length === 0) return ""

    const tableData: string[][] = []
    let maxCols = 0

    rows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td"))
        if (cells.length === 0) return
        const rowData = cells.map((cell) => {
            return (cell.textContent || "")
                .replace(/\r?\n+/g, " ")
                .replace(/\|/g, "\\|")
                .trim()
        })
        if (rowData.length > maxCols) maxCols = rowData.length
        tableData.push(rowData)
    })

    if (tableData.length === 0 || maxCols === 0) return ""

    const normalizedData = tableData.map((row) => {
        const r = [...row]
        while (r.length < maxCols) r.push("")
        return r
    })

    const headerRow = normalizedData[0]
    const headerLine = `| ${headerRow.join(" | ")} |`
    const separatorLine = `| ${headerRow.map(() => "---").join(" | ")} |`
    const bodyLines = normalizedData.slice(1).map((row) => `| ${row.join(" | ")} |`)

    if (bodyLines.length === 0) {
        return `\n\n${headerLine}\n${separatorLine}\n| ${headerRow.map(() => " ").join(" | ")} |\n\n`
    }

    return `\n\n${headerLine}\n${separatorLine}\n${bodyLines.join("\n")}\n\n`
}

// Convert Tab-Separated Values from Excel / Google Sheets into clean Markdown table format
function tsvToMarkdown(tsvText: string): string | null {
    const lines = tsvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return null
    const tabLines = lines.filter((l) => l.includes("\t"))
    if (tabLines.length < 2) return null

    const rows = lines.map((l) => l.split("\t").map((c) => c.replace(/\|/g, "\\|").trim()))
    const maxCols = Math.max(...rows.map((r) => r.length))
    if (maxCols < 2) return null

    const normalizedData = rows.map((row) => {
        const r = [...row]
        while (r.length < maxCols) r.push("")
        return r
    })

    const headerLine = `| ${normalizedData[0].join(" | ")} |`
    const separatorLine = `| ${normalizedData[0].map(() => "---").join(" | ")} |`
    const bodyLines = normalizedData.slice(1).map((row) => `| ${row.join(" | ")} |`)

    return `\n\n${headerLine}\n${separatorLine}\n${bodyLines.join("\n")}\n\n`
}

export function RichContentEditor({
    value = "",
    onChange,
    placeholder = "Write with Rosera Editor — add headings, formatted text, code snippets, videos, audio, or infographics...",
    label,
    minHeight = "360px",
    disabled = false,
}: RichContentEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit")
    const [showTableModal, setShowTableModal] = useState(false)
    const [tableRows, setTableRows] = useState(3)
    const [tableCols, setTableCols] = useState(3)
    const [showImageModal, setShowImageModal] = useState(false)
    const [imageUrl, setImageUrl] = useState("")
    const [imageCaption, setImageCaption] = useState("")
    const [imageAlt, setImageAlt] = useState("")
    const [uploadingImage, setUploadingImage] = useState(false)
    const [showCalloutDropdown, setShowCalloutDropdown] = useState(false)
    const [showHighlightDropdown, setShowHighlightDropdown] = useState(false)
    const [showCodeModal, setShowCodeModal] = useState(false)
    const [codeSnippetLang, setCodeSnippetLang] = useState("python")
    const [codeSnippetText, setCodeSnippetText] = useState("")

    // Video Modal
    const [showVideoModal, setShowVideoModal] = useState(false)
    const [videoUrl, setVideoUrl] = useState("")
    const [videoTitle, setVideoTitle] = useState("")
    const [videoCaption, setVideoCaption] = useState("")

    // Audio Modal
    const [showAudioModal, setShowAudioModal] = useState(false)
    const [audioUrl, setAudioUrl] = useState("")
    const [audioTitle, setAudioTitle] = useState("")
    const [audioArtist, setAudioArtist] = useState("")

    // Infographics Dropdown
    const [showInfographicDropdown, setShowInfographicDropdown] = useState(false)

    // Chart Builder Modal
    const [showChartModal, setShowChartModal] = useState(false)
    const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar")
    const [chartTitle, setChartTitle] = useState("Developer Survey 2026")
    const [chartRows, setChartRows] = useState<{ label: string; value: string }[]>([
        { label: "Python", value: "45" },
        { label: "JavaScript", value: "30" },
        { label: "TypeScript", value: "20" },
        { label: "Go", value: "12" },
    ])

    // Insert text at current cursor position
    const insertAtCursor = (before: string, after: string = "", defaultText: string = "") => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentVal = value || ""
        const selection = currentVal.substring(start, end) || defaultText

        const replacement = `${before}${selection}${after}`
        const newValue = currentVal.substring(0, start) + replacement + currentVal.substring(end)

        onChange(newValue)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(
                start + before.length,
                start + before.length + selection.length
            )
        }, 10)
    }

    // Insert line prefix (e.g., #, ##, ###, -, 1.)
    const insertLinePrefix = (prefix: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentVal = value || ""

        // Find the start of the current line
        const lastNewLine = currentVal.lastIndexOf("\n", start - 1)
        const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1

        const currentLine = currentVal.substring(lineStart, end)
        // Strip any existing heading/list prefixes
        const cleanLine = currentLine.replace(/^([#]+|\-|\d+\.|\-\s\[\s\])\s*/, "")

        const newValue = currentVal.substring(0, lineStart) + `${prefix} ${cleanLine}` + currentVal.substring(end)
        onChange(newValue)

        setTimeout(() => {
            textarea.focus()
            const newCursorPos = lineStart + prefix.length + 1 + cleanLine.length
            textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 10)
    }

    // Insert a Table
    const handleInsertTable = () => {
        let tableMarkdown = "\n\n"
        // Header
        const headers = Array.from({ length: tableCols }, (_, i) => `Header ${i + 1}`)
        tableMarkdown += `| ${headers.join(" | ")} |\n`
        // Separator
        const separators = Array.from({ length: tableCols }, () => "---")
        tableMarkdown += `| ${separators.join(" | ")} |\n`
        // Rows
        for (let r = 0; r < tableRows; r++) {
            const cells = Array.from({ length: tableCols }, (_, c) => `Row ${r + 1} Cell ${c + 1}`)
            tableMarkdown += `| ${cells.join(" | ")} |\n`
        }
        tableMarkdown += "\n"

        insertAtCursor(tableMarkdown)
        setShowTableModal(false)
    }

    // Insert Image
    const handleInsertImage = () => {
        if (!imageUrl.trim()) return

        const imgMarkdown = `\n\n![${imageAlt || "Illustration"}](${imageUrl.trim()}${imageCaption ? ` "${imageCaption.trim()}"` : ""})\n\n`
        insertAtCursor(imgMarkdown)
        setImageUrl("")
        setImageCaption("")
        setImageAlt("")
        setShowImageModal(false)
    }

    // Direct Image Upload
    const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image file")
            return
        }

        try {
            setUploadingImage(true)
            const formData = new FormData()
            formData.append("file", file)
            formData.append("type", "image")

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                if (data.upload?.url) {
                    setImageUrl(data.upload.url)
                    return
                }
            }

            // If server-side S3 was unavailable, fall back smoothly to Data URL
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    setImageUrl(reader.result)
                }
            }
            reader.readAsDataURL(file)
        } catch {
            // Graceful fallback to client-side Data URL preview without throwing unhandled error
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    setImageUrl(reader.result)
                }
            }
            reader.readAsDataURL(file)
        } finally {
            setUploadingImage(false)
        }
    }

    // Insert Callouts
    const handleInsertCallout = (type: "info" | "tip" | "warning" | "exercise") => {
        let block = ""
        switch (type) {
            case "info":
                block = `\n\n> [!NOTE]\n> **Informational:** Key takeaway or concept summary here.\n\n`
                break
            case "tip":
                block = `\n\n> [!TIP]\n> **Pro Tip:** Helpful workflow shortcut or industry best-practice.\n\n`
                break
            case "warning":
                block = `\n\n> [!WARNING]\n> **Watch Out:** Common pitfalls, bugs, or syntax errors to avoid.\n\n`
                break
            case "exercise":
                block = `\n\n> [!IMPORTANT]\n> **Hands-on Exercise:** Try writing this code in your environment.\n\n`
                break
        }
        insertAtCursor(block)
        setShowCalloutDropdown(false)
    }

    // Insert Video
    const handleInsertVideo = () => {
        if (!videoUrl.trim()) return
        const snippet = `\n\n\`\`\`video\nurl: ${videoUrl.trim()}\n${videoTitle.trim() ? `title: ${videoTitle.trim()}\n` : ""}${videoCaption.trim() ? `caption: ${videoCaption.trim()}\n` : ""}\`\`\`\n\n`
        insertAtCursor(snippet)
        setVideoUrl("")
        setVideoTitle("")
        setVideoCaption("")
        setShowVideoModal(false)
    }

    // Insert Audio
    const handleInsertAudio = () => {
        if (!audioUrl.trim()) return
        const snippet = `\n\n\`\`\`audio\nurl: ${audioUrl.trim()}\n${audioTitle.trim() ? `title: ${audioTitle.trim()}\n` : ""}${audioArtist.trim() ? `artist: ${audioArtist.trim()}\n` : ""}\`\`\`\n\n`
        insertAtCursor(snippet)
        setAudioUrl("")
        setAudioTitle("")
        setAudioArtist("")
        setShowAudioModal(false)
    }

    // Insert Infographics
    const handleInsertInfographic = (type: "stats" | "steps" | "compare") => {
        let snippet = ""
        if (type === "stats") {
            snippet = `\n\n\`\`\`infographic:stats\n94% | Course Completion Rate | Highest among interactive coding platforms\n15+ | Guided Projects | Portfolio-ready applications with live review\n4.9★ | Learner Rating | Rated across 2,500+ student reviews\n\`\`\`\n\n`
        } else if (type === "steps") {
            snippet = `\n\n\`\`\`infographic:steps\n1 | Setup Environment | Install Python 3.12, VS Code, and setup git repository\n2 | Core Syntax & Logic | Master variables, conditions, loops, and data structures\n3 | Algorithms & Problem Solving | Write efficient modular functions and test algorithms\n4 | Ship Capstone Application | Deploy a live API project and earn your verified certificate\n\`\`\`\n\n`
        } else if (type === "compare") {
            snippet = `\n\n\`\`\`infographic:compare\nTitle: Python Lists vs Tuples\nCol1: Lists (Mutable) | Defined with square brackets [] | Items can be modified | Ideal for dynamic collections\nCol2: Tuples (Immutable) | Defined with parentheses () | Fixed values cannot be changed | Faster execution & lower memory\n\`\`\`\n\n`
        }
        insertAtCursor(snippet)
        setShowInfographicDropdown(false)
    }

    // Insert Chart
    const handleInsertChart = () => {
        const filtered = chartRows.filter((r) => r.label.trim() && r.value.trim())
        if (filtered.length === 0) return
        let snippet = `\n\n\`\`\`chart:${chartType}\n${chartTitle.trim() ? `title: ${chartTitle.trim()}\n` : ""}`
        for (const r of filtered) {
            snippet += `${r.label.trim()}: ${r.value.trim()}\n`
        }
        snippet += `\`\`\`\n\n`
        insertAtCursor(snippet)
        setShowChartModal(false)
    }

    // Code snippet insertion: if text is chosen/selected, wrap it immediately; otherwise open modal
    const handleCodeSnippetClick = () => {
        const textarea = textareaRef.current
        if (!textarea) {
            setShowCodeModal(true)
            return
        }

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentVal = value || ""
        const selection = currentVal.substring(start, end).trim()

        if (selection) {
            // An area is chosen/selected: place all code inside the code snippet block!
            const lang = detectLanguage(selection)
            const formatted = `\n\n\`\`\`${lang}\n${selection}\n\`\`\`\n\n`
            const newValue = currentVal.substring(0, start) + formatted + currentVal.substring(end)
            onChange(newValue)
            setTimeout(() => {
                textarea.focus()
                const newPos = start + formatted.length
                textarea.setSelectionRange(newPos, newPos)
            }, 10)
        } else {
            // No area selected: open dedicated Code Snippet Modal to paste from ChatGPT/Gemini
            setCodeSnippetText("")
            setShowCodeModal(true)
        }
    }

    const handleInsertCodeSnippetFromModal = () => {
        if (!codeSnippetText.trim()) {
            setShowCodeModal(false)
            return
        }
        const snippet = `\n\n\`\`\`${codeSnippetLang}\n${codeSnippetText.trim()}\n\`\`\`\n\n`
        insertAtCursor(snippet)
        setCodeSnippetText("")
        setShowCodeModal(false)
    }

    // Helper to upload image/GIF file or convert to client Data URL
    const uploadFileOrToDataUrl = async (file: File): Promise<string> => {
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("type", "image")

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                if (data.upload?.url) {
                    return data.upload.url
                }
            }
        } catch (e) {
            console.warn("Upload endpoint failed, falling back to data URL:", e)
        }

        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    resolve(reader.result)
                } else {
                    resolve("")
                }
            }
            reader.onerror = () => resolve("")
            reader.readAsDataURL(file)
        })
    }

    // Rich paste handler: handles images, GIFs, and tables copied from internet/Excel/Notion, while keeping normal text natural
    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // 1. Image / GIF files in clipboard items (e.g. right-click "Copy Image", screenshots, image file copy)
        const items = e.clipboardData?.items
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile()
                    if (file) {
                        e.preventDefault()
                        const isGif = file.type.includes("gif")
                        const label = isGif ? "GIF" : "Image"
                        toast.info(`Uploading pasted ${label}...`)

                        const url = await uploadFileOrToDataUrl(file)
                        if (url) {
                            const imgName = file.name ? file.name.replace(/\.[^/.]+$/, "") : label
                            insertAtCursor(`\n\n![${imgName}](${url})\n\n`)
                            toast.success(`${label} pasted successfully!`)
                        } else {
                            toast.error(`Failed to paste ${label}`)
                        }
                        return
                    }
                }
            }
        }

        const html = e.clipboardData?.getData("text/html")
        const text = e.clipboardData?.getData("text/plain")

        // 2. HTML Tables copied from web pages (Wikipedia, Notion, Google Docs, blogs, Excel HTML)
        if (html && /<table[\s>]/i.test(html)) {
            try {
                const parser = new DOMParser()
                const doc = parser.parseFromString(html, "text/html")
                const tables = Array.from(doc.querySelectorAll("table"))
                if (tables.length > 0) {
                    let allTablesMd = ""
                    tables.forEach((tbl) => {
                        const md = htmlTableToMarkdown(tbl)
                        if (md) allTablesMd += md
                    })
                    if (allTablesMd.trim()) {
                        e.preventDefault()
                        insertAtCursor(allTablesMd)
                        toast.success("Table pasted and converted to markdown!")
                        return
                    }
                }
            } catch (err) {
                console.warn("HTML table paste error:", err)
            }
        }

        // 3. Tab-separated values (copied from Excel or Google Sheets spreadsheet cells)
        if (text && text.includes("\t")) {
            const tsvMd = tsvToMarkdown(text)
            if (tsvMd) {
                e.preventDefault()
                insertAtCursor(tsvMd)
                toast.success("Spreadsheet table pasted!")
                return
            }
        }

        // 4. HTML containing <img> tags (user selected an image or GIF on a webpage and copied)
        if (html && /<img[\s>]/i.test(html)) {
            try {
                const parser = new DOMParser()
                const doc = parser.parseFromString(html, "text/html")
                const imgs = Array.from(doc.querySelectorAll("img"))
                if (imgs.length > 0) {
                    let mdImgs = ""
                    imgs.forEach((img) => {
                        const src = img.getAttribute("src")
                        if (
                            src &&
                            (src.startsWith("http://") ||
                                src.startsWith("https://") ||
                                src.startsWith("data:") ||
                                src.startsWith("/"))
                        ) {
                            const isGif = src.toLowerCase().includes(".gif")
                            const alt =
                                img.getAttribute("alt") ||
                                (isGif ? "GIF Animation" : "Image")
                            mdImgs += `\n\n![${alt}](${src})\n\n`
                        }
                    })

                    if (mdImgs.trim()) {
                        e.preventDefault()
                        const plainTrimmed = (text || "").trim()
                        if (
                            !plainTrimmed ||
                            plainTrimmed.length < 30 ||
                            plainTrimmed.startsWith("http")
                        ) {
                            insertAtCursor(mdImgs)
                        } else {
                            insertAtCursor(`\n\n${plainTrimmed}\n\n${mdImgs}\n\n`)
                        }
                        toast.success("Image / GIF pasted from web!")
                        return
                    }
                }
            } catch (err) {
                console.warn("HTML image paste error:", err)
            }
        }

        // 5. Direct Image or GIF URL pasted (e.g. Giphy link, Tenor link, or direct .gif/.png/.jpg URL)
        if (text) {
            const trimmed = text.trim()
            const isDirectImg =
                /^https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?[^\s]*)?$/i.test(
                    trimmed
                )
            const isGifHost =
                /^https?:\/\/(media\.giphy\.com|i\.giphy\.com|media[0-9]*\.giphy\.com|media\.tenor\.com)\/[^\s]+$/i.test(
                    trimmed
                )

            if (isDirectImg || isGifHost) {
                e.preventDefault()
                const isGif = trimmed.toLowerCase().includes(".gif") || isGifHost
                const label = isGif ? "GIF Animation" : "Image"
                insertAtCursor(`\n\n![${label}](${trimmed})\n\n`)
                toast.success(`${label} link converted to media block!`)
                return
            }
        }

        // 6. Normal blog post text: DO NOT prevent default!
        // The browser will paste naturally as plain blog text into the editor.
    }

    // Render Preview using unified CodecademyContentRenderer
    const renderCodecademyPreview = (rawContent: string) => {
        if (!rawContent || !rawContent.trim()) {
            return (
                <div className="py-12 text-center text-gray-400 italic">
                    Nothing to preview yet. Write something in the editor to see it styled like Codecademy!
                </div>
            )
        }

        return <CodecademyContentRenderer content={rawContent} />
    }

    return (
        <div className="w-full rounded-2xl border-2 border-[#10162F] bg-[#FFFDF9] overflow-hidden shadow-[4px_4px_0px_0px_#10162F] transition-all">
            {/* Top Bar / Mode Tabs & Label */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FFF5EB] border-b-2 border-[#10162F]">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FFD15C] border border-[#10162F]" />
                    <span className="font-extrabold text-xs sm:text-sm text-[#10162F] tracking-tight">
                        🌹 Rosera Editor
                    </span>
                    {label && label !== "Delhi Post Editor" && label !== "Rosera Editor" && (
                        <span className="hidden sm:inline text-xs font-semibold text-gray-600 border-l border-[#10162F]/25 pl-2">
                            {label}
                        </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-[#3A10E5] text-white tracking-wider">
                        Pro Studio
                    </span>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center bg-white border border-[#10162F] rounded-lg p-0.5 shadow-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode("edit")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            viewMode === "edit"
                                ? "bg-[#3A10E5] text-white"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Edit only"
                    >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Write</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("split")}
                        className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            viewMode === "split"
                                ? "bg-[#3A10E5] text-white"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Split view side-by-side"
                    >
                        <Columns className="h-3.5 w-3.5" />
                        <span>Split</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("preview")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            viewMode === "preview"
                                ? "bg-[#3A10E5] text-white"
                                : "text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Live Codecademy preview"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Codecademy Preview</span>
                    </button>
                </div>
            </div>

            {/* Interactive Formatting Toolbar (visible in edit or split mode) */}
            {viewMode !== "preview" && (
                <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-white border-b-2 border-[#10162F] text-gray-700">
                    {/* Typography Group */}
                    <div className="flex items-center border-r border-gray-200 pr-1.5 mr-1 gap-0.5">
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black font-semibold text-xs flex items-center gap-1"
                            title="Normal Paragraph"
                        >
                            <Pilcrow className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">P</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("#")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black font-bold text-xs flex items-center gap-1"
                            title="Heading 1 (Main Topic)"
                        >
                            <Heading1 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">H1</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("##")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black font-bold text-xs flex items-center gap-1"
                            title="Heading 2 (Subheading)"
                        >
                            <Heading2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">H2</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("###")}
                            className="p-1.5 rounded hover:bg-[#FFF5EB] text-[#3A10E5] font-bold text-xs flex items-center gap-1"
                            title="Heading 3 (Subparagraph)"
                        >
                            <Heading3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Sub-P</span>
                        </button>
                    </div>

                    {/* Inline Formatting Group */}
                    <div className="flex items-center border-r border-gray-200 pr-1.5 mr-1 gap-0.5">
                        <button
                            type="button"
                            onClick={() => insertAtCursor("**", "**", "bold text")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black"
                            title="Bold (**text**)"
                        >
                            <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("*", "*", "italic text")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black"
                            title="Italic (*text*)"
                        >
                            <Italic className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("~~", "~~", "strikethrough")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black"
                            title="Strikethrough"
                        >
                            <Strikethrough className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("`", "`", "code")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-black"
                            title="Inline Code (`code`)"
                        >
                            <Code className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleCodeSnippetClick}
                            className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-extrabold flex items-center gap-1 border border-gray-200 hover:border-[#10162F] transition-all bg-gray-50 ml-1"
                            title="Code Snippet / Block: Wrap selected code or insert from ChatGPT/Gemini"
                        >
                            <Code2 className="h-3.5 w-3.5 text-[#3A10E5]" />
                            <span>Code Snippet</span>
                        </button>
                    </div>

                    {/* Highlighting & Pill Badges */}
                    <div className="relative border-r border-gray-200 pr-1.5 mr-1">
                        <button
                            type="button"
                            onClick={() => setShowHighlightDropdown(!showHighlightDropdown)}
                            className="p-1.5 rounded hover:bg-[#FFF3A3] text-gray-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Highlight & Badges"
                        >
                            <span className="bg-[#FFD15C] text-black px-1.5 py-0.2 rounded text-[11px] font-bold">
                                Highlight
                            </span>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {showHighlightDropdown && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-xl bg-white border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] p-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        insertAtCursor("<mark class=\"bg-[#FFF3A3] text-black px-1.5 py-0.5 rounded font-medium\">", "</mark>", "highlighted text")
                                        setShowHighlightDropdown(false)
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-yellow-50 flex items-center justify-between"
                                >
                                    <span>Yellow Marker</span>
                                    <span className="bg-[#FFF3A3] text-black px-1.5 rounded text-[10px]">Sample</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        insertAtCursor("<span class=\"inline-block bg-[#3A10E5] text-white text-xs font-bold px-2.5 py-0.5 rounded-full\">", "</span>", "badge")
                                        setShowHighlightDropdown(false)
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-indigo-50 flex items-center justify-between"
                                >
                                    <span>Codecademy Badge</span>
                                    <span className="bg-[#3A10E5] text-white px-1.5 rounded-full text-[10px]">Free</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        insertAtCursor("<span class=\"inline-block bg-black text-[#FFD15C] text-xs font-bold px-2 py-0.5 rounded\">", "</span>", "tag")
                                        setShowHighlightDropdown(false)
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 flex items-center justify-between"
                                >
                                    <span>Retro Black Tag</span>
                                    <span className="bg-black text-[#FFD15C] px-1.5 rounded text-[10px]">Tag</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table Creator */}
                    <button
                        type="button"
                        onClick={() => setShowTableModal(true)}
                        className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                        title="Insert Grid / Table"
                    >
                        <TableIcon className="h-3.5 w-3.5 text-[#3A10E5]" />
                        <span>Table</span>
                    </button>

                    {/* Image Inserter */}
                    <button
                        type="button"
                        onClick={() => setShowImageModal(true)}
                        className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                        title="Insert / Upload Image"
                    >
                        <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Image</span>
                    </button>

                    {/* Video Inserter */}
                    <button
                        type="button"
                        onClick={() => setShowVideoModal(true)}
                        className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                        title="Insert Video (YouTube, Vimeo, MP4)"
                    >
                        <Video className="h-3.5 w-3.5 text-rose-600" />
                        <span>Video</span>
                    </button>

                    {/* Audio Inserter */}
                    <button
                        type="button"
                        onClick={() => setShowAudioModal(true)}
                        className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                        title="Insert Audio Clip or Podcast"
                    >
                        <Headphones className="h-3.5 w-3.5 text-amber-600" />
                        <span>Audio</span>
                    </button>

                    {/* Infographic Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowInfographicDropdown(!showInfographicDropdown)}
                            className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                            title="Insert Visual Infographics"
                        >
                            <Layers className="h-3.5 w-3.5 text-purple-600" />
                            <span>Infographic</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {showInfographicDropdown && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl bg-white border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] p-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => handleInsertInfographic("stats")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-purple-50 flex items-center gap-2"
                                >
                                    <Sparkles className="h-4 w-4 text-[#3A10E5]" />
                                    <div>
                                        <div className="font-bold text-[#10162F]">Key Stats Grid</div>
                                        <div className="text-[10px] text-gray-500">Fast facts & big metric cards</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInsertInfographic("steps")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-yellow-50 flex items-center gap-2"
                                >
                                    <Layers className="h-4 w-4 text-amber-600" />
                                    <div>
                                        <div className="font-bold text-[#10162F]">Process Roadmap</div>
                                        <div className="text-[10px] text-gray-500">Numbered step-by-step roadmap</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInsertInfographic("compare")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-emerald-50 flex items-center gap-2"
                                >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <div>
                                        <div className="font-bold text-[#10162F]">Comparison Card</div>
                                        <div className="text-[10px] text-gray-500">Side-by-side feature compare</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Chart Inserter */}
                    <button
                        type="button"
                        onClick={() => setShowChartModal(true)}
                        className="p-1.5 rounded hover:bg-[#FFF5EB] text-gray-800 text-xs font-semibold flex items-center gap-1.5 border border-transparent hover:border-[#10162F] transition-all"
                        title="Insert Interactive Chart (Bar, Line, Pie)"
                    >
                        <BarChart2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>Chart</span>
                    </button>

                    {/* Callouts Dropdown */}
                    <div className="relative border-l border-gray-200 pl-1.5 ml-1">
                        <button
                            type="button"
                            onClick={() => setShowCalloutDropdown(!showCalloutDropdown)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-800 text-xs font-semibold flex items-center gap-1"
                            title="Insert Callout Card"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            <span>Callout</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {showCalloutDropdown && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-xl bg-white border-2 border-[#10162F] shadow-[3px_3px_0px_#10162F] p-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => handleInsertCallout("info")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Info className="h-4 w-4 text-[#3A10E5]" />
                                    <span>Informational Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInsertCallout("tip")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-yellow-50 flex items-center gap-2"
                                >
                                    <Lightbulb className="h-4 w-4 text-amber-600" />
                                    <span>Pro Tip Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInsertCallout("warning")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-rose-50 flex items-center gap-2"
                                >
                                    <AlertCircle className="h-4 w-4 text-rose-600" />
                                    <span>Caution / Watch Out</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInsertCallout("exercise")}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-purple-50 flex items-center gap-2"
                                >
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <span>Hands-on Challenge</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lists & Code */}
                    <div className="flex items-center border-l border-gray-200 pl-1.5 ml-1 gap-0.5">
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("-")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
                            title="Bullet List (- item)"
                        >
                            <List className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("1.")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
                            title="Numbered List (1. item)"
                        >
                            <ListOrdered className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertLinePrefix("- [ ]")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700"
                            title="Checklist Item (- [ ] item)"
                        >
                            <CheckSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("\n```javascript\n", "\n```\n", "// Write code here")}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 font-mono text-xs"
                            title="Code Block (```lang)"
                        >
                            {"{ }"}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Dialog: Insert Table */}
            {showTableModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#10162F] rounded-2xl max-w-sm w-full p-5 shadow-[5px_5px_0px_#10162F]">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <div className="flex items-center gap-2 font-bold text-[#10162F]">
                                <TableIcon className="h-4 w-4 text-[#3A10E5]" />
                                <span>Insert Table Grid</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTableModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-md"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Number of Columns
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={tableCols}
                                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm focus:border-[#10162F] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Number of Data Rows
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="15"
                                    value={tableRows}
                                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-sm focus:border-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTableModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertTable}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold"
                            >
                                Insert Table
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Dialog: Insert Image */}
            {showImageModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-[#10162F] rounded-2xl max-w-md w-full p-5 shadow-[5px_5px_0px_#10162F]">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <div className="flex items-center gap-2 font-bold text-[#10162F]">
                                <ImageIcon className="h-4 w-4 text-emerald-600" />
                                <span>Insert Image / Diagram</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowImageModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-md"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Upload from Device
                                </label>
                                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#10162F] rounded-xl cursor-pointer hover:bg-[#FFFDF9] transition-colors">
                                    <Upload className="h-4 w-4 text-gray-600" />
                                    <span className="text-xs font-semibold text-gray-700">
                                        {uploadingImage ? "Uploading image..." : "Choose PNG, JPG, WEBP, or SVG"}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleDirectImageUpload}
                                        disabled={uploadingImage}
                                    />
                                </label>
                            </div>

                            <div className="relative flex items-center justify-center">
                                <div className="border-t border-gray-200 w-full" />
                                <span className="bg-white px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider absolute">
                                    OR PASTE URL
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Image URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/diagram.png"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Caption (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Figure 1: Relational Data Schema"
                                    value={imageCaption}
                                    onChange={(e) => setImageCaption(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Alt Text (Accessibility)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Diagram showing users and orders table"
                                    value={imageAlt}
                                    onChange={(e) => setImageAlt(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>

                            {/* Preview if URL exists */}
                            {imageUrl && (
                                <div className="mt-2 p-2 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center max-h-36 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageUrl} alt="preview" className="max-h-32 object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImageModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertImage}
                                disabled={!imageUrl.trim() || uploadingImage}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold"
                            >
                                Insert into Content
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Code Snippet Modal */}
            {showCodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-2xl border-2 border-[#10162F] bg-white p-6 shadow-[6px_6px_0px_0px_#10162F] space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Code2 className="h-5 w-5 text-[#3A10E5]" />
                                <div>
                                    <h3 className="font-extrabold text-base text-[#10162F]">
                                        Insert Code Snippet
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Paste from ChatGPT, Gemini, or IDE with automatic formatting
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCodeModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                Programming Language
                            </label>
                            <select
                                value={codeSnippetLang}
                                onChange={(e) => setCodeSnippetLang(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-[#10162F] rounded-lg text-xs font-semibold focus:outline-none bg-white"
                            >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="c">C</option>
                                <option value="sql">SQL</option>
                                <option value="bash">Bash / Shell</option>
                                <option value="json">JSON</option>
                                <option value="go">Go</option>
                                <option value="rust">Rust</option>
                                <option value="text">Plain Text</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700 uppercase">
                                    Code Snippet
                                </label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const clipText = await navigator.clipboard.readText()
                                            if (clipText) {
                                                setCodeSnippetText(clipText)
                                                const detected = detectLanguage(clipText)
                                                if (detected) setCodeSnippetLang(detected)
                                            }
                                        } catch {
                                            alert("Please paste using Ctrl+V or Cmd+V directly into the code box")
                                        }
                                    }}
                                    className="text-[11px] text-[#3A10E5] font-bold hover:underline flex items-center gap-1"
                                >
                                    <ClipboardPaste className="h-3.5 w-3.5" />
                                    <span>Paste from Clipboard</span>
                                </button>
                            </div>
                            <textarea
                                rows={8}
                                value={codeSnippetText}
                                onChange={(e) => {
                                    setCodeSnippetText(e.target.value)
                                    const detected = detectLanguage(e.target.value)
                                    if (detected && detected !== codeSnippetLang) {
                                        setCodeSnippetLang(detected)
                                    }
                                }}
                                placeholder={`# Paste your code snippet here...\ndef calculate_area(width, height):\n    return width * height`}
                                className="w-full p-3 font-mono text-xs border-2 border-[#10162F] rounded-xl focus:outline-none bg-[#0D1117] text-[#E6EDF3] leading-relaxed"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCodeModal(false)}
                                className="text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertCodeSnippetFromModal}
                                disabled={!codeSnippetText.trim()}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold text-xs"
                            >
                                Insert Code Snippet
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Inserter Modal */}
            {showVideoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border-2 border-[#10162F] bg-white p-6 shadow-[6px_6px_0px_0px_#10162F] space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-rose-600" />
                                <h3 className="font-extrabold text-base text-[#10162F]">Insert Video</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVideoModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Video URL * (YouTube, Vimeo, MP4)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=... or https://example.com/demo.mp4"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-[#10162F] rounded-lg text-xs font-medium focus:outline-none bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Video Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Introduction to Python Functions"
                                    value={videoTitle}
                                    onChange={(e) => setVideoTitle(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Caption / Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Watch this 10-minute visual breakdown"
                                    value={videoCaption}
                                    onChange={(e) => setVideoCaption(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowVideoModal(false)}
                                className="text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertVideo}
                                disabled={!videoUrl.trim()}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold text-xs"
                            >
                                Insert Video
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audio Inserter Modal */}
            {showAudioModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-2xl border-2 border-[#10162F] bg-white p-6 shadow-[6px_6px_0px_0px_#10162F] space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Headphones className="h-5 w-5 text-amber-600" />
                                <h3 className="font-extrabold text-base text-[#10162F]">Insert Audio Episode</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAudioModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Audio Stream URL * (MP3, WAV, Podcast)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/audio/episode1.mp3"
                                    value={audioUrl}
                                    onChange={(e) => setAudioUrl(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-[#10162F] rounded-lg text-xs font-medium focus:outline-none bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Episode Title (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Episode 1: Python Design Principles"
                                    value={audioTitle}
                                    onChange={(e) => setAudioTitle(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Artist / Host Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. aspirantbook Audio"
                                    value={audioArtist}
                                    onChange={(e) => setAudioArtist(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs focus:border-[#10162F] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAudioModal(false)}
                                className="text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertAudio}
                                disabled={!audioUrl.trim()}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold text-xs"
                            >
                                Insert Audio
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Builder Modal */}
            {showChartModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-2xl border-2 border-[#10162F] bg-white p-6 shadow-[6px_6px_0px_0px_#10162F] space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-blue-600" />
                                <div>
                                    <h3 className="font-extrabold text-base text-[#10162F]">Insert Interactive Chart</h3>
                                    <p className="text-xs text-gray-500">Visual data graphs rendered in Codecademy style</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChartModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Chart Type
                                </label>
                                <select
                                    value={chartType}
                                    onChange={(e) => setChartType(e.target.value as any)}
                                    className="w-full px-3 py-2 border-2 border-[#10162F] rounded-lg text-xs font-bold bg-white focus:outline-none"
                                >
                                    <option value="bar">Bar Chart (Horizontal comparison)</option>
                                    <option value="pie">Pie / Donut (Distribution breakdown)</option>
                                    <option value="line">Line Graph (Timeline trend)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                    Chart Title
                                </label>
                                <input
                                    type="text"
                                    value={chartTitle}
                                    onChange={(e) => setChartTitle(e.target.value)}
                                    placeholder="e.g. Developer Language Popularity"
                                    className="w-full px-3 py-2 border-2 border-[#10162F] rounded-lg text-xs font-semibold focus:outline-none bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-gray-700 uppercase">
                                    Data Points (Labels & Values)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setChartRows([...chartRows, { label: `Item ${chartRows.length + 1}`, value: "10" }])}
                                    className="text-xs font-bold text-[#3A10E5] hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Row</span>
                                </button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {chartRows.map((row, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={row.label}
                                            onChange={(e) => {
                                                const updated = [...chartRows]
                                                updated[idx].label = e.target.value
                                                setChartRows(updated)
                                            }}
                                            placeholder="Label (e.g. Python)"
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:border-[#10162F] focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={row.value}
                                            onChange={(e) => {
                                                const updated = [...chartRows]
                                                updated[idx].value = e.target.value
                                                setChartRows(updated)
                                            }}
                                            placeholder="Value"
                                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-semibold focus:border-[#10162F] focus:outline-none"
                                        />
                                        {chartRows.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setChartRows(chartRows.filter((_, i) => i !== idx))}
                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowChartModal(false)}
                                className="text-xs font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleInsertChart}
                                className="bg-[#3A10E5] hover:bg-[#320ec2] text-white font-bold text-xs"
                            >
                                Insert Chart
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area: Edit, Preview, or Split */}
            <div className="relative">
                {/* 1. Edit Mode */}
                {viewMode === "edit" && (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        disabled={disabled}
                        style={{ minHeight }}
                        className="w-full p-4 font-mono text-sm leading-relaxed bg-[#FFFDF9] text-gray-900 focus:outline-none resize-y border-none"
                    />
                )}

                {/* 2. Live Preview Mode */}
                {viewMode === "preview" && (
                    <div
                        style={{ minHeight }}
                        className="p-6 sm:p-8 bg-[#FFF8F0] overflow-y-auto max-h-[700px] border-none"
                    >
                        <div className="max-w-3xl mx-auto">
                            {renderCodecademyPreview(value)}
                        </div>
                    </div>
                )}

                {/* 3. Split View Mode */}
                {viewMode === "split" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-[#10162F]">
                        <div className="flex flex-col">
                            <div className="px-3 py-1 bg-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b">
                                Editor (Markdown & HTML)
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                onPaste={handlePaste}
                                placeholder={placeholder}
                                disabled={disabled}
                                style={{ minHeight }}
                                className="w-full flex-1 p-4 font-mono text-xs sm:text-sm leading-relaxed bg-[#FFFDF9] text-gray-900 focus:outline-none resize-y border-none"
                            />
                        </div>
                        <div className="flex flex-col bg-[#FFF8F0]">
                            <div className="px-3 py-1 bg-[#FFF5EB] text-[11px] font-bold text-[#3A10E5] uppercase tracking-wider border-b border-[#10162F]">
                                Live Codecademy Preview
                            </div>
                            <div
                                style={{ minHeight }}
                                className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[600px]"
                            >
                                {renderCodecademyPreview(value)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Status / Helper Bar */}
            <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-[11px] text-gray-500">
                <div className="flex items-center gap-3">
                    <span>{value ? value.length : 0} characters</span>
                    <span>•</span>
                    <span>{value && value.trim() ? value.trim().split(/\s+/).length : 0} words</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-gray-400">
                    <span>Markdown + HTML supported</span>
                    <span>•</span>
                    <span>Codecademy Theme Active</span>
                </div>
            </div>
        </div>
    )
}
