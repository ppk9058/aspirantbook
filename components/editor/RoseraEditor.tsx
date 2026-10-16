"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Send,
  Eye,
  Columns,
  Code2,
  FileText,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Table as TableIcon,
  BarChart3,
  Layers,
  ArrowRight,
  ImageIcon,
  Check,
  Undo2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Type,
  Heading2 as Heading2Icon,
  Heading3 as Heading3Icon,
  List as ListIcon,
  Code as CodeIcon,
  History,
  RotateCcw,
  Terminal,
  FileJson,
  Layout,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RoseraRenderer, parseRoseraBlocks } from "./RoseraRenderer"
import {
  saveLessonDraft,
  publishLessonVersion,
  restoreLessonVersion,
  getLessonBlocksAndVersions,
} from "@/lib/actions/admin/lessons"

function generateId(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return "b_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36)
}

export interface EditorBlock {
  bid: string
  t: string
  [key: string]: any
}

export interface RoseraEditorProps {
  lessonId?: string
  chapterId?: string
  courseId?: string
  title?: string
  initialContent?: string | any
  initialBlocks?: EditorBlock[]
  initialHasDraft?: boolean
  initialPublishedVersionId?: string | null
  initialDraftVersionId?: string | null
  breadcrumb?: string[]
  onSave?: (content: string) => Promise<void> | void
  onSaved?: () => void
  onCancel?: () => void
  onClose?: () => void
}

const BLOCK_TYPES = [
  { type: "h2", label: "Heading 2", desc: "Main section header with pill styling", icon: Heading2Icon },
  { type: "sub", label: "Subheading", desc: "Subsection subheading", icon: Heading3Icon },
  { type: "p", label: "Paragraph", desc: "Text with ==highlight==, **bold**, and `code`", icon: Type },
  { type: "code", label: "Code Snippet", desc: "Interactive syntax-highlighted code block", icon: Code2 },
  { type: "callout", label: "Callout Box", desc: "Tip, Warning, or Information note", icon: Lightbulb },
  { type: "quiz", label: "Interactive Quiz", desc: "Self-check question with options & explanation", icon: HelpCircle },
  { type: "flow", label: "Architecture Flow", desc: "Multi-step horizontal process boxes", icon: ArrowRight },
  { type: "infographic", label: "Infographic Grid", desc: "Card grid with emojis and explanations", icon: Layers },
  { type: "table", label: "Comparison Table", desc: "Structured data table with columns and rows", icon: TableIcon },
  { type: "chart", label: "Horizontal Chart", desc: "Proportional metric bars with values", icon: BarChart3 },
  { type: "image", label: "Image / Diagram", desc: "Visual image with caption", icon: ImageIcon },
  { type: "list", label: "Bullet List", desc: "Unordered list of items", icon: ListIcon },
  { type: "html", label: "Raw HTML / SVG", desc: "Custom HTML or SVG embed block", icon: CodeIcon },
]

function normalizeIncomingBlocks(initialBlocks?: EditorBlock[], initialContent?: string | any): EditorBlock[] {
  if (initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length > 0) {
    return initialBlocks.map((b) => ({
      ...b,
      bid: b.bid || generateId(),
      t: b.t || b.type || "p",
      x: b.x !== undefined ? b.x : b.content || "",
    }))
  }

  if (initialContent) {
    if (typeof initialContent === "object") {
      const arr = Array.isArray(initialContent)
        ? initialContent
        : initialContent.blocks || [initialContent]
      return arr.map((b: any) => ({
        ...b,
        bid: b.bid || generateId(),
        t: b.t || b.type || "p",
        x: b.x !== undefined ? b.x : b.content || "",
      }))
    }

    const trimmed = String(initialContent).trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed)
        const arr = Array.isArray(parsed) ? parsed : parsed.blocks || [parsed]
        return arr.map((b: any) => ({
          ...b,
          bid: b.bid || generateId(),
          t: b.t || b.type || "p",
          x: b.x !== undefined ? b.x : b.content || "",
        }))
      } catch {
        // fallback
      }
    }

    const roseraParsed = parseRoseraBlocks(initialContent)
    if (roseraParsed && roseraParsed.length > 0) {
      return roseraParsed.map((rb: any) => {
        const t = rb.type === "subheading" ? (rb.level === 3 ? "sub" : "h2") : rb.type || "p"
        return {
          bid: generateId(),
          t,
          x: rb.content || rb.x || "",
          ...rb,
        }
      })
    }
  }

  return [{ bid: generateId(), t: "p", x: "Start writing with Rosera Editor..." }]
}

export function RoseraEditor({
  lessonId,
  chapterId,
  courseId,
  title = "Rosera Lesson Studio",
  initialContent,
  initialBlocks,
  initialHasDraft = false,
  initialPublishedVersionId = null,
  initialDraftVersionId = null,
  breadcrumb = ["Tutorial Studio", "Rosera Editor"],
  onSave,
  onSaved,
  onCancel,
  onClose,
}: RoseraEditorProps) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    normalizeIncomingBlocks(initialBlocks, initialContent)
  )

  const [rawJson, setRawJson] = useState<string>(() => {
    const initial = normalizeIncomingBlocks(initialBlocks, initialContent)
    return JSON.stringify(initial, null, 2)
  })

  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview" | "json">("split")
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [hasDraft, setHasDraft] = useState(initialHasDraft)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [deletedBlockHistory, setDeletedBlockHistory] = useState<{ block: EditorBlock; index: number } | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Version History State
  const [showVersionsModal, setShowVersionsModal] = useState(false)
  const [versionHistoryList, setVersionHistoryList] = useState<any[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isRestoringVersion, setIsRestoringVersion] = useState(false)

  // Keep rawJson synced whenever blocks change in visual mode
  const syncBlocks = (newBlocks: EditorBlock[]) => {
    setBlocks(newBlocks)
    setRawJson(JSON.stringify(newBlocks, null, 2))
    setIsDirty(true)
    setHasDraft(true)
  }

  // Raw JSON Studio actions
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(rawJson)
      const arr = Array.isArray(parsed) ? parsed : parsed.blocks || [parsed]
      const normalized = arr.map((b: any) => ({
        ...b,
        bid: b.bid || generateId(),
        t: b.t || b.type || "p",
        x: b.x !== undefined ? b.x : b.content || "",
      }))
      setBlocks(normalized)
      setJsonError(null)
      setIsDirty(true)
      setHasDraft(true)
      toast.success(`Loaded ${normalized.length} blocks from JSON!`)
      setViewMode("split")
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax")
      toast.error("JSON Error: " + err.message)
    }
  }

  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(rawJson)
      setRawJson(JSON.stringify(parsed, null, 2))
      setJsonError(null)
      toast.success("JSON prettified!")
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax")
    }
  }

  // Version history
  const fetchVersions = async () => {
    if (!lessonId) return
    setIsLoadingVersions(true)
    try {
      const res = await getLessonBlocksAndVersions(lessonId)
      setVersionHistoryList(res?.versions || [])
    } catch {
      toast.error("Could not fetch version history")
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleRestoreVersion = async (ver: any) => {
    if (!lessonId) return
    if (
      !confirm(
        `Restore version from ${new Date(ver.createdAt).toLocaleString()}? This will create a new draft without overwriting your live content.`
      )
    ) {
      return
    }
    setIsRestoringVersion(true)
    try {
      const res = await restoreLessonVersion(ver.id)
      const restoredBlocks = (res.blocks as any[]) || []
      const normalized = restoredBlocks.map((b: any) => ({
        ...b,
        bid: b.bid || generateId(),
        t: b.t || b.type || "p",
        x: b.x !== undefined ? b.x : b.content || "",
      }))
      syncBlocks(normalized)
      setHasDraft(true)
      setIsDirty(false)
      setShowVersionsModal(false)
      toast.success("Version restored into draft! Review and click 'Publish' when ready.")
      if (onSaved) onSaved()
    } catch (err: any) {
      toast.error(err.message || "Failed to restore version")
    } finally {
      setIsRestoringVersion(false)
    }
  }

  // Update a single block
  const updateBlock = (index: number, updatedFields: Partial<EditorBlock>) => {
    const next = [...blocks]
    next[index] = { ...next[index], ...updatedFields }
    syncBlocks(next)
  }

  // Add block
  const handleAddBlock = (type: string, atIndex: number) => {
    const bid = generateId()
    let newBlock: EditorBlock = { bid, t: type }

    switch (type) {
      case "h2":
        newBlock = { bid, t: "h2", x: "New Section Heading" }
        break
      case "sub":
        newBlock = { bid, t: "sub", x: "1. Key Concept Subsection" }
        break
      case "p":
        newBlock = { bid, t: "p", x: "Write your paragraph here. Use ==yellow highlight== or **bold** text." }
        break
      case "code":
        newBlock = {
          bid,
          t: "code",
          lang: "python",
          title: "main.py",
          x: "# Enter python code snippet\nprint('Hello from Rosera!')",
        }
        break
      case "callout":
        newBlock = { bid, t: "callout", k: "tip", x: "**Pro Tip:** Clear instructions ensure deterministic output." }
        break
      case "quiz":
        newBlock = {
          bid,
          t: "quiz",
          q: "What is the primary function of an LLM tokenizer?",
          o: ["Break text into numerical token IDs", "Compress images into vectors", "Translate speech to text"],
          a: 0,
          why: "Tokenizers decompose text into discrete vocabulary tokens for the neural network.",
        }
        break
      case "flow":
        newBlock = {
          bid,
          t: "flow",
          steps: [
            ["Step 1", "Input prompt text"],
            ["Step 2", "Tokenizer encoding"],
            ["Step 3", "Model generation"],
          ],
        }
        break
      case "infographic":
        newBlock = {
          bid,
          t: "infographic",
          items: [
            ["🎯", "Accuracy", "Reliable factuality in output"],
            ["⚡", "Latency", "Low Time-To-First-Token"],
            ["💰", "Cost", "Token budget optimization"],
          ],
        }
        break
      case "table":
        newBlock = {
          bid,
          t: "table",
          h: ["Framework", "Strengths", "Use Case"],
          r: [
            ["LangChain", "Rich tool ecosystem", "Enterprise agents"],
            ["LlamaIndex", "Deep indexing & RAG", "Data pipelines"],
          ],
        }
        break
      case "chart":
        newBlock = {
          bid,
          t: "chart",
          title: "Model Benchmark Latency (ms)",
          d: [
            ["Gemini 2.5 Flash", 120],
            ["Claude 3.5 Sonnet", 240],
            ["GPT-4o", 280],
          ],
        }
        break
      case "image":
        newBlock = {
          bid,
          t: "image",
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
          alt: "System Architecture Diagram",
          caption: "Figure 1: High level pipeline visualization",
        }
        break
      case "list":
        newBlock = {
          bid,
          t: "list",
          items: ["Understand key architectural patterns", "Implement deterministic JSON schemas", "Deploy to cloud runner"],
        }
        break
      case "html":
        newBlock = {
          bid,
          t: "html",
          x: `<div class="p-4 bg-indigo-50 border-2 border-indigo-500 rounded-xl font-mono text-xs text-indigo-900">\n  <!-- Custom Embed / SVG -->\n  <p>Custom Rosera Embed Block</p>\n</div>`,
        }
        break
      default:
        newBlock = { bid, t: "p", x: "Content..." }
    }

    const next = [...blocks]
    next.splice(atIndex, 0, newBlock)
    syncBlocks(next)
    setActivePickerIndex(null)
    toast.success(`Added ${type.toUpperCase()} block!`)
  }

  const handleDeleteBlock = (index: number) => {
    const targetBlock = blocks[index]
    setDeletedBlockHistory({ block: targetBlock, index })
    const next = blocks.filter((_, i) => i !== index)
    syncBlocks(next)

    toast("Block removed", {
      action: {
        label: "Undo",
        onClick: () => {
          const restored = [...next]
          restored.splice(index, 0, targetBlock)
          syncBlocks(restored)
          setDeletedBlockHistory(null)
          toast.success("Block restored!")
        },
      },
    })
  }

  const handleDuplicateBlock = (index: number) => {
    const target = blocks[index]
    const cloned = JSON.parse(JSON.stringify(target))
    cloned.bid = generateId()
    const next = [...blocks]
    next.splice(index + 1, 0, cloned)
    syncBlocks(next)
    toast.success("Block duplicated!")
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const next = [...blocks]
    const temp = next[index]
    next[index] = next[index - 1]
    next[index - 1] = temp
    syncBlocks(next)
  }

  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1) return
    const next = [...blocks]
    const temp = next[index]
    next[index] = next[index + 1]
    next[index + 1] = temp
    syncBlocks(next)
  }

  // Save draft action
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true)
    try {
      if (lessonId) {
        await saveLessonDraft(lessonId, blocks, "Saved from Rosera Editor")
      }
      if (onSave) {
        await onSave(JSON.stringify({ blocks }))
      }
      setIsDirty(false)
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setLastSavedTime(now)
      toast.success(`Draft saved! (${now})`)
      if (onSaved) onSaved()
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft")
    } finally {
      setIsSaving(false)
    }
  }, [lessonId, blocks, onSave, onSaved])

  // Publish live action
  const handlePublish = useCallback(async () => {
    setIsPublishing(true)
    try {
      if (lessonId) {
        await publishLessonVersion(lessonId, blocks, "Published live from Rosera Editor")
      }
      if (onSave) {
        await onSave(JSON.stringify({ blocks }))
      }
      setIsDirty(false)
      setHasDraft(false)
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setLastSavedTime(now)
      toast.success(`Lesson published live! (${now})`)
      if (onSaved) onSaved()
    } catch (err: any) {
      toast.error(err.message || "Failed to publish lesson")
    } finally {
      setIsPublishing(false)
    }
  }, [lessonId, blocks, onSave, onSaved])

  // Autosave every 15s if dirty and database-backed
  useEffect(() => {
    if (!isDirty || !lessonId) return
    const timer = setInterval(() => {
      handleSaveDraft()
    }, 15000)
    return () => clearInterval(timer)
  }, [isDirty, lessonId, handleSaveDraft])

  // Keyboard shortcuts (Cmd/Ctrl+S -> save draft, Cmd/Ctrl+Enter -> publish, Esc -> close picker)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSaveDraft()
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handlePublish()
      } else if (e.key === "Escape") {
        setActivePickerIndex(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSaveDraft, handlePublish])

  // Map blocks to Rosera format for Live Preview pane
  const roseraBlocks = React.useMemo(() => {
    return blocks.map((b) => {
      switch (b.t) {
        case "h2":
          return { type: "subheading", level: 2, content: b.x }
        case "sub":
          return { type: "subheading", level: 3, content: b.x }
        case "p":
          return { type: "paragraph", content: b.x }
        case "code":
          return {
            type: "code",
            codeSnippet: {
              language: b.lang || "python",
              filename: b.title || "main.py",
              code: b.x || "",
              runnable: true,
            },
          }
        case "callout":
          return { type: "callout", calloutType: b.k || "tip", content: b.x }
        case "quiz":
          return {
            type: "quiz",
            quiz: {
              question: b.q,
              options: b.o || [],
              correctIndex: b.a || 0,
              explanation: b.why || "",
            },
          }
        case "flow":
          return { type: "flow", steps: b.steps || [] }
        case "infographic":
          return { type: "infographic", items: b.items || [] }
        case "table":
          return { type: "table", table: { headers: b.h || [], rows: b.r || [] } }
        case "chart":
          return { type: "chart", title: b.title || "", d: b.d || [] }
        case "image":
          return {
            type: "paragraph",
            content: `![${b.alt || "Image"}](${b.src})\n*${b.caption || ""}*`,
          }
        case "html":
          return { type: "html", content: b.x }
        default:
          return { type: "paragraph", content: b.x || JSON.stringify(b) }
      }
    })
  }, [blocks])

  const handleCloseTrigger = onClose || onCancel

  return (
    <div className="border-2 border-[#10162F] rounded-3xl bg-[#FFFDF9] shadow-[6px_6px_0px_#10162F] overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in-50 duration-200">
      {/* Top Header Bar */}
      <div className="p-4 bg-[#10162F] text-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#3A10E5] text-white flex items-center justify-center font-black border border-white/20">
            <Sparkles className="h-4 w-4 text-[#FFD15C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#FFD15C] uppercase tracking-wider">🌹 Rosera Editor</span>
              <span className="text-gray-400 text-xs hidden sm:inline">&bull;</span>
              <h2 className="text-sm font-black text-white truncate max-w-sm">{title}</h2>
              {lessonId && (
                hasDraft ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FFD15C] text-black border border-black">
                    Draft
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white border border-white/30">
                    Live
                  </span>
                )
              )}
            </div>
            <p className="text-[11px] text-gray-300">
              {blocks.length} fluid blocks &bull; {lastSavedTime ? `Saved at ${lastSavedTime}` : "Autosaves continuously"}
            </p>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="bg-white/10 rounded-xl p-0.5 flex items-center border border-white/10 text-xs">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === "edit" ? "bg-white text-black shadow-xs" : "text-gray-300 hover:text-white"
              }`}
            >
              Blocks
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === "split" ? "bg-white text-black shadow-xs" : "text-gray-300 hover:text-white"
              }`}
            >
              <Columns className="h-3 w-3" />
              Split
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === "preview" ? "bg-white text-black shadow-xs" : "text-gray-300 hover:text-white"
              }`}
            >
              <Eye className="h-3 w-3" />
              Learner Canvas
            </button>
            <button
              onClick={() => setViewMode("json")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === "json" ? "bg-[#3A10E5] text-white shadow-xs" : "text-gray-300 hover:text-white"
              }`}
            >
              <FileJson className="h-3 w-3 text-[#FFD15C]" />
              LLM JSON
            </button>
          </div>

          {/* Version History Button (Database mode) */}
          {lessonId && (
            <button
              onClick={() => {
                fetchVersions()
                setShowVersionsModal(true)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition-colors"
              title="View Lesson Version History & Audit Trail"
            >
              <History className="h-3.5 w-3.5 text-[#FFD15C]" />
              <span className="hidden sm:inline">Versions</span>
            </button>
          )}

          {/* Save Draft Button */}
          <Button
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="border border-white/30 bg-white/20 hover:bg-white/30 text-white text-xs font-bold"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Draft (⌘S)
          </Button>

          {/* Publish Button */}
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="border-2 border-[#10162F] bg-[#0E9F78] hover:bg-[#0b8463] text-white text-xs font-extrabold shadow-[2px_2px_0px_#10162F]"
          >
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Publish (⌘⏎)
          </Button>

          {handleCloseTrigger && (
            <button
              onClick={handleCloseTrigger}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              title="Close editor (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Draft Warning Banner */}
      {hasDraft && lessonId && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-xs text-amber-900 font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0" />
            <span>
              <strong>Unpublished changes present.</strong> Students see the published version until you click &quot;Publish&quot;.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublish}
              className="px-2.5 py-1 bg-amber-900 text-white rounded-lg text-[11px] font-bold hover:bg-black transition-colors"
            >
              Publish Now
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Direct LLM JSON Studio Mode */}
        {viewMode === "json" && (
          <div className="flex-1 p-4 sm:p-6 bg-[#0D1117] text-white flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Direct LLM JSON Studio
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                  Paste JSON directly from ChatGPT, Claude, Gemini, or DeepSeek
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrettifyJson}
                  className="bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 text-xs font-bold"
                >
                  Format / Prettify
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyJson}
                  className="bg-[#0E9F78] hover:bg-[#0b8463] text-white text-xs font-bold"
                >
                  Apply to Studio Canvas
                </Button>
              </div>
            </div>

            {jsonError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value)
                  setJsonError(null)
                }}
                spellCheck={false}
                placeholder="[ { &quot;t&quot;: &quot;h2&quot;, &quot;x&quot;: &quot;Section Title&quot; }, ... ]"
                className="w-full h-full p-4 font-mono text-xs sm:text-sm bg-[#161B22] text-[#E6EDF3] rounded-2xl border border-gray-800 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Visual Block Cards Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div
            className={`overflow-y-auto p-4 sm:p-6 space-y-4 ${
              viewMode === "split" ? "w-full lg:w-1/2 border-r-2 border-gray-200" : "w-full"
            }`}
          >
            {/* Top Add Block Button */}
            <div className="relative group text-center py-1">
              <button
                onClick={() => setActivePickerIndex(0)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-gray-400 bg-white hover:border-[#3A10E5] hover:text-[#3A10E5] text-xs font-bold text-gray-600 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Add block at top
              </button>
              {activePickerIndex === 0 && (
                <BlockTypePicker onSelect={(t) => handleAddBlock(t, 0)} onClose={() => setActivePickerIndex(null)} />
              )}
            </div>

            {/* Block Cards List */}
            {blocks.map((block, index) => (
              <React.Fragment key={block.bid}>
                <BlockCard
                  block={block}
                  index={index}
                  totalBlocks={blocks.length}
                  onChange={(fields) => updateBlock(index, fields)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDuplicate={() => handleDuplicateBlock(index)}
                  onDelete={() => handleDeleteBlock(index)}
                />

                {/* Add Block Between Divider */}
                <div className="relative group my-2 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-gray-300" />
                  </div>
                  <div className="relative inline-block">
                    <button
                      onClick={() => setActivePickerIndex(index + 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-gray-300 hover:border-[#3A10E5] hover:text-[#3A10E5] text-[11px] font-bold text-gray-500 shadow-2xs transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      Add Block
                    </button>
                  </div>
                  {activePickerIndex === index + 1 && (
                    <BlockTypePicker
                      onSelect={(t) => handleAddBlock(t, index + 1)}
                      onClose={() => setActivePickerIndex(null)}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Live Learner View Preview Pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={`overflow-y-auto p-4 sm:p-6 bg-[#F5F9FF] ${
              viewMode === "split" ? "hidden lg:block lg:w-1/2" : "w-full"
            }`}
          >
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b pb-2 text-xs font-bold text-[#1F2A6B]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Eye className="h-3.5 w-3.5 text-[#3B2FD6]" />
                  Live Learner View Preview
                </span>
                <span className="text-[10px] text-gray-500 font-normal">Real-time Rosera components</span>
              </div>

              {/* Exact Live Rosera Rendering */}
              <RoseraRenderer content={roseraBlocks} />
            </div>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {showVersionsModal && lessonId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#10162F] shadow-[8px_8px_0px_#10162F] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-[#10162F] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#FFD15C]" />
                <h3 className="font-extrabold text-sm sm:text-base">Lesson Version History &amp; Audit Trail</h3>
              </div>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#FDFBF7]">
              <p className="text-xs text-gray-600 font-medium">
                Every import and save is recorded as an immutable version. Restoring a version creates a new working draft so learners never experience disruption.
              </p>

              {isLoadingVersions ? (
                <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#3A10E5]" />
                  Loading version history...
                </div>
              ) : versionHistoryList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-xl border">
                  No previous versions recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {versionHistoryList.map((ver) => {
                    const isPublished = ver.status === "published"
                    const blockCount = Array.isArray(ver.blocks) ? ver.blocks.length : 0
                    const createdDate = new Date(ver.createdAt).toLocaleString()

                    return (
                      <div
                        key={ver.id}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                          isPublished
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-white border-gray-200 text-gray-900"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isPublished
                                  ? "bg-emerald-600 text-white"
                                  : "bg-gray-100 text-gray-800 border border-gray-300"
                              }`}
                            >
                              {ver.status}
                            </span>
                            <span className="text-xs font-bold text-gray-700">Source: {ver.source}</span>
                            {ver.needsReview && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-400">
                                Needs Review
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            {createdDate} &bull; {blockCount} blocks &bull; Note: &quot;{ver.note || "No note"}&quot;
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRestoringVersion}
                          onClick={() => handleRestoreVersion(ver)}
                          className="border-2 border-[#10162F] text-xs font-bold shadow-[1.5px_1.5px_0px_#10162F] flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3 w-3 text-[#3A10E5]" />
                          Restore Draft
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// INDIVIDUAL BLOCK CARD COMPONENT
// -------------------------------------------------------------
interface BlockCardProps {
  block: EditorBlock
  index: number
  totalBlocks: number
  onChange: (fields: Partial<EditorBlock>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function BlockCard({
  block,
  index,
  totalBlocks,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: BlockCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const blockMeta = BLOCK_TYPES.find((b) => b.type === block.t) || {
    label: block.t?.toUpperCase() || "BLOCK",
    icon: Type,
  }
  const Icon = blockMeta.icon

  // Inline formatting helper for ==highlight==, **bold**, `code`
  const applyInlineFormatting = (wrapper: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const current = block.x || ""
    const selected = current.substring(start, end)
    const replacement = `${wrapper}${selected || "text"}${wrapper}`
    const nextVal = current.substring(0, start) + replacement + current.substring(end)
    onChange({ x: nextVal })

    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + wrapper.length, start + wrapper.length + (selected ? selected.length : 4))
    }, 50)
  }

  return (
    <div className="group border-2 border-[#10162F] rounded-2xl bg-white shadow-[3px_3px_0px_#10162F] hover:shadow-[4px_4px_0px_#10162F] transition-all overflow-hidden">
      {/* Card Header */}
      <div className="bg-[#FFFDF9] px-3.5 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-[#10162F] text-white flex items-center justify-center text-[10px] font-black">
            {index + 1}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-xs text-[#10162F]">
            <Icon className="h-3.5 w-3.5 text-[#3A10E5]" />
            <span>{blockMeta.label}</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">bid: {block.bid?.substring(0, 6)}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded-md text-gray-500 hover:text-black hover:bg-gray-200 disabled:opacity-30"
            title="Move up (Alt+Up)"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index >= totalBlocks - 1}
            className="p-1 rounded-md text-gray-500 hover:text-black hover:bg-gray-200 disabled:opacity-30"
            title="Move down (Alt+Down)"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 rounded-md text-gray-500 hover:text-black hover:bg-gray-200"
            title="Duplicate block"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-md text-rose-600 hover:bg-rose-100"
            title="Delete block (Soft undo)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-3">
        {/* Paragraph / Heading / Subheading */}
        {(block.t === "p" || block.t === "h2" || block.t === "sub") && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs pb-1 border-b border-gray-100 flex-wrap">
              <button
                type="button"
                onClick={() => applyInlineFormatting("==")}
                className="px-2 py-0.5 rounded bg-[#FFE066] border border-[#10162F] text-[11px] font-black text-[#10162F] shadow-2xs hover:bg-[#ffd133]"
                title="Highlight text in yellow (==highlight==)"
              >
                ==Highlight==
              </button>
              <button
                type="button"
                onClick={() => applyInlineFormatting("**")}
                className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[11px] font-bold text-black border border-gray-300"
                title="Bold text (**bold**)"
              >
                **Bold**
              </button>
              <button
                type="button"
                onClick={() => applyInlineFormatting("`")}
                className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-[11px] font-mono font-bold text-purple-900 border border-purple-300"
                title="Inline Code (`code`)"
              >
                `code`
              </button>
            </div>
            <textarea
              ref={textareaRef}
              rows={block.t === "p" ? 3 : 1}
              value={block.x || ""}
              onChange={(e) => onChange({ x: e.target.value })}
              placeholder={
                block.t === "h2"
                  ? "Section Heading text..."
                  : block.t === "sub"
                  ? "Subsection title..."
                  : "Write paragraph text. Use ==yellow highlight== or **bold**..."
              }
              className={`w-full p-2.5 rounded-xl border border-gray-300 text-xs text-[#10162F] focus:outline-none focus:ring-2 focus:ring-[#3A10E5] ${
                block.t === "h2" ? "font-black text-sm" : block.t === "sub" ? "font-bold text-emerald-800" : ""
              }`}
            />
          </div>
        )}

        {/* Code Snippet Block */}
        {block.t === "code" && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Language</label>
                <select
                  value={block.lang || "python"}
                  onChange={(e) => onChange({ lang: e.target.value })}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-bold"
                >
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="bash">Bash / Terminal</option>
                  <option value="sql">SQL</option>
                  <option value="json">JSON</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="cpp">C++</option>
                  <option value="rust">Rust</option>
                  <option value="go">Go</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Filename / Title</label>
                <input
                  type="text"
                  value={block.title || ""}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="e.g. prompt_template.py"
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Code Body</label>
              <textarea
                rows={5}
                value={block.x || ""}
                onChange={(e) => onChange({ x: e.target.value })}
                placeholder="Write or paste runnable code..."
                className="w-full mt-1 p-2.5 rounded-xl border border-gray-300 bg-[#26338A] text-[#EAF1FF] font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Callout Box */}
        {block.t === "callout" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-gray-500">Type:</label>
              <select
                value={block.k || "tip"}
                onChange={(e) => onChange({ k: e.target.value })}
                className="px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold"
              >
                <option value="tip">💡 Tip (Green Accent)</option>
                <option value="warn">⚠️ Warning (Red Accent)</option>
                <option value="info">ℹ️ Note / Info (Blue Accent)</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={block.x || ""}
              onChange={(e) => onChange({ x: e.target.value })}
              placeholder="Callout guidance or tip text..."
              className="w-full p-2.5 rounded-xl border border-gray-300 text-xs"
            />
          </div>
        )}

        {/* Quiz Block */}
        {block.t === "quiz" && (
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Question</label>
              <input
                type="text"
                value={block.q || ""}
                onChange={(e) => onChange({ q: e.target.value })}
                placeholder="Question title..."
                className="w-full mt-0.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-gray-500">Options (Select correct answer)</label>
              {(block.o || []).map((opt: string, optIdx: number) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`quiz_answer_${block.bid}`}
                    checked={block.a === optIdx}
                    onChange={() => onChange({ a: optIdx })}
                    className="h-4 w-4 accent-[#0E9F78]"
                    title="Mark this option as correct"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const nextO = [...(block.o || [])]
                      nextO[optIdx] = e.target.value
                      onChange({ o: nextO })
                    }}
                    placeholder={`Option ${optIdx + 1}...`}
                    className="flex-1 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                  />
                  <button
                    onClick={() => {
                      const nextO = (block.o || []).filter((_: any, idx: number) => idx !== optIdx)
                      onChange({ o: nextO, a: Math.min(block.a || 0, Math.max(0, nextO.length - 1)) })
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600"
                    title="Remove option"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({ o: [...(block.o || []), `New Option ${(block.o?.length || 0) + 1}`] })}
                className="text-[11px] font-bold text-[#3A10E5] hover:underline flex items-center gap-1 pt-1"
              >
                <Plus className="h-3 w-3" /> Add Option
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Explanation</label>
              <input
                type="text"
                value={block.why || ""}
                onChange={(e) => onChange({ why: e.target.value })}
                placeholder="Why is this answer correct?"
                className="w-full mt-0.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs"
              />
            </div>
          </div>
        )}

        {/* Table Block */}
        {block.t === "table" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-600">
              <span>Headers (Columns):</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const nextH = [...(block.h || []), `Col ${(block.h?.length || 0) + 1}`]
                    const nextR = (block.r || []).map((row: string[]) => [...row, ""])
                    onChange({ h: nextH, r: nextR })
                  }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold"
                >
                  + Add Col
                </button>
                <button
                  onClick={() => {
                    const nextR = [...(block.r || []), (block.h || []).map(() => "")]
                    onChange({ r: nextR })
                  }}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] font-bold"
                >
                  + Add Row
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center gap-1 font-bold">
                {(block.h || []).map((header: string, hIdx: number) => (
                  <input
                    key={hIdx}
                    type="text"
                    value={header}
                    onChange={(e) => {
                      const nextH = [...(block.h || [])]
                      nextH[hIdx] = e.target.value
                      onChange({ h: nextH })
                    }}
                    className="flex-1 px-2 py-1 rounded bg-[#E4EFFF] text-[#1F2A6B] text-xs font-bold border border-sky-300 min-w-[100px]"
                  />
                ))}
              </div>

              {(block.r || []).map((row: string[], rIdx: number) => (
                <div key={rIdx} className="flex items-center gap-1">
                  {row.map((cell: string, cIdx: number) => (
                    <input
                      key={cIdx}
                      type="text"
                      value={cell}
                      onChange={(e) => {
                        const nextR = JSON.parse(JSON.stringify(block.r || []))
                        nextR[rIdx][cIdx] = e.target.value
                        onChange({ r: nextR })
                      }}
                      className="flex-1 px-2 py-1 rounded bg-white text-xs border border-gray-300 min-w-[100px]"
                    />
                  ))}
                  <button
                    onClick={() => {
                      const nextR = (block.r || []).filter((_: any, idx: number) => idx !== rIdx)
                      onChange({ r: nextR })
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600"
                    title="Remove row"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart Block */}
        {block.t === "chart" && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Chart Title</label>
              <input
                type="text"
                value={block.title || ""}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Chart title..."
                className="w-full mt-0.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-gray-500">Data Points [Label, Value]</label>
              {(block.d || []).map((point: [string, number], dIdx: number) => (
                <div key={dIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={point[0] || ""}
                    onChange={(e) => {
                      const nextD = JSON.parse(JSON.stringify(block.d || []))
                      nextD[dIdx][0] = e.target.value
                      onChange({ d: nextD })
                    }}
                    placeholder="Label"
                    className="flex-1 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                  />
                  <input
                    type="number"
                    value={point[1] || 0}
                    onChange={(e) => {
                      const nextD = JSON.parse(JSON.stringify(block.d || []))
                      nextD[dIdx][1] = Number(e.target.value)
                      onChange({ d: nextD })
                    }}
                    placeholder="Value"
                    className="w-24 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                  />
                  <button
                    onClick={() => {
                      const nextD = (block.d || []).filter((_: any, idx: number) => idx !== dIdx)
                      onChange({ d: nextD })
                    }}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onChange({ d: [...(block.d || []), ["New Metric", 50]] })}
                className="text-[11px] font-bold text-[#3A10E5] hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Data Point
              </button>
            </div>
          </div>
        )}

        {/* Infographic Block */}
        {block.t === "infographic" && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-500">Cards [Icon/Emoji, Title, Description]</label>
            {(block.items || []).map((item: [string, string, string], iIdx: number) => (
              <div key={iIdx} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-200">
                <input
                  type="text"
                  value={item[0] || "⚡"}
                  onChange={(e) => {
                    const nextItems = JSON.parse(JSON.stringify(block.items || []))
                    nextItems[iIdx][0] = e.target.value
                    onChange({ items: nextItems })
                  }}
                  className="w-12 text-center px-1 py-1 rounded bg-white border border-gray-300 text-base"
                  title="Emoji or icon"
                />
                <input
                  type="text"
                  value={item[1] || ""}
                  onChange={(e) => {
                    const nextItems = JSON.parse(JSON.stringify(block.items || []))
                    nextItems[iIdx][1] = e.target.value
                    onChange({ items: nextItems })
                  }}
                  placeholder="Card Title"
                  className="w-32 px-2 py-1 rounded bg-white border border-gray-300 text-xs font-bold"
                />
                <input
                  type="text"
                  value={item[2] || ""}
                  onChange={(e) => {
                    const nextItems = JSON.parse(JSON.stringify(block.items || []))
                    nextItems[iIdx][2] = e.target.value
                    onChange({ items: nextItems })
                  }}
                  placeholder="Description detail..."
                  className="flex-1 px-2 py-1 rounded bg-white border border-gray-300 text-xs"
                />
                <button
                  onClick={() => {
                    const nextItems = (block.items || []).filter((_: any, idx: number) => idx !== iIdx)
                    onChange({ items: nextItems })
                  }}
                  className="p-1 text-gray-400 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onChange({ items: [...(block.items || []), ["💡", "New Card", "Card details..."]] })}
              className="text-[11px] font-bold text-[#3A10E5] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Infographic Card
            </button>
          </div>
        )}

        {/* Flow Architecture Steps */}
        {block.t === "flow" && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-500">Pipeline Steps [Title, Description]</label>
            {(block.steps || []).map((step: [string, string], sIdx: number) => (
              <div key={sIdx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">{sIdx + 1}.</span>
                <input
                  type="text"
                  value={step[0] || ""}
                  onChange={(e) => {
                    const nextSteps = JSON.parse(JSON.stringify(block.steps || []))
                    nextSteps[sIdx][0] = e.target.value
                    onChange({ steps: nextSteps })
                  }}
                  placeholder="Step Title"
                  className="w-36 px-2.5 py-1 rounded-lg border border-gray-300 text-xs font-bold"
                />
                <input
                  type="text"
                  value={step[1] || ""}
                  onChange={(e) => {
                    const nextSteps = JSON.parse(JSON.stringify(block.steps || []))
                    nextSteps[sIdx][1] = e.target.value
                    onChange({ steps: nextSteps })
                  }}
                  placeholder="Step description..."
                  className="flex-1 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                />
                <button
                  onClick={() => {
                    const nextSteps = (block.steps || []).filter((_: any, idx: number) => idx !== sIdx)
                    onChange({ steps: nextSteps })
                  }}
                  className="p-1 text-gray-400 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onChange({ steps: [...(block.steps || []), [`Step ${(block.steps?.length || 0) + 1}`, "Process description"]] })}
              className="text-[11px] font-bold text-[#3A10E5] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Flow Step
            </button>
          </div>
        )}

        {/* Image Block */}
        {block.t === "image" && (
          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Image Source (URL)</label>
              <input
                type="url"
                value={block.src || ""}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder="https://... or /image.png"
                className="w-full mt-0.5 px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Alt Text</label>
                <input
                  type="text"
                  value={block.alt || ""}
                  onChange={(e) => onChange({ alt: e.target.value })}
                  placeholder="Accessible description..."
                  className="w-full mt-0.5 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Caption</label>
                <input
                  type="text"
                  value={block.caption || ""}
                  onChange={(e) => onChange({ caption: e.target.value })}
                  placeholder="Figure caption..."
                  className="w-full mt-0.5 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* List Block */}
        {block.t === "list" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-gray-500">List Items</label>
            {(block.items || []).map((item: string, lIdx: number) => (
              <div key={lIdx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">&bull;</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const nextItems = [...(block.items || [])]
                    nextItems[lIdx] = e.target.value
                    onChange({ items: nextItems })
                  }}
                  placeholder="List item..."
                  className="flex-1 px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
                />
                <button
                  onClick={() => {
                    const nextItems = (block.items || []).filter((_: any, idx: number) => idx !== lIdx)
                    onChange({ items: nextItems })
                  }}
                  className="p-1 text-gray-400 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onChange({ items: [...(block.items || []), "New list item"] })}
              className="text-[11px] font-bold text-[#3A10E5] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add List Item
            </button>
          </div>
        )}

        {/* HTML / Custom Embed Block */}
        {block.t === "html" && (
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Custom HTML / SVG Body</label>
            <textarea
              rows={4}
              value={block.x || ""}
              onChange={(e) => onChange({ x: e.target.value })}
              placeholder="<div>Custom HTML or SVG code...</div>"
              className="w-full mt-1 p-2.5 rounded-xl border border-gray-300 font-mono text-xs focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// BLOCK TYPE PICKER DROPDOWN
// -------------------------------------------------------------
function BlockTypePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-40 bg-white border-2 border-[#10162F] rounded-2xl shadow-[4px_4px_0px_#10162F] p-3 w-80 sm:w-96 text-left animate-in fade-in-50 zoom-in-95">
      <div className="flex items-center justify-between border-b pb-2 mb-2">
        <span className="text-xs font-black uppercase text-[#10162F]">Choose Block Type</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-black">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
        {BLOCK_TYPES.map((bt) => {
          const Icon = bt.icon
          return (
            <button
              key={bt.type}
              onClick={() => onSelect(bt.type)}
              className="p-2 rounded-xl border border-gray-200 hover:border-[#3A10E5] hover:bg-[#F5F9FF] transition-all flex items-start gap-2 text-left group"
            >
              <div className="h-6 w-6 rounded-lg bg-gray-100 group-hover:bg-[#3A10E5] group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#10162F] group-hover:text-[#3A10E5]">{bt.label}</div>
                <div className="text-[10px] text-gray-500 truncate">{bt.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
